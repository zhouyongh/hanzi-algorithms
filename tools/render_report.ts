/**
 * 用库里的算法渲染一张实测对照图（部首定位）。
 *
 * 这是「算法真的работает」的可视证据：黄色 = 判定为部首的笔画路径，
 * 红色框 = 匹配到的部首区域。跑的是 src/ 里的实现，不是原型脚本。
 *
 * 用法：
 *   node tools/render_report.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import { readFileSync } from "node:fs";
import { REPO_ROOT } from "./lib/store.ts";

const ASSETS = join(REPO_ROOT, "assets");
const OUT = join(REPO_ROOT, "assets", "report");

const CASES = ["投", "指", "持", "控", "想", "好", "如", "河", "眼", "語", "明", "本"];

function loadIndex(layer: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"));
}
function loadRadicals(): Record<string, [number, string, string]> {
  return JSON.parse(readFileSync(join(ASSETS, "index", "seal-radicals.json"), "utf8"));
}
function loadGlyph(file: string) {
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", "seal", file), "utf8"));
}

/** 极简 PNG 编码（无依赖）：只画实心矩形。 */
function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 3;
      const d = y * (width * 3 + 1) + 1 + x * 3;
      raw[d] = rgb[s];
      raw[d + 1] = rgb[s + 1];
      raw[d + 2] = rgb[s + 2];
    }
  }
  const chunks: Buffer[] = [];
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  chunks.push(chunk("IHDR", ihdr));
  chunks.push(chunk("IDAT", deflateSync(raw)));
  chunks.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

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

/** 把字形按 viewBox 缩放到画布，返回每条路径的像素多边形。 */
function toCanvas(glyph: ReturnType<typeof parseGlyphSvg>, size: number) {
  const vb = glyph.viewBox;
  const sx = size / (vb.width || 1);
  const sy = size / (vb.height || 1);
  return glyph.paths.map((p) =>
    p.subpaths.map((sp) => sp.map((pt) => ({
      x: (pt.x - vb.x) * sx,
      y: (pt.y - vb.y) * sy,
    }))),
  );
}

/** 扫描线填充（even-odd），返回覆盖到的像素。 */
function fillPolys(polys: Array<Array<{ x: number; y: number }>>, size: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  const edges: Array<[number, number, number, number]> = [];
  for (const poly of polys) {
    if (poly.length < 3) continue;
    for (let i = 1; i < poly.length; i += 1) {
      const a = poly[i - 1];
      const b = poly[i];
      if (a.y === b.y) continue;
      edges.push([a.x, a.y, b.x, b.y]);
    }
    const first = poly[poly.length - 1];
    const last = poly[0];
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

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const index = loadIndex("seal");
  const radicals = loadRadicals();

  const CELL = 150;
  const COLS = 6;
  const rows = Math.ceil(CASES.length / COLS);
  const W = COLS * CELL;
  const H = rows * CELL;
  const img = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i += 1) {
    img[i * 3] = 252; img[i * 3 + 1] = 252; img[i * 3 + 2] = 253;
  }

  const lines: string[] = [];
  for (const ch of CASES) {
    const file = index[ch];
    if (!file) continue;
    const cp = file.replace(/\.svg$/, "");
    const reg = radicals[cp];
    if (!reg) continue;
    const glyph = loadGlyph(file);
    const radicalGlyph = loadGlyph(`${reg[1]}.svg`);
    const m = locateRadical(glyph, radicalGlyph);
    if (!m) {
      lines.push(`${ch}\t${reg[0]}\t—\t置信度不足`);
      continue;
    }
    const dec = decompose(glyph, m);

    const idx = lines.length;
    const cx = (idx % COLS) * CELL;
    const cy = Math.floor(idx / COLS) * CELL;
    const polys = toCanvas(glyph, CELL);
    const hit = new Set(m.pathIndices);

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
    // 匹配框（掩膜分辨率 = 画布分辨率 × CELL/掩膜边长）
    const maskRes = m.resolution;
    const k = CELL / maskRes;
    const bx = cx + Math.round(m.box.x * k);
    const by = cy + Math.round(m.box.y * k);
    const bw = Math.round(m.box.width * k);
    const bh = Math.round(m.box.height * k);
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
      `${ch}\t第${reg[0]}部\t${m.pathIndices.join(",")}\t` +
      `ncc=${m.score.toFixed(3)} 精确率=${m.precision.toFixed(3)} ` +
      `缩放=${m.fx.toFixed(2)}×${m.fy.toFixed(2)} ${dec ? dec.structure : "（构形算不出）"}`,
    );
  }

  const png = encodePng(W, H, img);
  const out = join(OUT, "radical-locate.png");
  writeFileSync(out, png);
  console.log(`已生成 ${out}（${W}×${H}）`);
  console.log(lines.join("\n"));
}

main();
