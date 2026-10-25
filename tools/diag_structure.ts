/** 诊断几个字的部首定位与构形判定过程。 */
import { GlyphStore, loadSealRegistry } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { boundsOf } from "../src/geometry/path.ts";

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

for (const char of ["河", "汀", "江", "江", "林", "明", "眼", "好", "如"]) {
  const row = seal.byChar(char);
  if (!row) { console.log(char + ": 仓内无"); continue; }
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) { console.log(char + ": 无部登记"); continue; }
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
  if (!glyph || !radicalGlyph) { console.log(char + ": 字形缺"); continue; }

  const m = locateRadical(glyph, radicalGlyph);
  if (!m) { console.log(char + ": 定位失败（null）"); continue; }

  const rad = glyph.paths.filter((_, i) => m.pathIndices.includes(i)).flatMap((p) => p.subpaths);
  const rem = glyph.paths.filter((_, i) => !m.pathIndices.includes(i)).flatMap((p) => p.subpaths);
  const rb = boundsOf(rad);
  const eb = boundsOf(rem);
  console.log(
    `${char} 部${reg.radicalNo}(${radicalRow?.modernChar}) 命中路径[${m.pathIndices}] ` +
    `ncc=${m.score.toFixed(2)} prec=${m.precision.toFixed(2)} 缩放=${m.fx.toFixed(2)}×${m.fy.toFixed(2)}`,
  );
  console.log(
    `    部首框 x[${rb.x.toFixed(0)},${(rb.x + rb.width).toFixed(0)}] y[${rb.y.toFixed(0)},${(rb.y + rb.height).toFixed(0)}]  ` +
    `其余框 x[${eb.x.toFixed(0)},${(eb.x + eb.width).toFixed(0)}] y[${eb.y.toFixed(0)},${(eb.y + eb.height).toFixed(0)}]  ` +
    `字全框 x[${boundsOf(glyph.paths.flatMap((p) => p.subpaths)).x.toFixed(0)},…]`,
  );
}
