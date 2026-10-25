/**
 * 诊断：笔画形状描述子到底还剩多少信息。
 *
 * 起因：部首定位的**投票法**拿形状描述子当判据，但它只有 48.9% 的准确率
 * （组合模式 62.0%）。有个怀疑：**细笔画在 12×12 的正方形归一化下，
 * 位图会被抹成全 1**（一条 40×2 的横，缩到 12×12 就是一块实心），
 * 于是判据全压在「长宽比」上，而长宽比差又是按**绝对值 ×24** 计的——
 * 20 与 25 只差 5，却已经是 120 的距离，远超 34 的容差。
 *
 * 这个探针量三件事：
 * 1. 描述子位图的**信息量**（1 的占比；全 1 或全 0 = 退化）；
 * 2. **长宽比**的分布；
 * 3. 到部首偏旁形码本的**距离**分布。
 *
 * 用法：
 *   node tools/diag_descriptor.ts            # 抽 400 字
 *   node tools/diag_descriptor.ts 2000
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT } from "./lib/store.ts";
import { inkViewBox, isStrokeGlyph, glyphStrokes } from "../src/glyph.ts";
import { countInk, rasterizeGlyph } from "../src/raster/mask.ts";
import { describeMask, minDescriptorDistance } from "../src/structure/descriptor.ts";

const limit = Number(process.argv[2] ?? 400);
const RESOLUTION = 96;

const store = new GlyphStore();
const seal = store.index("seal");
const formsPath = join(REPO_ROOT, "assets", "index", "radical-forms.json");
const forms: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(formsPath) ? JSON.parse(readFileSync(formsPath, "utf8")) : {};

const rows = seal.rows.slice(0, limit);
let strokes = 0;
let degenerateAll = 0;   // 位图全 1
let degenerateEmpty = 0; // 位图全 0
let inkRatioSum = 0;
const aspects: number[] = [];
const dists: number[] = [];

for (const row of rows) {
  const g = store.glyph("seal", row.file);
  if (!g) continue;
  const frame = inkViewBox(g);
  const strokeInfo = isStrokeGlyph(g) ? glyphStrokes(g) : undefined;
  for (const p of g.paths) {
    const mask = rasterizeGlyph(p.subpaths, {
      width: RESOLUTION,
      height: RESOLUTION,
      viewBox: frame,
      strokes: strokeInfo
        ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }]
        : undefined,
    });
    if (countInk(mask) === 0) continue;
    strokes += 1;

    const desc = describeMask(mask);
    const [aspectText, bits] = desc.split("|");
    if (!bits) continue;
    const ones = bits.split("").filter((b) => b === "1").length;
    const ratio = ones / bits.length;
    inkRatioSum += ratio;
    if (ratio >= 0.999) degenerateAll += 1;
    else if (ratio <= 0.001) degenerateEmpty += 1;
    aspects.push(Number(aspectText));

    // 到偏旁形码本的距离：能不能找到同一部的偏旁形
    const no = seal.byChar(row.modernChar);
    if (!no) continue;
    const reg = loadRadicalNo(no.codepoint);
    const types = reg ? forms[reg]?.types : undefined;
    if (!types || types.length === 0) continue;
    dists.push(minDescriptorDistance(desc, types));
  }
}

/** 从篆书登记表查说文部次。 */
function loadRadicalNo(codepoint: string): string | null {
  const p = join(REPO_ROOT, "assets", "glyphs", "seal", "external.csv");
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    if (!line.startsWith(codepoint)) continue;
    const cols = line.split(",");
    return cols[3] ?? null;
  }
  return null;
}

function pct(a: number[], p: number): number {
  if (a.length === 0) return 0;
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

console.log(`抽样 ${rows.length} 字，笔画 ${strokes} 条`);
console.log(`\n位图信息量（1 的占比）`);
console.log(`  平均 ${(inkRatioSum / Math.max(1, strokes) * 100).toFixed(1)}%`);
console.log(`  全 1（退化）${degenerateAll} 条 = ${(degenerateAll / Math.max(1, strokes) * 100).toFixed(1)}%`);
console.log(`  全 0（退化）${degenerateEmpty} 条 = ${(degenerateEmpty / Math.max(1, strokes) * 100).toFixed(1)}%`);

console.log(`\n长宽比分布`);
console.log(`  p10 ${pct(aspects, 10).toFixed(2)}　p25 ${pct(aspects, 25).toFixed(2)}　中位 ${pct(aspects, 50).toFixed(2)}　p75 ${pct(aspects, 75).toFixed(2)}　p90 ${pct(aspects, 90).toFixed(2)}`);
const thin = aspects.filter((a) => a >= 4 || (a > 0 && a <= 0.25)).length;
console.log(`  「细长」（≥4 或 ≤0.25）${thin} 条 = ${(thin / Math.max(1, aspects.length) * 100).toFixed(1)}%`);

console.log(`\n到偏旁形码本的距离（容差 34）`);
console.log(`  样本 ${dists.length}`);
if (dists.length > 0) {
  console.log(`  p10 ${pct(dists, 10).toFixed(1)}　p25 ${pct(dists, 25).toFixed(1)}　中位 ${pct(dists, 50).toFixed(1)}　p75 ${pct(dists, 75).toFixed(1)}　p90 ${pct(dists, 90).toFixed(1)}`);
  const within = dists.filter((d) => d <= 34).length;
  console.log(`  ≤34（判为部首笔画）${within} = ${(within / dists.length * 100).toFixed(1)}%`);
  // 距离里有多少是长宽比贡献的
  const aspectOnly = dists.filter((d) => d > 0 && d % 0.5 === 0).length;
  console.log(`  距离恰为整数倍（说明位图零差异、只有长宽比在起作用）${aspectOnly} = ${(aspectOnly / dists.length * 100).toFixed(1)}%`);
}
