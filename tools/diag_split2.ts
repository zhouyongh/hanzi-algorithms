/** 渲染一个字逐路径/逐子路径的拆分图（看清每个部件）。 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import { rasterizeGlyph, type Mask } from "../src/raster/mask.ts";
import { inkViewBox } from "../src/glyph.ts";
import type { SubPath } from "../src/geometry/path.ts";

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
const seal = store.index("seal");
const char = process.argv[2] ?? "河";
const row = seal.byChar(char);
if (!row) throw new Error(`仓内没有 ${char}`);
const g = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${row.file}`, "utf8"));

const SIZE = 160;
const cells: Array<{ label: string; subpaths: SubPath[] }> = [
  { label: `${char} 整字`, subpaths: g.paths.flatMap((p) => p.subpaths) },
  ...g.paths.map((p, i) => ({ label: `${char} 路径${i}`, subpaths: p.subpaths })),
];
const W = cells.length * SIZE;
const H = SIZE;
const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i += 1) { img[i * 3] = 252; img[i * 3 + 1] = 252; img[i * 3 + 2] = 253; }

const vb = inkViewBox(g);
cells.forEach((cell, ci) => {
  const mask: Mask = rasterizeGlyph(cell.subpaths, {
    width: SIZE, height: SIZE, viewBox: vb,
  });
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!mask.data[y * SIZE + x]) continue;
      const p = (y * W + ci * SIZE + x) * 3;
      img[p] = 43; img[p + 1] = 43; img[p + 2] = 47;
    }
  }
  console.log(`第${ci}格 ${cell.label}（${cell.subpaths.length} 个子路径）`);
});

mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });
const out = join(REPO_ROOT, "assets", "report", `split-${char}.png`);
writeFileSync(out, encodePng(W, H, img));
console.log(`已生成 ${out}`);
