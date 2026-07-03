export const colors = {
  primary: "#469d98",
  primaryDark: "#3f8f8a",
  cash: "#16a34a",
  qris: "#1d4ed8",
  headerBg: "#1f5c57",
  bg: "#f1f3f4",
  card: "#ffffff",
  border: "#e5e5e5",
  text: "#171717",
  textMuted: "#737373",
  danger: "#b91c1c",
  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  white: "#ffffff"
};

const avatarPalette = [
  { bg: "#dbeafe", fg: "#1e40af" },
  { bg: "#dcfce7", fg: "#166534" },
  { bg: "#fef9c3", fg: "#854d0e" },
  { bg: "#fce7f3", fg: "#9d174d" },
  { bg: "#ffedd5", fg: "#9a3412" },
  { bg: "#e0e7ff", fg: "#3730a3" },
  { bg: "#ccfbf1", fg: "#115e59" },
  { bg: "#f3e8ff", fg: "#6b21a8" }
];

/** Deterministic pastel avatar color for a product, based on its name. */
export function avatarFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return avatarPalette[hash % avatarPalette.length];
}
