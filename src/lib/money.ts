/**
 * Format a number as Indonesian Rupiah. Implemented manually to avoid relying on
 * Intl currency data, which is not always bundled in the Hermes engine.
 */
export function money(n: number): string {
  const rounded = Math.round(Number.isFinite(n) ? n : 0);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp${withSeparators}`;
}

export function decimalToNumber(v: string | number): number {
  if (typeof v === "number") return v;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}
