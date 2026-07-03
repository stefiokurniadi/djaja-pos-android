import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/lib/colors";
import { money } from "@/lib/money";
import { Button } from "@/components/Button";
import { useAuth } from "@/auth/AuthContext";
import { fetchTransactions } from "@/api/transactions";
import { formatReceiptDate, receiptDataFromTransaction } from "@/printer/receipt";
import { usePrinter } from "@/printer/PrinterContext";
import type { Transaction } from "@/api/types";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionDetail">;

export function TransactionDetailScreen({ route }: Props) {
  const { id } = route.params;
  const { user, activeBranch } = useAuth();
  const branchId = activeBranch?.id;
  const printer = usePrinter();

  // Reuse the cached list; the branch-scoped list already contains full items.
  const txQ = useQuery<Transaction[]>({
    queryKey: ["transactions", branchId],
    queryFn: () => fetchTransactions(branchId),
    enabled: !!branchId
  });
  const tx = useMemo(() => txQ.data?.find((t) => t.id === id), [txQ.data, id]);

  if (!tx) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Transaksi tidak ditemukan.</Text>
      </View>
    );
  }

  const onPrint = () => {
    const receipt = receiptDataFromTransaction(tx, {
      storeName: user?.companyName ?? "DjajaPOS",
      branchName: tx.branch?.name ?? activeBranch?.name ?? "—",
      locale: user?.locale
    });
    printer.print(receipt);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Row label="Tanggal" value={formatReceiptDate(tx.createdAt)} />
        <Row label="Lokasi" value={tx.branch?.name ?? "—"} />
        <Row label="Pembayaran" value={tx.paymentMethod === "CASH" ? "Tunai" : "QRIS"} />
      </View>

      <View style={styles.card}>
        {tx.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.flex1}>
              <Text style={styles.itemName}>{it.productName}</Text>
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
        <View style={styles.totalRow}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>{money(Number(tx.total))}</Text>
        </View>
        {tx.paymentMethod === "CASH" ? (
          <>
            <Row label="Dibayar" value={money(Number(tx.receivedAmount ?? 0))} />
            <Row label="Kembalian" value={money(Number(tx.changeAmount ?? 0))} />
          </>
        ) : null}
      </View>

      <Button
        label="Cetak Struk"
        onPress={onPrint}
        loading={printer.printing}
        style={styles.printBtn}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: 13 },
  bold: { fontWeight: "700", color: colors.text, fontSize: 15 },
  flex1: { flex: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  value: { fontWeight: "600", color: colors.text },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemVariants: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 },
  itemQty: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6
  },
  printBtn: { marginTop: 4 }
});
