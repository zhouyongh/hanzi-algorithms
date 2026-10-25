/** 把字形演变渲染成一条带（t = 0 → 1），看形变是否连续可读。 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT, type Layer } from "./lib/store.ts";
import { interpolateGlyphs } from "../src/morph/interpolate.ts";
import { rasterizeGlyph } from "../src/raster/mask.ts";

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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const store = new GlyphStore();
const CHAIN: Layer[] = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];
const CELL = 170;
const STEPS = 6;
const chars = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = chars.length > 0 ? chars : ["日", "月", "山", "水"];

const W = CELL * STEPS;
const H = CELL * targets.length;
const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i += 1) { img[i * 3] = 252; img[i * 3 + 1] = 252; img[i * 3 + 2] = 253; }

targets.forEach((char, row) => {
  // 找演变链的首尾
  const first = CHAIN.map((l) => store.index(l).byChar(char)?.file).find(Boolean);
  const lastLayer = [...CHAIN].reverse().map((l) => store.index(l).byChar(char)?.file).find(Boolean);
  if (!first || !lastLayer) { console.log(`${char} 链不全`); return; }
  const gFrom = store.glyph(CHAIN.find((l) => store.index(l).byChar(char)?.file === first)!, first)!;
  const gTo = store.glyph(CHAIN.find((l) => store.index(l).byChar(char)?.file === lastLayer)!, lastLayer)!;
  for (let s = 0; s < STEPS; s += 1) {
    const t = s / (STEPS - 1);
    const g = interpolateGlyphs(gFrom, gTo, t, { samples: 96, resolution: 200 });
    const mask = rasterizeGlyph(g.paths.flatMap((p) => p.subpaths), {
      width: CELL, height: CELL, viewBox: g.viewBox,
    });
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        if (!mask.data[y * CELL + x]) continue;
        const p = ((row * CELL + y) * W + s * CELL + x) * 3;
        img[p] = 43; img[p + 1] = 43; img[p + 2] = 47;
      }
    }
  }
  console.log(`${char}：${CHAIN.filter((l) => store.index(l).byChar(char)?.file).join(" → ")}`);
});

mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });
const out = join(REPO_ROOT, "assets", "report", "evolution-strip.png");
writeFileSync(out, encodePng(W, H, img));
console.log(`已生成 ${out}（每行一个字，列 = t 0→1）`);
