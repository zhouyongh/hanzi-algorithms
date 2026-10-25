/**
 * 取景对比诊断：同一个字分别用 `ink` 与 `viewBox` 两种取景做部首定位，
 * 画出两幅图供人眼核验。
 *
 * 两幅图用**同一个画布映射**（都用墨迹范围），这样看到的字形完全一样，
 * 差别只在「算法拿哪块框去匹配」。
 *
 * 用法：node tools/diag_frame.ts 眼 明 河
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { inkViewBox } from "../src/glyph.ts";
import type { Glyph } from "../src/glyph.ts";

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

const CHARS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TARGETS = CHARS.length > 0 ? CHARS : ["眼", "明", "河", "投", "想"];

// ── PNG 编码 ────────────────────────────────────────────────
let crcTable: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 3;
      const d = y * (width * 3 + 1) + 1 + x * 3;
      raw[d] = rgb[s]; raw[d + 1] = rgb[s + 1]; raw[d + 2] = rgb[s + 2];
    }
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ];
  return Buffer.concat(chunks);
}

// ── 扫描线填充（even-odd）──────────────────────────────────
function fillPolys(polys: Array<Array<{ x: number; y: number }>>, size: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  const edges: Array<[number, number, number, number]> = [];
  for (const poly of polys) {
    if (poly.length < 3) continue;
    for (let i = 1; i < poly.length; i += 1) {
      const a = poly[i - 1]; const b = poly[i];
      if (a.y === b.y) continue;
      edges.push([a.x, a.y, b.x, b.y]);
    }
    const first = poly[poly.length - 1]; const last = poly[0];
    if (first.y !== last.y) edges.push([first.x, first.y, last.x, last.y]);
  }
  for (let y = 0; y < size; y += 1) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((yc >= y0 && yc < y1) || (yc >= y1 && yc < y0)) {
        xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5));
      const xb = Math.min(size - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x += 1) mask[y * size + x] = 1;
    }
  }
  return mask;
}

const CELL = 180;
const COLS = 3;
const W = COLS * CELL;
const H = TARGETS.length * CELL;
const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i += 1) {
  img[i * 3] = 252; img[i * 3 + 1] = 252; img[i * 3 + 2] = 253;
}

const FRAMES = ["ink", "viewBox"] as const;
const lines: string[] = [];

/** 把一个字形画到画布上（保持长宽比，居中）；hit 里的路径染成橙色。 */
function painter(glyph: Glyph, cx: number, cy: number, hit: Set<number>): void {
  const canvas = inkViewBox(glyph);
  const scale = Math.min(CELL / (canvas.width || 1), CELL / (canvas.height || 1));
  const offX = (CELL - canvas.width * scale) / 2;
  const offY = (CELL - canvas.height * scale) / 2;
  const polys = glyph.paths.map((p) =>
    p.subpaths.map((sp) => sp.map((pt) => ({
      x: offX + (pt.x - canvas.x) * scale,
      y: offY + (pt.y - canvas.y) * scale,
    }))),
  );
  for (let pi = 0; pi < polys.length; pi += 1) {
    const mask = fillPolys(polys[pi], CELL);
    const on = hit.has(pi);
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        if (!mask[y * CELL + x]) continue;
        const p = ((cy + y) * W + (cx + x)) * 3;
        if (on) { img[p] = 232; img[p + 1] = 150; img[p + 2] = 30; }
        else { img[p] = 43; img[p + 1] = 43; img[p + 2] = 47; }
      }
    }
  }
}

TARGETS.forEach((char, row) => {
  const srow = seal.byChar(char);
  if (!srow) { lines.push(`${char}: 仓内无`); return; }
  const cp = srow.codepoint || srow.glyphId;
  const reg = regByCp.get(cp);
  const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
  const glyph = store.glyph("seal", srow.file);
  const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
  if (!glyph || !radicalGlyph) { lines.push(`${char}: 字形缺`); return; }

  const cy = row * CELL;
  const canvas = inkViewBox(glyph);
  const scale = Math.min(CELL / (canvas.width || 1), CELL / (canvas.height || 1));
  const offX = (CELL - canvas.width * scale) / 2;
  const offY = (CELL - canvas.height * scale) / 2;

  FRAMES.forEach((frame, col) => {
    const m = locateRadical(glyph, radicalGlyph, { frame });
    const cx = col * CELL;
    if (!m) { lines.push(`${char} [${frame}]: 无结果`); return; }
    painter(glyph, cx, cy, new Set(m.pathIndices));

    // 匹配框：掩膜像素 → 字形坐标 → 画布像素
    const frame0 = frame === "ink" ? inkViewBox(glyph) : glyph.viewBox;
    const ux = frame0.width / m.resolution;
    const uy = frame0.height / m.resolution;
    const bx = cx + Math.round(offX + (frame0.x + m.box.x * ux - canvas.x) * scale);
    const by = cy + Math.round(offY + (frame0.y + m.box.y * uy - canvas.y) * scale);
    const bw = Math.round(m.box.width * ux * scale);
    const bh = Math.round(m.box.height * uy * scale);
    for (let x = bx; x <= bx + bw && x < cx + CELL; x += 1) {
      for (const y of [by, by + bh]) {
        if (y < 0 || y >= H) continue;
        const p = (y * W + x) * 3;
        img[p] = 206; img[p + 1] = 62; img[p + 2] = 62;
      }
    }
    for (let y = by; y <= by + bh && y < H; y += 1) {
      for (const x of [bx, bx + bw]) {
        if (x < 0 || x >= W) continue;
        const p = (y * W + x) * 3;
        img[p] = 206; img[p + 1] = 62; img[p + 2] = 62;
      }
    }
    lines.push(
      `${char} [${frame}]: 命中[${m.pathIndices.join(",")}] ncc=${m.score.toFixed(3)} ` +
      `缩放=${m.fx.toFixed(2)}×${m.fy.toFixed(2)} 覆盖率=${m.coverage.toFixed(3)} ` +
      `框(字形坐标)x[${(frame0.x + m.box.x * ux).toFixed(0)},${(frame0.x + (m.box.x + m.box.width) * ux).toFixed(0)}] ` +
      `y[${(frame0.y + m.box.y * uy).toFixed(0)},${(frame0.y + (m.box.y + m.box.height) * uy).toFixed(0)}]`,
    );
  });

  // 第三列：部首独立形态
  painter(radicalGlyph, 2 * CELL, cy, new Set(radicalGlyph.paths.map((_, i) => i)));
  lines.push(`${char} 部首独立形态：第${reg?.radicalNo}部 ${reg?.radicalCp}`);
});

mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });
const out = join(REPO_ROOT, "assets", "report", "frame-compare.png");
writeFileSync(out, encodePng(W, H, img));
console.log(`已生成 ${out}（${W}×${H}，左列 ink、中列 viewBox、右列部首独立形态）`);
console.log(lines.join("\n"));
