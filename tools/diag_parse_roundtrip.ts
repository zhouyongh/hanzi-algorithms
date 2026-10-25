/**
 * 验算：解析器是不是有损的。
 *
 * 做法：把解析出来的子路径重新序列化成 SVG，在浏览器里渲染，
 * 与原始 SVG 对比。若两者不同，说明解析丢了几何。
 *
 * 产出两个文件到 assets/report/：
 * - parse-roundtrip.svg  解析后重新序列化的
 * - parse-original.svg   原始的（副本）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";

/** 与 demos/lib/demo.js 的 pathData 一致。 */
function pathData(subpaths: Array<Array<{ x: number; y: number }>>): string {
  return subpaths
    .map((sp) => "M " + sp.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" L ") + " Z")
    .join(" ");
}

const store = new GlyphStore();
const seal = store.index("seal");
mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });

const chars = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["日", "目", "未", "明", "投"];

for (const ch of chars) {
  const row = seal.byChar(ch);
  if (!row) continue;
  const raw = readFileSync(join(REPO_ROOT, "assets", "glyphs", "seal", row.file), "utf8");
  const g = parseGlyphSvg(raw);
  const rebuilt = g.paths
    .map((p) => `<path d="${pathData(p.subpaths)}" fill="#010103" fill-rule="nonzero"/>`)
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.viewBox.x} ${g.viewBox.y} ` +
    `${g.viewBox.width} ${g.viewBox.height}" width="300" height="300">${rebuilt}</svg>`;
  const out = join(REPO_ROOT, "assets", "report", `parse-${ch}.svg`);
  writeFileSync(out, svg, "utf8");

  // 统计：原路径的命令数 vs 解析出的点数
  const cmds = (raw.match(/[a-zA-Z]/g) || []).length;
  const pts = g.paths.reduce((s, p) => s + p.subpaths.reduce((t, sp) => t + sp.length, 0), 0);
  const subs = g.paths.reduce((s, p) => s + p.subpaths.length, 0);
  console.log(`${ch}  命令数 ${cmds}  子路径 ${subs}  解析出 ${pts} 点  → ${out}`);
}
