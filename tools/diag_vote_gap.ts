/**
 * 诊断：投票法「判不出」的 37 个字到底卡在哪一步。
 *
 * 投票法在 92 个可分解字上只对 45 个（48.9%），**判不出 37 个（40.2%）**——
 * 判错只有 10 个。所以问题不在「判得不准」，在「不敢判」。
 *
 * 「不敢判」有三个可能的卡点：
 * - **A** 这个部没有归纳出偏旁形（码本只覆盖 125/540 部）→ 根本没法投票；
 * - **B** 有偏旁形，但没有一笔落在容差内（`selected.length === 0`）；
 * - **C** 命中了，但置信度低于 `minScore`（0.45）。
 *
 * 区分办法：把 `minScore` 降到 0 再跑一遍——
 * 降了能出结果 = 卡在 C；降了还是出不来 = 卡在 A 或 B。
 *
 * 用法：
 *   node tools/diag_vote_gap.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose, type Decomposition } from "../src/structure/decomposition.ts";
import { LABELED } from "./lib/labels.ts";

const store = new GlyphStore();
const seal = store.index("seal");
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));

const FORMS_PATH = (() => {
  const hit = process.argv.find((a) => a.startsWith("--forms="));
  return hit ? hit.split("=")[1] : join(REPO_ROOT, "assets", "index", "radical-forms.json");
})();
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(FORMS_PATH) ? JSON.parse(readFileSync(FORMS_PATH, "utf8")) : {};
console.log(`偏旁形码本：${FORMS_PATH}（${Object.keys(FORMS).length} 部）`);

const TOLERANCE = (() => {
  const hit = process.argv.find((a) => a.startsWith("--tol="));
  return hit ? Number(hit.split("=")[1]) : 34;
})();

let ok = 0;
let wrong = 0;
const gapA: string[] = [];
const gapB: string[] = [];
const gapC: string[] = [];
const rows: string[] = [];

for (const [char, expect] of LABELED) {
  const row = seal.byChar(char);
  if (!row) continue;
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) continue;
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  if (!radicalRow) continue;
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = store.glyph("seal", radicalRow.file);
  if (!glyph || !radicalGlyph) continue;

  const forms = FORMS[reg.radicalNo];
  const types = forms?.types ?? [];
  if (types.length === 0) {
    gapA.push(`${char}(部${reg.radicalNo})`);
    rows.push(`${char}\t部${reg.radicalNo}\tA 无偏旁形`);
    continue;
  }

  const base = { radicalTypes: types, typeTolerance: TOLERANCE, frame: "ink" as const };
  const strict = locateRadical(glyph, radicalGlyph, { ...base, minScore: 0.45 });
  if (strict) {
    const dec = decompose(glyph, strict, radicalGlyph);
    if (dec && dec.structure === expect) {
      ok += 1;
      rows.push(`${char}\t部${reg.radicalNo}\t✓ ${strict.score.toFixed(2)}`);
    } else {
      wrong += 1;
      rows.push(`${char}\t部${reg.radicalNo}\t✗ ${dec?.structure ?? "无"}（期望 ${expect}）`);
    }
    continue;
  }

  // 严格档判不出：区分是「置信度不够」还是「根本没命中」
  const loose = locateRadical(glyph, radicalGlyph, { ...base, minScore: 0 });
  if (loose) {
    gapC.push(`${char}(部${reg.radicalNo} 置信度 ${loose.score.toFixed(2)})`);
    rows.push(`${char}\t部${reg.radicalNo}\tC 置信度 ${loose.score.toFixed(2)} < 0.45`);
  } else {
    gapB.push(`${char}(部${reg.radicalNo})`);
    rows.push(`${char}\t部${reg.radicalNo}\tB 无命中`);
  }
}

console.log(`可分解字 ${LABELED.length}　正确 ${ok}　判错 ${wrong}　判不出 ${gapA.length + gapB.length + gapC.length}`);
console.log(`\nA 部没有偏旁形（码本没覆盖到）：${gapA.length}`);
console.log(`B 有偏旁形但一笔都没命中：${gapB.length}`);
console.log(`C 命中了但置信度不够：${gapC.length}`);
console.log(`\n—— A ——\n${gapA.join("、") || "（无）"}`);
console.log(`\n—— B ——\n${gapB.join("、") || "（无）"}`);
console.log(`\n—— C ——\n${gapC.join("、") || "（无）"}`);

/**
 * 组合模式（投票优先、判不出回退模板）——**这是库里的默认路径**，
 * 也是 README 与评测台报的那个头号指标。
 */
{
  let o = 0;
  let w = 0;
  let n = 0;
  for (const [char, expect] of LABELED) {
    const row = seal.byChar(char);
    if (!row) continue;
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    if (!reg) continue;
    const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
    if (!radicalRow) continue;
    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = store.glyph("seal", radicalRow.file);
    if (!glyph || !radicalGlyph) continue;
    const types = FORMS[reg.radicalNo]?.types ?? [];

    let dec: Decomposition | null = null;
    if (types.length > 0) {
      const m = locateRadical(glyph, radicalGlyph, {
        radicalTypes: types,
        typeTolerance: TOLERANCE,
        frame: "ink",
      });
      if (m) dec = decompose(glyph, m, radicalGlyph);
    }
    if (!dec) {
      const m = locateRadical(glyph, radicalGlyph, { frame: "ink" });
      if (m) dec = decompose(glyph, m, radicalGlyph);
    }
    if (!dec) { n += 1; continue; }
    if (dec.structure === expect) o += 1;
    else w += 1;
  }
  const total = o + w + n;
  console.log(
    `\n组合模式（投票优先，回退模板，minScore 0.45）：正确 ${o}　判错 ${w}　判不出 ${n}` +
    `\n  正确率 ${total > 0 ? ((o / total) * 100).toFixed(1) : "0"}%　精确率 ${o + w > 0 ? ((o / (o + w)) * 100).toFixed(1) : "0"}%`,
  );
}
if (process.argv.includes("--rows")) {
  console.log(`\n—— 逐字 ——`);
  for (const r of rows) console.log(r);
}

/**
 * 扫 `minScore`。
 *
 * 上面看到 C 组的置信度全挤在 0.29–0.44（阈值 0.45）附近，
 * 说明**阈值卡在分布的中间**——一半该判的判不出，一半判错的也放进来。
 * 扫一遍看准确率怎么走。
 *
 * 取值要**落在平台上**，不取峰值：这一组只有 92 个标注字，
 * 峰值多半是对这组字过拟合。
 */
if (process.argv.includes("--sweep")) {
  console.log(`\n—— minScore 扫描（容差 ${TOLERANCE}）——`);
  console.log(`模式\t阈值\t正确\t判错\t判不出\t正确率（正确/总数）　精确率（正确/（正确+判错））`);
  for (const mode of ["vote", "both"] as const) {
    for (const ms of [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]) {
      let o = 0;
      let w = 0;
      let n = 0;
      for (const [char, expect] of LABELED) {
        const row = seal.byChar(char);
        if (!row) continue;
        const cp = row.codepoint || row.glyphId;
        const reg = regByCp.get(cp);
        if (!reg) continue;
        const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
        if (!radicalRow) continue;
        const glyph = store.glyph("seal", row.file);
        const radicalGlyph = store.glyph("seal", radicalRow.file);
        if (!glyph || !radicalGlyph) continue;
        const types = FORMS[reg.radicalNo]?.types ?? [];

        let dec: Decomposition | null = null;
        if (types.length > 0) {
          const m = locateRadical(glyph, radicalGlyph, {
            radicalTypes: types,
            typeTolerance: TOLERANCE,
            frame: "ink",
            minScore: ms,
          });
          if (m) dec = decompose(glyph, m, radicalGlyph);
        }
        // 组合模式：投票判不出就回退模板
        if (!dec && mode === "both") {
          const m = locateRadical(glyph, radicalGlyph, { frame: "ink" });
          if (m) dec = decompose(glyph, m, radicalGlyph);
        }
        if (!dec) { n += 1; continue; }
        if (dec.structure === expect) o += 1;
        else w += 1;
      }
      const total = o + w + n;
      const acc = total > 0 ? (o / total) * 100 : 0;
      const prec = o + w > 0 ? (o / (o + w)) * 100 : 0;
      console.log(`${mode}\t${ms.toFixed(2)}\t${o}\t${w}\t${n}\t${acc.toFixed(1)}%\t${prec.toFixed(1)}%（${o}/${o + w}）`);
    }
  }
}
