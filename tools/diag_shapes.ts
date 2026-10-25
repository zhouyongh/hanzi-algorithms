/**
 * 量一量：同一部的字里，「部首那几笔」彼此差多少？
 *
 * 这个数字决定「按笔画形状投票」这条路可不可行：
 * 差得少 → 能聚类、能投票；差得多 → 摹本手抄的出入太大，这条路不成立。
 */
import { GlyphStore, loadSealRegistry } from "./lib/store.ts";
import { inkViewBox } from "../src/glyph.ts";
import { countInk, rasterizeGlyph } from "../src/raster/mask.ts";
import { describeMask, descriptorDistance, type Descriptor } from "../src/structure/descriptor.ts";

const REG = process.argv[2] ?? "410";   // 说文部次
const SAMPLE = Number(process.argv[3] ?? 40);

const store = new GlyphStore();
const registry = loadSealRegistry();
const seal = store.index("seal");

const chars = registry
  .filter((r) => r.radicalNo === REG)
  .map((r) => r.codepoint)
  .slice(0, SAMPLE);

const perChar: Array<{ cp: string; descs: Descriptor[] }> = [];
for (const cp of chars) {
  const row = seal.byCodepoint(cp);
  if (!row) continue;
  const glyph = store.glyph("seal", row.file);
  if (!glyph) continue;
  const vb = inkViewBox(glyph);
  const descs: Descriptor[] = [];
  for (const p of glyph.paths) {
    const pm = rasterizeGlyph(p.subpaths, { width: 64, height: 64, viewBox: vb });
    if (countInk(pm) === 0) continue;
    descs.push(describeMask(pm));
  }
  if (descs.length) perChar.push({ cp, descs });
}

console.log(`第 ${REG} 部，样本 ${perChar.length} 字`);
const descs = perChar.flatMap((c) => c.descs);
console.log(`笔画描述子共 ${descs.length} 个`);

// 每个描述子到「其它字里的描述子」的最小距离
const mins: number[] = [];
for (const d of descs) {
  let best = Infinity;
  for (const other of descs) {
    if (other === d) continue;
    const dist = descriptorDistance(d, other);
    if (dist < best) best = dist;
  }
  mins.push(best);
}
mins.sort((a, b) => a - b);
const pct = (q: number) => mins[Math.floor(mins.length * q)];
console.log(`描述子到最近邻居的距离：中位 ${pct(0.5).toFixed(0)}　p25 ${pct(0.25).toFixed(0)}　p75 ${pct(0.75).toFixed(0)}`);
console.log(`距离 ≤ 26 的占比 ${(mins.filter((x) => x <= 26).length / mins.length * 100).toFixed(1)}%`);
console.log(`距离 ≤ 45 的占比 ${(mins.filter((x) => x <= 45).length / mins.length * 100).toFixed(1)}%`);
console.log(`距离 ≤ 70 的占比 ${(mins.filter((x) => x <= 70).length / mins.length * 100).toFixed(1)}%`);

// 「出现在多少个字里」的最高频描述子簇
const freq = new Map<string, Set<string>>();
for (const c of perChar) {
  for (const d of c.descs) {
    if (!freq.has(d)) freq.set(d, new Set());
    freq.get(d)?.add(c.cp);
  }
}
const best = [...freq.entries()].sort((a, b) => b[1].size - a[1].size)[0];
console.log(`完全相同的描述子，最多出现在 ${best ? best[1].size : 0}/${perChar.length} 个字里`);
