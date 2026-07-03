import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@/lib/colors";
import { useAuth } from "@/auth/AuthContext";
import { fetchBranches } from "@/api/branches";
import type { RootStackParamList } from "@/navigation/types";

type MenuKey = "Kasir" | "TransactionList";

const ITEMS: { key: MenuKey; label: string }[] = [
  { key: "Kasir", label: "Kasir" },
  { key: "TransactionList", label: "List Transaksi" }
];

function activeMenuFromRoute(name: string): MenuKey | null {
  if (name === "Kasir") return "Kasir";
  if (name === "TransactionList" || name === "TransactionDetail") return "TransactionList";
  return null;
}

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { signOut, activeBranch, canSwitchBranch, setActiveBranch } = useAuth();
  const active = activeMenuFromRoute(route.name);

  const branchesQ = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: open && canSwitchBranch
  });

  const go = (screen: MenuKey) => {
    setOpen(false);
    navigation.navigate(screen);
  };

  const logout = () => {
    setOpen(false);
    signOut();
  };

  const selectBranch = async (id: string, name: string) => {
    if (activeBranch?.id === id) return;
    await setActiveBranch({ id, name });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.trigger}>
        <Text style={styles.bars}>☰</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            {ITEMS.map((item) => {
              const isActive = active === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => go(item.key)}
                >
                  <Text style={[styles.itemText, isActive && styles.itemTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}

            {canSwitchBranch ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Cabang</Text>
                {branchesQ.isLoading ? (
                  <View style={styles.branchLoading}>
                    <ActivityIndicator color={colors.primary} size="small" />
                  </View>
                ) : (
                  <ScrollView style={styles.branchList} nestedScrollEnabled>
                    {(branchesQ.data ?? []).map((branch) => {
                      const isSelected = activeBranch?.id === branch.id;
                      return (
                        <Pressable
                          key={branch.id}
                          style={[styles.branchItem, isSelected && styles.branchItemActive]}
                          onPress={() => selectBranch(branch.id, branch.name)}
                        >
                          <Text
                            style={[
                              styles.branchItemText,
                              isSelected && styles.branchItemTextActive
                            ]}
                            numberOfLines={1}
                          >
                            {branch.name}
                          </Text>
                          {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            ) : null}

            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={logout}>
              <Text style={[styles.itemText, styles.logoutText]}>Keluar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 12, paddingVertical: 6 },
  bars: { color: colors.white, fontSize: 22, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "flex-end"
  },
  menu: {
    marginTop: 52,
    marginRight: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 220,
    maxWidth: 280,
    maxHeight: "80%",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  item: { paddingHorizontal: 16, paddingVertical: 14 },
  itemActive: { backgroundColor: colors.primary },
  itemText: { fontSize: 15, fontWeight: "600", color: colors.text },
  itemTextActive: { color: colors.white },
  logoutText: { color: colors.danger },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  branchLoading: { paddingVertical: 16, alignItems: "center" },
  branchList: { maxHeight: 200 },
  branchItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  branchItemActive: { backgroundColor: "#e8f4f3" },
  branchItemText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  branchItemTextActive: { color: colors.primaryDark },
  checkmark: { fontSize: 14, fontWeight: "800", color: colors.primary }
});
