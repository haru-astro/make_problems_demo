import { deflateSync } from "node:zlib";

/**
 * デモデータ用に、外部ライブラリなしで PNG を組み立てるための最小実装。
 * 実際のアプリではブラウザ側で縮小した画像が保存される。
 */
const WIDTH = 520;
const HEIGHT = 380;

type RGB = [number, number, number];

class Canvas {
  private pixels: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    background: RGB = [255, 255, 255],
  ) {
    this.pixels = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      this.pixels[i * 3] = background[0];
      this.pixels[i * 3 + 1] = background[1];
      this.pixels[i * 3 + 2] = background[2];
    }
  }

  set(x: number, y: number, color: RGB) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const offset = (py * this.width + px) * 3;
    this.pixels[offset] = color[0];
    this.pixels[offset + 1] = color[1];
    this.pixels[offset + 2] = color[2];
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      this.set(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, color);
    }
  }

  dot(cx: number, cy: number, radius: number, color: RGB) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) this.set(cx + dx, cy + dy, color);
      }
    }
  }

  toPng() {
    const raw = Buffer.alloc((this.width * 3 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const rowStart = y * (this.width * 3 + 1);
      raw[rowStart] = 0; // フィルタなし
      Buffer.from(
        this.pixels.subarray(y * this.width * 3, (y + 1) * this.width * 3),
      ).copy(raw, rowStart + 1);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // ビット深度
    ihdr[9] = 2; // カラータイプ: トゥルーカラー

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** HR図（主系列・巨星・白色矮星）の模式図を作る */
export function hrDiagramPng() {
  const canvas = new Canvas(WIDTH, HEIGHT);
  const axis: RGB = [80, 80, 90];
  const grid: RGB = [222, 222, 230];
  const main: RGB = [40, 90, 180];
  const giant: RGB = [200, 90, 40];
  const dwarf: RGB = [90, 90, 110];

  const left = 60;
  const right = WIDTH - 30;
  const top = 30;
  const bottom = HEIGHT - 50;

  for (let i = 1; i < 5; i++) {
    const x = left + ((right - left) * i) / 5;
    canvas.line(x, top, x, bottom, grid);
    const y = top + ((bottom - top) * i) / 5;
    canvas.line(left, y, right, y, grid);
  }

  for (let w = 0; w < 2; w++) {
    canvas.line(left + w, top, left + w, bottom, axis);
    canvas.line(left, bottom - w, right, bottom - w, axis);
  }

  // 主系列（左上から右下へ）
  for (let i = 0; i < 90; i++) {
    const t = i / 89;
    const x = left + 30 + (right - left - 70) * t;
    const y = top + 25 + (bottom - top - 60) * t;
    const jitter = ((i * 37) % 11) - 5;
    canvas.dot(x + jitter, y + jitter * 0.7, 2, main);
  }

  // 巨星・超巨星（右上）
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const x = left + 170 + 230 * t;
    const y = top + 40 + ((i * 53) % 40);
    canvas.dot(x, y, 3, giant);
  }

  // 白色矮星（左下）
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = left + 40 + 130 * t;
    const y = bottom - 45 + ((i * 29) % 25);
    canvas.dot(x, y, 2, dwarf);
  }

  return canvas.toPng();
}
