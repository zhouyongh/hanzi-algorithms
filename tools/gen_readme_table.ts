/** 生成 README 里 A1 的实测表（用的��库的**默认行为**：投票优先、判不出回退模板）。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { resolveStructure } from "../src/structure/resolve.ts";

/** 部首的偏旁形（由 tools/build_radical_forms.ts 归纳，不入库）。 */
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> = (() => {
  const p = join(REPO_ROOT, "assets", "index", "radical-forms.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
})();

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

const CASES = ["投", "指", "持", "控", "想", "好", "如", "河", "眼", "語", "明", "本"];

for (const char of CASES) {
  const row = seal.byChar(char);
  if (!row) continue;
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
  if (!glyph || !radicalGlyph || !reg) continue;

  const forms = FORMS[reg.radicalNo];
  const resolved = resolveStructure(glyph, radicalGlyph, { radicalTypes: forms?.types ?? [] });
  if (!resolved) { console.log(`| ${char} | … | 判不出 | — | — |`); continue; }
  const m = resolved.match;
  console.log(
    `| ${char} | ${reg.radicalNo} ${radicalRow?.modernChar ?? "?"} | ${m.pathIndices.join(", ")} | ` +
    `${m.score.toFixed(2)} | ${(m.coverage * 100).toFixed(0)}% |`,
  );
}
