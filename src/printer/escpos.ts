const ESC = 0x1b;
const GS = 0x1d;

/** Encode a string to a byte array (single-byte / latin1) for ESC/POS. */
function encodeText(value: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    bytes.push(value.charCodeAt(i) & 0xff);
  }
  return bytes;
}

export class EscPosBuilder {
  private bytes: number[] = [];

  initialize() {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  align(mode: 0 | 1 | 2) {
    this.bytes.push(ESC, 0x61, mode);
    return this;
  }

  bold(on: boolean) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  text(value: string) {
    this.bytes.push(...encodeText(value));
    return this;
  }

  line(value: string) {
    return this.text(`${value}\n`);
  }

  feed(count = 1) {
    this.bytes.push(ESC, 0x64, count);
    return this;
  }

  cut() {
    this.bytes.push(GS, 0x56, 0x00);
    return this;
  }

  build(): number[] {
    return this.bytes;
  }
}

/** Build ESC/POS bytes from a plain-text receipt; first line is centered/bold. */
export function buildEscPosReceipt(text: string): number[] {
  const lines = text.split("\n");
  const builder = new EscPosBuilder().initialize().align(0);

  lines.forEach((line, index) => {
    if (index === 0) {
      builder.align(1).bold(true).line(line).bold(false).align(0);
    } else {
      builder.line(line);
    }
  });

  return builder.feed(3).cut().build();
}
