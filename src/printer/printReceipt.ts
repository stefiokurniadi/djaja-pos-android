import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildEscPosReceipt } from "@/printer/escpos";
import { bytesToBase64 } from "@/printer/base64";
import { buildReceiptText, type ReceiptData } from "@/printer/receipt";
import { listPairedPrinters, writeBase64ToPrinter } from "@/printer/bluetooth";
import { PrintError } from "@/printer/errors";

const PRINTER_KEY = "djajapos.printer.address";

export async function getSavedPrinterAddress(): Promise<string | null> {
  return AsyncStorage.getItem(PRINTER_KEY);
}

export async function savePrinterAddress(address: string): Promise<void> {
  await AsyncStorage.setItem(PRINTER_KEY, address);
}

export async function clearSavedPrinter(): Promise<void> {
  await AsyncStorage.removeItem(PRINTER_KEY);
}

/**
 * Resolve which printer to use: the saved one if still paired, otherwise the
 * only paired device, otherwise null (caller should show a picker).
 */
export async function resolvePrinterAddress(): Promise<string | null> {
  const paired = await listPairedPrinters();
  if (paired.length === 0) throw new PrintError("NO_PAIRED_PRINTER");

  const saved = await getSavedPrinterAddress();
  if (saved && paired.some((p) => p.address === saved)) return saved;

  if (paired.length === 1) {
    await savePrinterAddress(paired[0].address);
    return paired[0].address;
  }

  return null;
}

export async function printReceiptData(
  data: ReceiptData,
  address: string
): Promise<void> {
  const bytes = buildEscPosReceipt(buildReceiptText(data));
  const base64 = bytesToBase64(bytes);
  await writeBase64ToPrinter(address, base64);
}
