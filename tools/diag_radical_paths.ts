/** 部首路径归属的诊断：看 inside / explains 两个判据各自能挑出多少笔。 */
import { join } from "node:path";
import { GlyphStore, loadSealRegistry } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { rasterizeGlyph, countInk } from "../src/raster/mask.ts";
import { isStrokeGlyph, glyphStrokes } from "../src/glyph.ts";

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

const targets = seal.rows.filter((r) => r.modernChar).slice(0, 200);
let stats = {
  n: 0, matchNull: 0, emptyStrict: 0, emptyLoose: 0, emptyExplain: 0,
  sumInsideBest: 0, sumExplainBest: 0, sumPaths: 0, sumExplainsSum: 0,
};

for (const row of targets) {
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) continue;
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  if (!radicalRow) continue;
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = store.glyph("seal", radicalRow.file);
  if (!glyph || !radicalGlyph) continue;

  const m = locateRadical(glyph, radicalGlyph);
  if (!m) { stats.matchNull += 1; continue; }
  stats.n += 1;
  stats.sumPaths += glyph.paths.length;

  // 重算每条路径的 inside 与 explains
  const res = m.resolution;
  const perPath = glyph.paths.map((p) => {
    const mask = rasterizeGlyph(p.subpaths, {
      width: res, height: res, viewBox: glyph.viewBox,
      strokes: isStrokeGlyph(glyph)
        ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }] : undefined,
    });
    return { inside: 0, explains: 0, ink: countInk(mask) };
  });
  // 匹配框内的墨量
  const boxMask = rasterizeGlyph([], { width: res, height: res, viewBox: { x: 0, y: 0, width: 1, height: 1 } });
  const bx = m.box.x, by = m.box.y, bw = m.box.width, bh = m.box.height;
  // 用整字掩膜与路径掩膜的交集近似
  const full = rasterizeGlyph(glyph.paths.flatMap((p) => p.subpaths), {
    width: res, height: res, viewBox: glyph.viewBox,
    strokes: isStrokeGlyph(glyph) ? glyphStrokes(glyph) : undefined,
  });
  let boxInk = 0;
  for (let y = Math.max(0, Math.floor(by)); y < Math.min(res, Math.ceil(by + bh)); y += 1) {
    for (let x = Math.max(0, Math.floor(bx)); x < Math.min(res, Math.ceil(bx + bw)); x += 1) {
      if (full.data[y * res + x]) boxInk += 1;
    }
  }
  void boxMask;
  glyph.paths.forEach((p, i) => {
    const mask = rasterizeGlyph(p.subpaths, {
      width: res, height: res, viewBox: glyph.viewBox,
      strokes: isStrokeGlyph(glyph)
        ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }] : undefined,
    });
    let hit = 0;
    for (let y = Math.max(0, Math.floor(by)); y < Math.min(res, Math.ceil(by + bh)); y += 1) {
      for (let x = Math.max(0, Math.floor(bx)); x < Math.min(res, Math.ceil(bx + bw)); x += 1) {
        if (mask.data[y * res + x] && full.data[y * res + x]) hit += 1;
      }
    }
    perPath[i].inside = perPath[i].ink > 0 ? hit / perPath[i].ink : 0;
    perPath[i].explains = boxInk > 0 ? hit / boxInk : 0;
  });

  const strict = perPath.filter((p) => p.inside >= 0.6).length;
  const loose = perPath.filter((p) => p.inside >= 0.35).length;
  const explain = perPath.filter((p) => p.inside >= 0.35 && p.explains >= 0.12).length;
  if (strict === 0) stats.emptyStrict += 1;
  if (loose === 0) stats.emptyLoose += 1;
  if (explain === 0) stats.emptyExplain += 1;
  stats.sumInsideBest += Math.max(...perPath.map((p) => p.inside));
  stats.sumExplainBest += Math.max(...perPath.map((p) => p.explains));
  stats.sumExplainsSum += perPath.reduce((s, p) => s + p.explains, 0);
}

console.log(`样本 ${stats.n} 个字（匹配失败的 ${stats.matchNull} 个不算）`);
console.log(`  严格判据(inside≥0.6)挑不出笔的: ${stats.emptyStrict} (${(stats.emptyStrict / stats.n * 100).toFixed(1)}%)`);
console.log(`  放宽(inside≥0.35)挑不出的:      ${stats.emptyLoose} (${(stats.emptyLoose / stats.n * 100).toFixed(1)}%)`);
console.log(`  加上 explains≥0.12 后挑不出的:  ${stats.emptyExplain} (${(stats.emptyExplain / stats.n * 100).toFixed(1)}%)`);
console.log(`  平均每字笔画数: ${(stats.sumPaths / stats.n).toFixed(1)}`);
console.log(`  单笔最大 inside 平均: ${(stats.sumInsideBest / stats.n).toFixed(3)}`);
console.log(`  单笔最大 explains 平均: ${(stats.sumExplainBest / stats.n).toFixed(3)}`);
console.log(`  全部笔 explains 之和 平均: ${(stats.sumExplainsSum / stats.n).toFixed(3)}`);
void join;
