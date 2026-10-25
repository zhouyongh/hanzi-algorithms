/** 把一个字逐路径打成 ASCII 图，看清每条路径是什么。 */
import { readFileSync } from "node:fs";
import { GlyphStore } from "./lib/store.ts";
import { parseGlyphSvg, inkViewBox } from "../src/glyph.ts";
import { rasterizeGlyph } from "../src/raster/mask.ts";

const store = new GlyphStore();
const seal = store.index("seal");
const char = process.argv[2] ?? "河";
const row = seal.byChar(char);
if (!row) throw new Error(`仓内没有 ${char}`);
const g = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${row.file}`, "utf8"));
const vb = inkViewBox(g);
const R = 26;

for (let i = 0; i < g.paths.length; i += 1) {
  const mask = rasterizeGlyph(g.paths[i].subpaths, { width: R, height: R, viewBox: vb });
  const b = g.paths[i].bounds;
  const cx = ((b.x + b.width / 2 - vb.x) / vb.width) * 100;
  console.log(`── 路径 ${i}　中心 x=${cx.toFixed(0)}%　x[${b.x.toFixed(0)},${(b.x + b.width).toFixed(0)}] ──`);
  for (let y = 0; y < R; y += 1) {
    let line = "";
    for (let x = 0; x < R; x += 1) line += mask.data[y * R + x] ? "#" : ".";
    console.log("  " + line);
  }
}
