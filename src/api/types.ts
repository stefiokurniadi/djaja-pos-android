export type Role = "OWNER" | "ADMIN" | "CASHIER" | "SUPERADMIN";
export type Locale = "id" | "en";
export type PaymentMethod = "CASH" | "DIGITAL";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  locale: Locale;
  companyId: string;
  companyName: string;
  branchId?: string;
  branchName?: string;
};

export type Variant = {
  id: string;
  categoryId: string;
  name: string;
  priceDelta: string;
  isActive: boolean;
  sortOrder: number;
};

export type Category = {
  id: string;
  name: string;
  companyId: string;
  variants?: Variant[];
};

export type Product = {
  id: string;
  name: string;
  branchId: string;
  categoryId: string;
  sku: string | null;
  price: string;
  costPrice: string;
  isActive: boolean;
  maxVariants: number;
  image?: string | null;
  category?: Category;
};

export type SelectedVariant = {
  variantId: string | null;
  name: string;
  priceDelta: string;
};

export type TransactionItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  lineTotal: string;
  variants?: SelectedVariant[] | null;
};

export type Transaction = {
  id: string;
  branchId: string;
  paymentMethod: PaymentMethod;
  subtotal: string;
  taxAmount: string;
  total: string;
  receivedAmount: string | null;
  changeAmount: string | null;
  createdAt: string;
  branch: { id: string; name: string };
  items: TransactionItem[];
};

export type CreatedTransaction = {
  id: string;
  paymentMethod: PaymentMethod;
  subtotal: string;
  taxAmount: string;
  total: string;
  receivedAmount: string | null;
  changeAmount: string | null;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    variants?: SelectedVariant[] | null;
  }[];
};

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  image?: string | null;
  unitPrice: number;
  qty: number;
  variantIds: string[];
  variantNames: string[];
};
