import { apiClient } from "@/api/client";
import type {
  Category,
  CreatedTransaction,
  PaymentMethod,
  Product
} from "@/api/types";

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiClient.get<{ categories: Category[] }>("/api/categories");
  return res.data.categories;
}

export async function fetchProducts(branchId?: string): Promise<Product[]> {
  const res = await apiClient.get<{ products: Product[] }>("/api/products", {
    params: branchId ? { branchId } : undefined
  });
  return res.data.products;
}

export type CheckoutInput = {
  paymentMethod: PaymentMethod;
  items: { productId: string; quantity: number; variantIds?: string[] }[];
  receivedAmount?: number;
  taxRate?: number;
  branchId?: string;
};

export async function checkout(input: CheckoutInput): Promise<CreatedTransaction> {
  const res = await apiClient.post<{ transaction: CreatedTransaction }>(
    "/api/transactions",
    input
  );
  return res.data.transaction;
}
