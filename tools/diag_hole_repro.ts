/** 最小复现：光栅化器有没有正确挖掉「洞」。 */
import { parseGlyphSvg } from "../src/glyph.ts";
import { rasterizeGlyph, countInk, createMask } from "../src/raster/mask.ts";

/** 一个 100×100 的方框，中间一个 40×40 的洞（反向绕向）。 */
const square = "M 10 10 L 90 10 L 90 90 L 10 90 Z";
const hole = "M 30 30 L 30 70 L 70 70 L 70 30 Z";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
  `<path d="${square} ${hole}" fill="#000" fill-rule="nonzero"/></svg>`;

const g = parseGlyphSvg(svg);
console.log("子路径数", g.paths[0].subpaths.length);
g.paths[0].subpaths.forEach((sp, i) => {
  const first = sp[0];
  const last = sp[sp.length - 1];
  console.log(`  子路径${i}: ${sp.length} 点  首点(${first.x},${first.y}) 末点(${last.x},${last.y}) ` +
    `闭合=${first.x === last.x && first.y === last.y}`);
});

const res = 100;
const mask = rasterizeGlyph(g.paths.flatMap((p) => p.subpaths), {
  width: res, height: res, viewBox: { x: 0, y: 0, width: 100, height: 100 },
});
const ink = countInk(mask);
const outer = 80 * 80;
const holeArea = 40 * 40;
console.log(`\n光栅化墨量 ${ink} px`);
console.log(`  洞被填（应≈${outer}）  洞挖掉（应≈${outer - holeArea}）`);
console.log(`  → ${ink > (outer + holeArea) / 2 ? "洞被填掉了（错）" : "洞正确挖掉了（对）"}`);

// 中间一点应该是空的
const mid = 50 * res + 50;
console.log(`  中心像素 ink=${mask.data[mid]}（应为 0）`);

// 打印一张小图看
let art = "";
for (let y = 0; y < 40; y += 2) {
  for (let x = 0; x < 40; x += 2) {
    art += mask.data[(y * 2) * res + x * 2] ? "#" : ".";
  }
  art += "\n";
}
console.log(art);
void createMask;

// ── 真实的篆书「日」 ──────────────────────────────────────
import { readFileSync } from "node:fs";
import { GlyphStore } from "./lib/store.ts";
import { inkViewBox } from "../src/glyph.ts";

const store = new GlyphStore();
const seal = store.index("seal");
const row = seal.byChar("日");
const real = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${row!.file}`, "utf8"));
console.log("=== 真实的篆书「日」 ===");
real.paths[0].subpaths.forEach((sp, i) => {
  const first = sp[0];
  const last = sp[sp.length - 1];
  console.log(`  子路径${i}: ${sp.length} 点  首(${first.x.toFixed(1)},${first.y.toFixed(1)}) ` +
    `末(${last.x.toFixed(1)},${last.y.toFixed(1)}) 闭合=${first.x === last.x && first.y === last.y}`);
});
const vb = inkViewBox(real);
const rmask = rasterizeGlyph(real.paths.flatMap((p) => p.subpaths), {
  width: res, height: res, viewBox: vb,
});
let art2 = "";
for (let y = 0; y < 40; y += 2) {
  for (let x = 0; x < 40; x += 2) {
    art2 += rmask.data[(y * 2) * res + x * 2] ? "#" : ".";
  }
  art2 += "\n";
}
console.log(art2);
