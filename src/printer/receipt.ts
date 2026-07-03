import { money } from "@/lib/money";
import type { Locale, PaymentMethod } from "@/api/types";

export type ReceiptItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variants?: string[];
};

export type ReceiptData = {
  transactionDate: string;
  storeName: string;
  branchName: string;
  paymentMethod: PaymentMethod;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  locale?: Locale;
};

/** 58mm thermal paper fits ~32 monospace characters per line. */
export const RECEIPT_LINE_WIDTH = 32;

export function formatReceiptDate(iso: string, locale?: Locale): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function receiptLabels(locale?: Locale) {
  const en = locale === "en";
  return {
    title: en ? "RECEIPT" : "STRUK",
    date: en ? "Date" : "Tanggal",
    store: en ? "Store" : "Toko",
    branch: en ? "Location" : "Lokasi",
    payment: en ? "Payment" : "Pembayaran",
    cash: en ? "Cash" : "Tunai",
    qris: "QRIS",
    item: en ? "Item" : "Item",
    subtotal: en ? "Subtotal" : "Subtotal",
    tax: en ? "Tax" : "Pajak",
    total: en ? "Total" : "Total",
    paid: en ? "Paid" : "Dibayar",
    change: en ? "Change" : "Kembalian",
    thanks: en ? "Thank you!" : "Terima kasih!"
  };
}

export function padReceiptLine(left: string, right: string, width = RECEIPT_LINE_WIDTH): string {
  const gap = width - left.length - right.length;
  if (gap >= 1) return left + " ".repeat(gap) + right;
  return `${left}\n${right.padStart(width)}`;
}

export function wrapReceiptText(text: string, width = RECEIPT_LINE_WIDTH): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (word.length > width) {
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      current = "";
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildReceiptText(data: ReceiptData): string {
  const labels = receiptLabels(data.locale);
  const lines: string[] = [
    data.storeName.toUpperCase(),
    labels.title,
    "=".repeat(RECEIPT_LINE_WIDTH),
    `${labels.date}: ${formatReceiptDate(data.transactionDate, data.locale)}`,
    `${labels.branch}: ${data.branchName}`,
    "-".repeat(RECEIPT_LINE_WIDTH),
    labels.item
  ];

  for (const item of data.items) {
    for (const line of wrapReceiptText(item.productName)) {
      lines.push(line);
    }
    if (item.variants && item.variants.length > 0) {
      for (const line of wrapReceiptText(`  + ${item.variants.join(", ")}`)) {
        lines.push(line);
      }
    }
    lines.push(
      padReceiptLine(`  ${item.quantity} x ${money(item.unitPrice)}`, money(item.lineTotal))
    );
  }

  lines.push("-".repeat(RECEIPT_LINE_WIDTH));
  lines.push(padReceiptLine(labels.subtotal, money(data.subtotal)));
  if (data.taxAmount > 0) {
    lines.push(padReceiptLine(labels.tax, money(data.taxAmount)));
  }
  lines.push(padReceiptLine(labels.total, money(data.total)));
  lines.push(
    padReceiptLine(labels.payment, data.paymentMethod === "CASH" ? labels.cash : labels.qris)
  );
  lines.push(padReceiptLine(labels.paid, money(data.paidAmount)));
  if (data.paymentMethod === "CASH") {
    lines.push(padReceiptLine(labels.change, money(data.changeAmount)));
  }
  lines.push("=".repeat(RECEIPT_LINE_WIDTH));
  lines.push(labels.thanks);

  return lines.join("\n");
}

export function receiptDataFromTransaction(
  tx: {
    paymentMethod: PaymentMethod;
    subtotal: string;
    taxAmount: string;
    total: string;
    receivedAmount: string | null;
    changeAmount: string | null;
    createdAt: string;
    items: {
      productName: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
      variants?: { variantId: string | null; name: string; priceDelta: string }[] | null;
    }[];
  },
  meta: { storeName: string; branchName: string; locale?: Locale }
): ReceiptData {
  const total = Number(tx.total);
  const paidAmount =
    tx.paymentMethod === "CASH" ? Number(tx.receivedAmount ?? total) : total;
  const changeAmount =
    tx.paymentMethod === "CASH" ? Number(tx.changeAmount ?? 0) : 0;

  return {
    transactionDate: tx.createdAt,
    storeName: meta.storeName,
    branchName: meta.branchName,
    paymentMethod: tx.paymentMethod,
    subtotal: Number(tx.subtotal),
    taxAmount: Number(tx.taxAmount ?? 0),
    total,
    paidAmount,
    changeAmount,
    locale: meta.locale,
    items: tx.items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      lineTotal: Number(it.lineTotal),
      variants: it.variants?.map((v) => v.name)
    }))
  };
}
