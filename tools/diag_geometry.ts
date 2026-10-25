/**
 * 构形判定的几何诊断：把左右/上下判据用到的每一个量都打出来。
 *
 * 关心的问题是：部首框与「其余框」在两个轴上的重叠率分别是多少，
 * 差多少才够判成 ⿰ / ⿱，以及部首框是不是真的落在该落的那一侧。
 *
 * 用法：node tools/diag_geometry.ts 河 投 眼 苗
 */

import { GlyphStore, loadSealRegistry } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { boundsOf } from "../src/geometry/path.ts";
import type { Rect } from "../src/geometry/path.ts";

/** 两个矩形在某一轴上的重叠比例（相对较小者）。 */
function overlapRatio(a: Rect, b: Rect, axis: "x" | "y"): number {
  const a0 = axis === "x" ? a.x : a.y;
  const a1 = a0 + (axis === "x" ? a.width : a.height);
  const b0 = axis === "x" ? b.x : b.y;
  const b1 = b0 + (axis === "x" ? b.width : b.height);
  const inter = Math.min(a1, b1) - Math.max(a0, b0);
  if (inter <= 0) return 0;
  const span = Math.min(a1 - a0, b1 - b0);
  return span > 0 ? inter / span : 0;
}

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

const chars = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = chars.length > 0 ? chars : ["河", "汀", "投", "眼", "明", "苗", "問", "國"];

for (const char of targets) {
  const row = seal.byChar(char);
  if (!row) { console.log(`${char}: 仓内无`); continue; }
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) { console.log(`${char}: 无部登记`); continue; }
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
  if (!glyph || !radicalGlyph) { console.log(`${char}: 字形缺`); continue; }

  const m = locateRadical(glyph, radicalGlyph);
  if (!m) { console.log(`${char}: 定位失败（null）`); continue; }

  // 子路径级：与 decompose 里的划分一致
  const radSubs: unknown[] = [];
  const remSubs: unknown[] = [];
  if (m.perSubpath) {
    for (const rec of m.perSubpath) {
      const sp = glyph.paths[rec.path]?.subpaths[rec.subpath];
      if (!sp) continue;
      if (rec.radical) radSubs.push(sp);
      else remSubs.push(sp);
    }
  }
  const rb = boundsOf(radSubs as never);
  const eb = boundsOf(remSubs as never);
  const ox = overlapRatio(rb, eb, "x");
  const oy = overlapRatio(rb, eb, "y");
  const wb = boundsOf(glyph.paths.flatMap((p) => p.subpaths));

  const fmt = (b: Rect): string =>
    `x[${b.x.toFixed(0)},${(b.x + b.width).toFixed(0)}] y[${b.y.toFixed(0)},${(b.y + b.height).toFixed(0)}]`;

  console.log(`${char} 部${reg.radicalNo}(${radicalRow?.modernChar}) 命中路径[${m.pathIndices}] ncc=${m.score.toFixed(2)}`);
  console.log(`   部首框 ${fmt(rb)}`);
  console.log(`   其余框 ${fmt(eb)}`);
  console.log(`   字全框 ${fmt(wb)}`);
  console.log(
    `   重叠 x=${ox.toFixed(3)} y=${oy.toFixed(3)}  ` +
    `→ ${oy > 0.3 && ox < 0.15 ? "判 ⿰" : ox > 0.3 && oy < 0.15 ? "判 ⿱" : "落不到左右/上下 → ⿴"}`,
  );
  const radLeft = rb.x + rb.width <= eb.x + 1;
  const radTop = rb.y + rb.height <= eb.y + 1;
  console.log(`   部首在左=${radLeft} 在上=${radTop}`);
}
