/**
 * 易混字叠影：把两个字形画在同一张画布上（A 红 / B 蓝 / 重合处深紫），
 * 用来判断「算法算出的形似度低」到底是算法的问题还是字形本来就不像。
 *
 * 用法：node tools/diag_overlay.ts 未 末
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT } from "./lib/store.ts";
import { boundsOf } from "../src/geometry/path.ts";
import { rasterizeGlyph, type Mask } from "../src/raster/mask.ts";
import { isStrokeGlyph, glyphStrokes } from "../src/glyph.ts";
import type { Glyph } from "../src/glyph.ts";

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

/** 把字形按自己的墨迹框等比居中到画布。 */
function draw(glyph: Glyph, size: number): Mask {
  const ink = boundsOf(glyph.paths.flatMap((p) => p.subpaths));
  const s = Math.min((size * 0.9) / (ink.width || 1), (size * 0.9) / (ink.height || 1));
  const ox = size / 2 - ((ink.x + ink.width / 2) * s);
  const oy = size / 2 - ((ink.y + ink.height / 2) * s);
  const raw = rasterizeGlyph(glyph.paths.flatMap((p) => p.subpaths), {
    width: size, height: size, viewBox: glyph.viewBox,
    strokes: isStrokeGlyph(glyph) ? glyphStrokes(glyph) : undefined,
  });
  const out = rasterizeGlyph([], { width: size, height: size, viewBox: { x: 0, y: 0, width: 1, height: 1 } });
  const vb = glyph.viewBox;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!raw.data[y * size + x]) continue;
      const ux = vb.x + ((x + 0.5) * vb.width) / size;
      const uy = vb.y + ((y + 0.5) * vb.height) / size;
      const px = Math.floor(ux * s + ox);
      const py = Math.floor(uy * s + oy);
      if (px >= 0 && py >= 0 && px < size && py < size) out.data[py * size + px] = 1;
    }
  }
  return out;
}

const store = new GlyphStore();
const seal = store.index("seal");
const pairs: Array<[string, string]> = [];
const argv = process.argv.slice(2);
for (let i = 0; i + 1 < argv.length; i += 2) pairs.push([argv[i], argv[i + 1]]);
if (pairs.length === 0) pairs.push(["未", "末"], ["日", "曰"], ["土", "士"], ["目", "且"]);

const SIZE = 200;
const W = pairs.length * 3 * SIZE;
const H = SIZE;
const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i += 1) { img[i * 3] = 252; img[i * 3 + 1] = 252; img[i * 3 + 2] = 253; }

pairs.forEach(([ca, cb], idx) => {
  const fa = seal.byChar(ca)?.file;
  const fb = seal.byChar(cb)?.file;
  if (!fa || !fb) { console.log(`${ca}/${cb} 缺`); return; }
  const ga = store.glyph("seal", fa)!;
  const gb = store.glyph("seal", fb)!;
  const ma = draw(ga, SIZE);
  const mb = draw(gb, SIZE);
  const inkA = boundsOf(ga.paths.flatMap((p) => p.subpaths));
  const inkB = boundsOf(gb.paths.flatMap((p) => p.subpaths));
  let inter = 0;
  let a = 0;
  let b = 0;
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const ina = ma.data[i] ? 1 : 0;
    const inb = mb.data[i] ? 1 : 0;
    a += ina; b += inb;
    if (ina && inb) inter += 1;
  }
  const iou = a + b - inter > 0 ? inter / (a + b - inter) : 0;
  console.log(`${ca} vs ${cb}  各自居中后 IoU=${(iou * 100).toFixed(1)}%  ` +
    `${ca}墨迹 ${inkA.width.toFixed(0)}×${inkA.height.toFixed(0)}  ` +
    `${cb}墨迹 ${inkB.width.toFixed(0)}×${inkB.height.toFixed(0)}`);
  const cell = (m: Mask, mode: "a" | "b" | "both") => {
    void m;
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const i = y * SIZE + x;
        const ina = ma.data[i];
        const inb = mb.data[i];
        let p = -1;
        if (mode === "a" && ina) p = 0;
        else if (mode === "b" && inb) p = 1;
        else if (mode === "both") {
          if (ina && inb) p = 2;
          else if (ina) p = 0;
          else if (inb) p = 1;
        }
        if (p < 0) continue;
        const q = (y * W + (idx * 3 + (mode === "a" ? 0 : mode === "b" ? 1 : 2)) * SIZE + x) * 3;
        if (p === 2) { img[q] = 120; img[q + 1] = 40; img[q + 2] = 140; }
        else if (p === 0) { img[q] = 210; img[q + 1] = 60; img[q + 2] = 60; }
        else { img[q] = 60; img[q + 1] = 90; img[q + 2] = 220; }
      }
    }
  };
  cell(ma, "a");
  cell(mb, "b");
  cell(ma, "both");
});

mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });
const out = join(REPO_ROOT, "assets", "report", "overlay.png");
writeFileSync(out, encodePng(W, H, img));
console.log(`已生成 ${out}（红=${pairs.map((p) => p[0]).join("/")}，蓝=${pairs.map((p) => p[1]).join("/")}，紫=重合）`);
