/**
 * 自检：把「篆书原形 / 算法隶变 / 真实隶书」三栏打成 ASCII 图。
 *
 * 用途：隶变演示页的中间那栏早先是「一团乱」——波磔幅度被按字身放大，
 * 尾巴比整个字还长。这个探针用来**在浏览器之外**验证输出形状是否合理。
 *
 * 用法：
 *   node tools/diag_lishu_triple.ts 明
 *   node tools/diag_lishu_triple.ts 明 --w 34
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore } from "./lib/store.ts";
import { REPO_ROOT } from "./lib/store.ts";
import { parseGlyphSvg, type Glyph } from "../src/glyph.ts";
import { rasterizeGlyph } from "../src/raster/mask.ts";
import { lishuTransform } from "../src/morph/lishu.ts";

const args = process.argv.slice(2);
const char = args[0] ?? "明";
const wIdx = args.indexOf("--w");
const W = wIdx >= 0 ? Number(args[wIdx + 1]) : 26;

const store = new GlyphStore();

function load(layer: "seal" | "clerical", ch: string): Glyph | null {
  const row = store.index(layer).byChar(ch);
  if (!row) return null;
  const p = join(REPO_ROOT, "assets", "glyphs", layer, row.file);
  try {
    return parseGlyphSvg(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function show(title: string, g: Glyph | null): void {
  console.log(`\n══ ${title} ══`);
  if (!g) {
    console.log("（没有这一栏的字形）");
    return;
  }
  // 光栅化要的是「子路径数组」；算外接框要的是「点数组」，两者差一层展平
  const subpaths = g.paths.flatMap((p) => p.subpaths);
  const all = subpaths.flat();
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const size = Math.max(x1 - x0, y1 - y0) || 1;
  const viewBox = { x: x0, y: y0, width: size, height: size };
  const mask = rasterizeGlyph(subpaths, { width: W, height: W, viewBox });
  for (let y = 0; y < W; y += 1) {
    let line = "";
    for (let x = 0; x < W; x += 1) line += mask.data[y * W + x] ? "#" : ".";
    console.log("  " + line);
  }
  console.log(`  墨迹 ${size.toFixed(0)}×${size.toFixed(0)}　路径 ${g.paths.length} 条`);
}

const sealGlyph = load("seal", char);
const realGlyph = load("clerical", char);
if (!sealGlyph) {
  console.error(`仓内没有「${char}」`);
  process.exit(1);
}

const lishu = lishuTransform(sealGlyph, { waveRatio: 0.025 });

show(`原（篆书摹本）「${char}」`, sealGlyph);
show(`算法隶变（算法生成）「${char}」`, lishu);
show(`真实隶书（摹本对照）「${char}」`, realGlyph);

// 形状合理性：外接框不能暴涨，尾巴不能比整字还长
const box = (g: Glyph) => {
  const all = g.paths.flatMap((p) => p.subpaths).flat();
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
};
const a = box(sealGlyph);
const b = box(lishu);
console.log(`\n外接框　原 ${a.w.toFixed(0)}×${a.h.toFixed(0)}　→　变后 ${b.w.toFixed(0)}×${b.h.toFixed(0)}`);
console.log(`放大倍数　宽 ×${(b.w / a.w).toFixed(2)}　高 ×${(b.h / a.h).toFixed(2)}`);
