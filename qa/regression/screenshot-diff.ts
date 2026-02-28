import crypto from "crypto";
import fs from "fs";
import { PNG } from "pngjs";

export type ScreenshotFingerprint = {
  sha256: string;
  dhash64: string;
  bytes: number;
};

function dhash64FromPngBytes(pngBytes: Buffer): string {
  const png = PNG.sync.read(pngBytes);
  const w = png.width;
  const h = png.height;
  const targetW = 9;
  const targetH = 8;

  const sampleGray = (sx: number, sy: number): number => {
    const x = Math.max(0, Math.min(w - 1, Math.round(sx)));
    const y = Math.max(0, Math.min(h - 1, Math.round(sy)));
    const idx = (y * w + x) * 4;
    const r = png.data[idx] ?? 0;
    const g = png.data[idx + 1] ?? 0;
    const b = png.data[idx + 2] ?? 0;
    // Luma
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  };

  // Downsample by sampling pixel centers.
  const grid: number[][] = [];
  for (let y = 0; y < targetH; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < targetW; x += 1) {
      const px = ((x + 0.5) / targetW) * w;
      const py = ((y + 0.5) / targetH) * h;
      row.push(sampleGray(px, py));
    }
    grid.push(row);
  }

  // Horizontal differences produce 8*8 = 64 bits.
  let bits = "";
  for (let y = 0; y < targetH; y += 1) {
    for (let x = 0; x < targetW - 1; x += 1) {
      bits += grid[y][x] < grid[y][x + 1] ? "1" : "0";
    }
  }

  // Convert bitstring to 16-hex chars.
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex.padStart(16, "0");
}

export function hammingHex(a: string, b: string): number {
  const aa = String(a || "").trim().toLowerCase();
  const bb = String(b || "").trim().toLowerCase();
  if (!aa || !bb || aa.length !== bb.length) return 64;
  let dist = 0;
  for (let i = 0; i < aa.length; i += 1) {
    const na = parseInt(aa[i], 16);
    const nb = parseInt(bb[i], 16);
    const x = (na ^ nb) & 0xf;
    // popcount for nibble
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][x] || 0;
  }
  return dist;
}

export function fingerprintPng(filePath: string): ScreenshotFingerprint {
  const data = fs.readFileSync(filePath);
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  const dhash64 = dhash64FromPngBytes(data);
  return { sha256, dhash64, bytes: data.length };
}
