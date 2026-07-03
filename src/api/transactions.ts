import { apiClient } from "@/api/client";
import type { Transaction } from "@/api/types";

export async function fetchTransactions(branchId?: string): Promise<Transaction[]> {
  const res = await apiClient.get<{ transactions: Transaction[] }>("/api/transactions", {
    params: branchId ? { branchId } : undefined
  });
  return res.data.transactions;
}
