export type PrintErrorCode =
  | "BLUETOOTH_UNAVAILABLE"
  | "BLUETOOTH_DISABLED"
  | "PERMISSION_DENIED"
  | "NO_PAIRED_PRINTER"
  | "PRINTER_NOT_SELECTED"
  | "CONNECT_FAILED"
  | "WRITE_FAILED";

export class PrintError extends Error {
  code: PrintErrorCode;
  detail?: string;

  constructor(code: PrintErrorCode, detail?: string) {
    super(code);
    this.name = "PrintError";
    this.code = code;
    this.detail = detail;
  }
}

const MESSAGES: Record<PrintErrorCode, string> = {
  BLUETOOTH_UNAVAILABLE: "Bluetooth tidak tersedia di perangkat ini.",
  BLUETOOTH_DISABLED: "Bluetooth mati. Aktifkan Bluetooth lalu coba lagi.",
  PERMISSION_DENIED: "Izin Bluetooth ditolak. Berikan izin di pengaturan.",
  NO_PAIRED_PRINTER:
    "Tidak ada printer terpasang. Pasangkan EP58M di Pengaturan Bluetooth dulu.",
  PRINTER_NOT_SELECTED: "Printer belum dipilih.",
  CONNECT_FAILED: "Gagal terhubung ke printer.",
  WRITE_FAILED: "Gagal mengirim data ke printer."
};

export function isPrintError(error: unknown): error is PrintError {
  return error instanceof PrintError;
}

export function getPrintErrorMessage(error: unknown): string {
  if (isPrintError(error)) {
    const base = MESSAGES[error.code];
    return error.detail ? `${base} (${error.detail})` : base;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Gagal mencetak struk.";
}
