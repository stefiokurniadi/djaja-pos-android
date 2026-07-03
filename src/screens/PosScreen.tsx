import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { avatarFor, colors } from "@/lib/colors";
import { money } from "@/lib/money";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/Button";
import { fetchCategories, fetchProducts, checkout } from "@/api/pos";
import { apiErrorMessage } from "@/api/client";
import type { CartLine, Category, CreatedTransaction, Product } from "@/api/types";
import { usePrinter } from "@/printer/PrinterContext";
import { receiptDataFromTransaction } from "@/printer/receipt";

const CART_WIDTH = 320;
const GRID_GAP = 12;
const GRID_PADDING = 14;
const TARGET_CARD_WIDTH = 165;

function subtitleOf(p: Product): string {
  return p.sku ?? p.category?.name ?? "";
}

function cartKey(productId: string, variantIds: string[]): string {
  return `${productId}|${[...variantIds].sort().join(",")}`;
}

type PayStep = "review" | "cash" | "qris";

export function PosScreen() {
  const { user, activeBranch } = useAuth();
  const queryClient = useQueryClient();
  const printer = usePrinter();
  const { width } = useWindowDimensions();

  const productAreaWidth = width - CART_WIDTH;
  const numColumns = Math.max(
    2,
    Math.floor((productAreaWidth - GRID_PADDING * 2 + GRID_GAP) / (TARGET_CARD_WIDTH + GRID_GAP))
  );
  const itemWidth =
    (productAreaWidth - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns;

  const branchId = activeBranch?.id;

  const categoriesQ = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories
  });
  const productsQ = useQuery<Product[]>({
    queryKey: ["products", branchId],
    queryFn: () => fetchProducts(branchId),
    enabled: !!branchId
  });

  const categories = categoriesQ.data ?? [];
  const products = productsQ.data ?? [];

  const variantsByCategory = useMemo(() => {
    const map = new Map<string, NonNullable<Category["variants"]>>();
    for (const c of categories) {
      if (c.variants && c.variants.length > 0) map.set(c.id, c.variants);
    }
    return map;
  }, [categories]);

  const [activeCategoryId, setActiveCategoryId] = useState<string | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("review");
  const [cashReceived, setCashReceived] = useState("");
  const [doneTx, setDoneTx] = useState<CreatedTransaction | null>(null);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerSelection, setPickerSelection] = useState<string[]>([]);

  useEffect(() => {
    setCart({});
    setPayOpen(false);
    setDoneTx(null);
  }, [branchId]);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

  const categoriesWithItems = useMemo(() => {
    const ids = new Set(activeProducts.map((p) => p.categoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [activeProducts, categories]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const inCategory = activeCategoryId === "ALL" || p.categoryId === activeCategoryId;
      const matchesSearch = q === "" || p.name.toLowerCase().includes(q);
      return inCategory && matchesSearch;
    });
  }, [activeProducts, activeCategoryId, search]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of cartItems) {
      map.set(it.productId, (map.get(it.productId) ?? 0) + it.qty);
    }
    return map;
  }, [cartItems]);
  const subtotal = useMemo(
    () => cartItems.reduce((sum, it) => sum + it.unitPrice * it.qty, 0),
    [cartItems]
  );
  const total = subtotal;
  const itemCount = cartItems.reduce((s, it) => s + it.qty, 0);

  const checkoutMutation = useMutation({
    mutationFn: checkout,
    onSuccess: (tx) => {
      setCart({});
      closePayModal();
      setDoneTx(tx);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e) => {
      Alert.alert("Gagal", apiErrorMessage(e, "Gagal menyimpan transaksi."));
    }
  });

  const closePayModal = () => {
    setPayOpen(false);
    setPayStep("review");
    setCashReceived("");
  };

  const openPayModal = () => {
    setPayStep("review");
    setCashReceived("");
    setPayOpen(true);
  };

  const addLineToCart = (p: Product, variantIds: string[]) => {
    const variantList = variantsByCategory.get(p.categoryId) ?? [];
    const variantNames = variantIds.map(
      (id) => variantList.find((v) => v.id === id)?.name ?? ""
    );
    const key = cartKey(p.id, variantIds);
    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          key,
          productId: p.id,
          name: p.name,
          image: p.image,
          unitPrice: Number(p.price),
          qty: (existing?.qty ?? 0) + 1,
          variantIds,
          variantNames
        }
      };
    });
  };

  const handleAdd = (p: Product) => {
    const variantList = variantsByCategory.get(p.categoryId) ?? [];
    if (p.maxVariants > 0 && variantList.length > 0) {
      setPickerProduct(p);
      setPickerSelection([]);
      return;
    }
    addLineToCart(p, []);
  };

  const confirmPicker = () => {
    if (!pickerProduct) return;
    addLineToCart(pickerProduct, pickerSelection);
    setPickerProduct(null);
    setPickerSelection([]);
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const nextQty = existing.qty + delta;
      const next = { ...prev };
      if (nextQty <= 0) delete next[key];
      else next[key] = { ...existing, qty: nextQty };
      return next;
    });
  };

  const removeItem = (key: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submitCheckout = (paymentMethod: "CASH" | "DIGITAL") => {
    checkoutMutation.mutate({
      paymentMethod,
      ...(branchId ? { branchId } : {}),
      items: cartItems.map((it) => ({
        productId: it.productId,
        quantity: it.qty,
        ...(it.variantIds.length > 0 ? { variantIds: it.variantIds } : {})
      })),
      ...(paymentMethod === "CASH" ? { receivedAmount: Number(cashReceived) } : {})
    });
  };

  const printDone = () => {
    if (!doneTx) return;
    const receipt = receiptDataFromTransaction(doneTx, {
      storeName: user?.companyName ?? "DjajaPOS",
      branchName: activeBranch?.name ?? "—",
      locale: user?.locale
    });
    printer.print(receipt);
  };

  const isLoading = categoriesQ.isLoading || productsQ.isLoading;
  const change = Math.max(0, Number(cashReceived || 0) - total);
  const cashValid =
    Number.isFinite(Number(cashReceived)) && Number(cashReceived) >= total;
  const cartEmpty = cartItems.length === 0;

  return (
    <View style={styles.container}>
      {/* Left: products */}
      <View style={styles.productsPanel}>
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari menu…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <CategoryChip
              label="Semua"
              active={activeCategoryId === "ALL"}
              onPress={() => setActiveCategoryId("ALL")}
            />
            {categoriesWithItems.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                active={activeCategoryId === c.id}
                onPress={() => setActiveCategoryId(c.id)}
              />
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleProducts}
            key={numColumns}
            keyExtractor={(p) => p.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={<Text style={styles.muted}>Menu tidak ditemukan.</Text>}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                width={itemWidth}
                qty={qtyByProduct.get(item.id) ?? 0}
                onAdd={() => handleAdd(item)}
              />
            )}
          />
        )}
      </View>

      {/* Right: cart */}
      <View style={styles.cartPanel}>
        <View style={styles.cartHeader}>
          <View style={styles.cartHeaderLeft}>
            <Text style={styles.cartTitle}>Keranjang</Text>
            <Text style={styles.cartCount}>{itemCount} item</Text>
          </View>
          {!cartEmpty ? (
            <Pressable onPress={() => setCart({})} hitSlop={8}>
              <Text style={styles.clearText}>Kosongkan</Text>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={cartItems}
          keyExtractor={(it) => it.key}
          style={styles.cartList}
          contentContainerStyle={cartEmpty ? styles.cartEmpty : styles.cartListContent}
          ListEmptyComponent={<Text style={styles.cartEmptyText}>Belum ada item.</Text>}
          renderItem={({ item }) => {
            const av = avatarFor(item.name);
            return (
              <View style={styles.cartRow}>
                {item.image ? (
                  <View style={styles.cartThumb}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.cartThumbImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={[styles.cartAvatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.cartAvatarText, { color: av.fg }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.cartRowMain}>
                  <View style={styles.cartRowTop}>
                    <Text style={styles.cartItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Pressable onPress={() => removeItem(item.key)} hitSlop={8}>
                      <Text style={styles.removeX}>×</Text>
                    </Pressable>
                  </View>
                  {item.variantNames.length > 0 ? (
                    <Text style={styles.cartVariants} numberOfLines={2}>
                      {item.variantNames.join(", ")}
                    </Text>
                  ) : null}
                  <Text style={styles.cartItemMeta}>{money(item.unitPrice)}</Text>
                  <View style={styles.cartRowBottom}>
                    <View style={styles.qtyControls}>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => changeQty(item.key, -1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.qty}</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => changeQty(item.key, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.lineTotal}>{money(item.unitPrice * item.qty)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.cartFooter}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{money(total)}</Text>
          </View>
          <Button
            label={`Bayar  ·  ${money(total)}`}
            disabled={cartEmpty}
            onPress={openPayModal}
            style={styles.payBtn}
          />
        </View>
      </View>

      {/* Pay modal: review → Tunai / QRIS */}
      <Modal visible={payOpen} transparent statusBarTranslucent animationType="slide">
        <StatusBar hidden />
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {payStep === "review" ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Review Pesanan</Text>
                  <Pressable onPress={closePayModal} hitSlop={10} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>×</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.reviewList}>
                  {cartItems.map((it) => (
                    <View key={it.key} style={styles.reviewRow}>
                      <View style={styles.flex1}>
                        <Text style={styles.reviewName}>{it.name}</Text>
                        {it.variantNames.length > 0 ? (
                          <Text style={styles.reviewVariants} numberOfLines={2}>
                            {it.variantNames.join(", ")}
                          </Text>
                        ) : null}
                        <Text style={styles.reviewMeta}>
                          {it.qty} × {money(it.unitPrice)}
                        </Text>
                      </View>
                      <Text style={styles.reviewTotal}>{money(it.unitPrice * it.qty)}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.reviewTotalRow}>
                  <Text style={styles.bold}>Total</Text>
                  <Text style={styles.bold}>{money(total)}</Text>
                </View>
                <Text style={styles.payPrompt}>Pilih metode pembayaran:</Text>
                <View style={styles.modalActions}>
                  <Button
                    label="Tunai"
                    variant="cash"
                    style={styles.flex1}
                    onPress={() => {
                      setCashReceived("");
                      setPayStep("cash");
                    }}
                  />
                  <Button
                    label="QRIS"
                    variant="qris"
                    style={styles.flex1}
                    onPress={() => setPayStep("qris")}
                  />
                </View>
              </>
            ) : null}

            {payStep === "cash" ? (
              <>
                <Text style={styles.modalTitle}>Bayar Tunai</Text>
                <Text style={styles.modalRow}>
                  Total: <Text style={styles.bold}>{money(total)}</Text>
                </Text>
                <Text style={styles.inputLabel}>Uang Pelanggan</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  showSoftInputOnFocus
                  value={cashReceived}
                  onChangeText={setCashReceived}
                />
                <Text style={styles.modalRow}>
                  Kembalian: <Text style={styles.bold}>{money(change)}</Text>
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    label="Kembali"
                    variant="outline"
                    style={styles.flex1}
                    disabled={checkoutMutation.isPending}
                    onPress={() => setPayStep("review")}
                  />
                  <Button
                    label="Konfirmasi"
                    style={styles.flex1}
                    loading={checkoutMutation.isPending}
                    disabled={!cashValid}
                    onPress={() => submitCheckout("CASH")}
                  />
                </View>
              </>
            ) : null}

            {payStep === "qris" ? (
              <>
                <Text style={styles.modalTitle}>Bayar QRIS</Text>
                <Text style={styles.modalRow}>
                  Total: <Text style={styles.bold}>{money(total)}</Text>
                </Text>
                <Text style={styles.mutedInline}>
                  Pastikan pelanggan sudah membayar via QRIS.
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    label="Kembali"
                    variant="outline"
                    style={styles.flex1}
                    disabled={checkoutMutation.isPending}
                    onPress={() => setPayStep("review")}
                  />
                  <Button
                    label="Sudah Bayar"
                    style={styles.flex1}
                    loading={checkoutMutation.isPending}
                    onPress={() => submitCheckout("DIGITAL")}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Variant picker modal */}
      <Modal
        visible={!!pickerProduct}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setPickerProduct(null)}
      >
        <StatusBar hidden />
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {pickerProduct
              ? (() => {
                  const variantList =
                    variantsByCategory.get(pickerProduct.categoryId) ?? [];
                  const max = pickerProduct.maxVariants;
                  const count = pickerSelection.length;
                  const canAddMore = count < max;
                  return (
                    <>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{pickerProduct.name}</Text>
                        <Pressable
                          onPress={() => setPickerProduct(null)}
                          hitSlop={10}
                          style={styles.closeBtn}
                        >
                          <Text style={styles.closeBtnText}>×</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.pickerHint}>
                        Pilih varian (maks {max}) — {count}/{max}
                      </Text>
                      {count > 0 ? (
                        <View style={styles.selectedRow}>
                          {pickerSelection.map((id, idx) => {
                            const v = variantList.find((x) => x.id === id);
                            return (
                              <Pressable
                                key={`${id}:${idx}`}
                                style={styles.selectedChip}
                                onPress={() =>
                                  setPickerSelection((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                <Text style={styles.selectedChipText}>
                                  {v?.name ?? "?"} ×
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                      <ScrollView style={styles.pickerList}>
                        <View style={styles.pickerGrid}>
                          {variantList.map((v) => (
                            <Pressable
                              key={v.id}
                              style={[
                                styles.variantOption,
                                !canAddMore && styles.variantOptionDisabled
                              ]}
                              disabled={!canAddMore}
                              onPress={() =>
                                setPickerSelection((prev) => [...prev, v.id])
                              }
                            >
                              <Text style={styles.variantOptionText}>{v.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </ScrollView>
                      <View style={styles.modalActions}>
                        <Button
                          label="Batal"
                          variant="outline"
                          style={styles.flex1}
                          onPress={() => setPickerProduct(null)}
                        />
                        <Button
                          label={`Tambah (${count}/${max})`}
                          style={styles.flex1}
                          disabled={count === 0}
                          onPress={confirmPicker}
                        />
                      </View>
                    </>
                  );
                })()
              : null}
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal visible={!!doneTx} transparent statusBarTranslucent animationType="fade">
        <StatusBar hidden />
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.successTitle}>Pembayaran Berhasil</Text>
            {doneTx ? (
              <>
                <View style={styles.summaryBox}>
                  <SummaryRow
                    label="Pembayaran"
                    value={doneTx.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
                  />
                  <SummaryRow label="Total" value={money(Number(doneTx.total))} />
                  {doneTx.paymentMethod === "CASH" ? (
                    <>
                      <SummaryRow
                        label="Dibayar"
                        value={money(Number(doneTx.receivedAmount ?? 0))}
                      />
                      <SummaryRow
                        label="Kembalian"
                        value={money(Number(doneTx.changeAmount ?? 0))}
                      />
                    </>
                  ) : null}
                </View>
                <View style={styles.itemsBox}>
                  {doneTx.items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <View style={styles.flex1}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.productName}
                        </Text>
                        {it.variants && it.variants.length > 0 ? (
                          <Text style={styles.itemVariants} numberOfLines={2}>
                            {it.variants.map((v) => v.name).join(", ")}
                          </Text>
                        ) : null}
                        <Text style={styles.itemQty}>
                          {it.quantity} × {money(Number(it.unitPrice))}
                        </Text>
                      </View>
                      <Text style={styles.bold}>{money(Number(it.lineTotal))}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                label="Cetak Struk"
                variant="outline"
                style={styles.flex1}
                loading={printer.printing}
                onPress={printDone}
              />
              <Button label="Selesai" style={styles.flex1} onPress={() => setDoneTx(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProductCard({
  product,
  width,
  qty,
  onAdd
}: {
  product: Product;
  width: number;
  qty: number;
  onAdd: () => void;
}) {
  const av = avatarFor(product.name);
  const avatarFontSize = Math.min(48, Math.round(width * 0.22));
  return (
    <Pressable style={[styles.productCard, { width }]} onPress={onAdd}>
      {product.image ? (
        <View style={styles.cardImageWrap}>
          <Image
            source={{ uri: product.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          {qty > 0 ? (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{qty}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.cardAvatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.cardAvatarText, { color: av.fg, fontSize: avatarFontSize }]}>
            {product.name.charAt(0).toUpperCase()}
          </Text>
          {qty > 0 ? (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{qty}</Text>
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.productName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.productSub} numberOfLines={1}>
        {subtitleOf(product)}
      </Text>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{money(Number(product.price))}</Text>
        <Pressable style={styles.addBtn} onPress={onAdd} hitSlop={6}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function CategoryChip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.mutedInline}>{label}</Text>
      <Text style={styles.bold}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: colors.bg },
  flex1: { flex: 1 },
  bold: { fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13, padding: 14 },
  mutedInline: { color: colors.textMuted, fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  productsPanel: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 12,
    backgroundColor: colors.bg
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44
  },
  searchIcon: { fontSize: 18, color: colors.textMuted },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  chipsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipIdle: { backgroundColor: colors.card, borderColor: colors.border },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: colors.white, fontWeight: "700", fontSize: 14 },

  gridContent: { padding: GRID_PADDING, paddingBottom: 24 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8
  },
  cardAvatar: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  cardAvatarText: { fontSize: 30, fontWeight: "800" },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden"
  },
  cardImage: { width: "100%", height: "100%" },
  qtyBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  qtyBadgeText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  productName: { fontSize: 15, fontWeight: "700", color: colors.text },
  productSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  productBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },
  productPrice: { fontSize: 15, fontWeight: "800", color: colors.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  addBtnText: { fontSize: 20, fontWeight: "700", color: colors.primary, marginTop: -2 },

  cartPanel: {
    width: CART_WIDTH,
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderLeftColor: colors.border
  },
  cartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  cartHeaderLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  cartTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  cartCount: { fontSize: 13, color: colors.textMuted },
  clearText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  cartList: { flex: 1 },
  cartListContent: { paddingVertical: 4 },
  cartEmpty: { flex: 1, justifyContent: "center" },
  cartEmptyText: { textAlign: "center", color: colors.textMuted, fontSize: 13 },
  cartRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  cartAvatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  cartAvatarText: { fontSize: 18, fontWeight: "800" },
  cartThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.bg
  },
  cartThumbImage: { width: "100%", height: "100%" },
  cartRowMain: { flex: 1, minWidth: 0 },
  cartRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cartItemName: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  removeX: { fontSize: 20, color: colors.textMuted, paddingLeft: 8, lineHeight: 20 },
  cartItemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  cartVariants: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 1 },
  cartRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: colors.text },
  qtyValue: { minWidth: 18, textAlign: "center", fontWeight: "700", fontSize: 14 },
  lineTotal: { fontSize: 14, fontWeight: "800", color: colors.text },
  cartFooter: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalsLabel: { fontSize: 14, color: colors.textMuted },
  totalsValue: { fontSize: 14, fontWeight: "600", color: colors.text },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  grandTotalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  grandTotalValue: { fontSize: 22, fontWeight: "900", color: colors.primary },
  payBtn: { marginTop: 8, height: 54 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    maxHeight: "85%",
    alignSelf: "center",
    width: "100%",
    maxWidth: 460
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  closeBtnText: { fontSize: 24, color: colors.textMuted, lineHeight: 26 },
  modalRow: { fontSize: 14, color: colors.textMuted },
  inputLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text
  },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  payPrompt: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 4 },
  reviewList: { maxHeight: 200 },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  reviewName: { fontSize: 14, fontWeight: "600", color: colors.text },
  reviewVariants: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  reviewMeta: { fontSize: 12, color: colors.textMuted },
  reviewTotal: { fontSize: 14, fontWeight: "700", color: colors.text },
  reviewTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center"
  },
  summaryBox: { gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  itemsBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemVariants: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  pickerHint: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  pickerList: { maxHeight: 240, marginTop: 8 },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variantOption: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: "47%"
  },
  variantOptionDisabled: { opacity: 0.4 },
  variantOptionText: { fontSize: 14, fontWeight: "600", color: colors.text },
  selectedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  selectedChip: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  selectedChipText: { color: colors.white, fontWeight: "700", fontSize: 13 }
});
