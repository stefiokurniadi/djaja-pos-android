import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { colors } from "@/lib/colors";
import { money } from "@/lib/money";
import { fetchTransactions } from "@/api/transactions";
import { formatReceiptDate, orderNoFromTransactionId } from "@/printer/receipt";
import { apiErrorMessage } from "@/api/client";
import type { Transaction } from "@/api/types";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionList">;

export function TransactionsScreen({ navigation }: Props) {
  const { user, activeBranch } = useAuth();
  const branchId = activeBranch?.id;
  const txQ = useQuery<Transaction[]>({
    queryKey: ["transactions", branchId],
    queryFn: () => fetchTransactions(branchId),
    enabled: !!branchId
  });
  const transactions = txQ.data ?? [];

  if (txQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={transactions}
      keyExtractor={(tx) => tx.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={txQ.isRefetching} onRefresh={() => txQ.refetch()} />
      }
      ListEmptyComponent={
        <Text style={styles.muted}>
          {txQ.isError
            ? apiErrorMessage(txQ.error, "Gagal memuat transaksi.")
            : "Belum ada transaksi."}
        </Text>
      }
      renderItem={({ item }) => {
        const itemCount = item.items.reduce((s, it) => s + it.quantity, 0);
        return (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("TransactionDetail", { id: item.id })}
          >
            <View style={styles.flex1}>
              <Text style={styles.orderNo}>
                No. {orderNoFromTransactionId(item.id)}
              </Text>
              <Text style={styles.date}>{formatReceiptDate(item.createdAt)}</Text>
              <Text style={styles.meta}>
                {item.paymentMethod === "CASH" ? "Tunai" : "QRIS"} · {itemCount} item
              </Text>
            </View>
            <Text style={styles.total}>{money(Number(item.total))}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: 12, gap: 10 },
  muted: { color: colors.textMuted, fontSize: 13, padding: 12, textAlign: "center" },
  flex1: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10
  },
  orderNo: { fontSize: 18, fontWeight: "800", color: colors.primary },
  date: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  total: { fontSize: 15, fontWeight: "700", color: colors.text }
});
