/**
 * 诊断：构形判错时，把几何量摊开看。
 *
 * 构形准确率 65.2% 之后，最大的错误桶是「上下结构被判成包围」（⿱→⿴ 7 个字）。
 * 光看混淆表看不出**为什么**——所以这里把判定用的每一个量都打出来：
 *
 * - 部首与「其余」的墨量质心差（归一化到字宽/字高）
 * - 左右判据、上下判据各自成立与否
 * - 包围判据（谁套谁）
 *
 * 用法：
 *   node tools/diag_structure_fails.ts          # 只列判错的
 *   node tools/diag_structure_fails.ts --all    # 全列
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { boundsOf, centroidOf } from "../src/geometry/path.ts";
import { resolveStructure } from "../src/structure/resolve.ts";
import { LABELED } from "./lib/labels.ts";

const store = new GlyphStore();
const seal = store.index("seal");
const regByCp = new Map(loadSealRegistry().map((r) => [r.codepoint, r]));

const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> = (() => {
  const p = join(REPO_ROOT, "assets", "index", "radical-forms.json");
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return {};
  }
})();

const showAll = process.argv.includes("--all");
const SEP = 0.18;
const CROSS = 0.55;

let ok = 0;
let wrong = 0;
let none = 0;
const rows: string[] = [];

for (const [char, expect] of LABELED) {
  const row = seal.byChar(char);
  if (!row) continue;
  const reg = regByCp.get(row.codepoint || row.glyphId);
  if (!reg) continue;
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  if (!radicalRow) continue;
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = store.glyph("seal", radicalRow.file);
  if (!glyph || !radicalGlyph) continue;

  const forms = FORMS[reg.radicalNo];
  const resolved = resolveStructure(glyph, radicalGlyph, {
    radicalTypes: forms?.types ?? [],
  });
  if (!resolved) {
    none += 1;
    if (showAll) rows.push(`${char}\t${expect}\t判不出\t—`);
    continue;
  }
  const dec = resolved.decomposition;
  if (dec.structure === expect) {
    ok += 1;
    if (showAll) rows.push(`${char}\t${expect}\t✓\t—`);
    continue;
  }
  wrong += 1;

  // 把判定用的几何量摊开
  const radicalSubs = dec.radicalPathIndices.flatMap((i) => glyph.paths[i]?.subpaths ?? []);
  const restSubs = dec.remainderPathIndices.flatMap((i) => glyph.paths[i]?.subpaths ?? []);
  const allSubs = glyph.paths.flatMap((p) => p.subpaths);
  const gB = boundsOf(allSubs);
  const gW = gB.width || 1;
  const gH = gB.height || 1;
  const rc = centroidOf(radicalSubs);
  const sc = centroidOf(restSubs);
  const dx = (sc.x - rc.x) / gW;
  const dy = (sc.y - rc.y) / gH;
  const horizontal = Math.abs(dx) >= SEP && Math.abs(dy) < CROSS;
  const vertical = Math.abs(dy) >= SEP && Math.abs(dx) < CROSS;
  const containsRad = (() => {
    const rb = dec.radicalBounds;
    const sb = dec.remainderBounds;
    return (
      sb.x >= rb.x - 2 && sb.y >= rb.y - 2 &&
      sb.x + sb.width <= rb.x + rb.width + 2 && sb.y + sb.height <= rb.y + rb.height + 2
    );
  })();

  rows.push(
    `${char}\t期望${expect}\t实得${dec.structure}\t` +
    `dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}  ` +
    `左右判据${horizontal ? "✓" : "✗"} 上下判据${vertical ? "✓" : "✗"} ` +
    `部首套其余${containsRad ? "是" : "否"}  ` +
    `部首框 ${dec.radicalBounds.width.toFixed(0)}×${dec.radicalBounds.height.toFixed(0)} ` +
    `其余框 ${dec.remainderBounds.width.toFixed(0)}×${dec.remainderBounds.height.toFixed(0)} ` +
    `字框 ${gW.toFixed(0)}×${gH.toFixed(0)}  部首在${dec.radicalSide}`,
  );
}

console.log(`正确 ${ok}　判错 ${wrong}　判不出 ${none}`);
console.log(`\n字\t期望→实得\t几何量`);
for (const r of rows) console.log(r);
