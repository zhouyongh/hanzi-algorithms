/** 对比两种部首定位方法在几个字上的落点。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { boundsOf } from "../src/geometry/path.ts";

const FORMS = JSON.parse(readFileSync(join(REPO_ROOT, "assets", "index", "radical-forms.json"), "utf8"));
const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

for (const char of ["河", "汀", "江", "林", "明", "眼", "好", "如", "投", "指"]) {
  const row = seal.byChar(char);
  if (!row) { console.log(char + ": 无"); continue; }
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) { console.log(char + ": 无登记"); continue; }
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
  if (!glyph) { console.log(char + ": 字形缺"); continue; }
  const forms = FORMS[reg.radicalNo];
  const whole = boundsOf(glyph.paths.flatMap((p) => p.subpaths));

  const show = (label: string, m: ReturnType<typeof locateRadical>) => {
    if (!m) { console.log(`  ${label}: null`); return; }
    const rad = glyph.paths.filter((_, i) => m.pathIndices.includes(i)).flatMap((p) => p.subpaths);
    const rb = boundsOf(rad);
    console.log(
      `  ${label}: 路径[${m.pathIndices}] ncc=${m.score.toFixed(2)} ` +
      `部首框 x[${rb.x.toFixed(0)},${(rb.x + rb.width).toFixed(0)}] ` +
      `字全框 x[${whole.x.toFixed(0)},${(whole.x + whole.width).toFixed(0)}]`,
    );
  };

  console.log(`${char}（说文第${reg.radicalNo}部，偏旁形 ${forms ? forms.types.length + "型/覆盖" + forms.coverage : "无"}）`);
  show("模板", radicalGlyph ? locateRadical(glyph, radicalGlyph) : null);
  if (forms) show("投票", locateRadical(glyph, null, { radicalTypes: forms.types, typeTolerance: 26 }));
}
