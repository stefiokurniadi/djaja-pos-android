const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encode a byte array to a base64 string (no Buffer dependency). */
export function bytesToBase64(bytes: number[]): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] & 0xff;
    const b1 = i + 1 < bytes.length ? bytes[i + 1] & 0xff : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] & 0xff : 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;

    output += CHARS[(triplet >> 18) & 0x3f];
    output += CHARS[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? CHARS[(triplet >> 6) & 0x3f] : "=";
    output += i + 2 < bytes.length ? CHARS[triplet & 0x3f] : "=";
  }
  return output;
}
