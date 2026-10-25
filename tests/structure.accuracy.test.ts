/**
 * 构形分解的准确率回归测试。
 *
 * 带人工标注的 IDS 结构（说文 540 部 + 92 个可分解的常用字，见 `tools/lib/labels.ts`）。
 * 这条测试的作用不是「测得多准」，而是**守住当前水平**——
 * 构形分解的准确率约六成（原因见 docs/设计取舍与踩坑.md），
 * 改算法时至少要能看到它掉没掉。
 *
 * **分母口径**：只算「说文部首 ≠ 整字」的可分解字。
 * 說文 540 部里有 60 来个部本身就是合体字（林、里、男、宮、明…），
 * 对这些字「部首 + 剩余部分」这个前提不成立，算法只能给 ⿻；
 * 把它们混进分母会把数字抬高近 40 个百分点，所以单独一组报。
 *
 * 想提高准确率时，改这里的同时也要改 docs 里的数字。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "../tools/lib/store.ts";
import { LABELED, SELF_RADICAL, SELF_RADICAL_COMPOUND } from "../tools/lib/labels.ts";
import { resolveStructure } from "../src/structure/resolve.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "glyphs", "seal", "index.csv"));

/**
 * 部首的偏旁形（由 `tools/build_radical_forms.ts` 归纳）。
 *
 * 有了它才能走投票法——投票法比模板法准，但没有偏旁形的部只能靠模板，
 * 所以最终是「投票优先、判不出回退模板」（见 src/structure/resolve.ts）。
 */
const FORMS_PATH = join(ASSETS, "index", "radical-forms.json");
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(FORMS_PATH) ? JSON.parse(readFileSync(FORMS_PATH, "utf8")) : {};

/** 当前准确率下限（实测约 62%；下调会让改动悄悄退化而不被察觉）。 */
const ACCURACY_FLOOR = 0.55;

describe.skipIf(!hasAssets)("构形分解准确率", () => {
  it("可分解字（说文部首 ≠ 整字）不低于下限", () => {
    const store = new GlyphStore();
    const registry = loadSealRegistry();
    const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
    const seal = store.index("seal");

    let ok = 0;
    let total = 0;
    const wrong: string[] = [];

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
      const resolved = resolveStructure(glyph, radicalGlyph, {
        radicalTypes: forms?.types ?? [],
        typeTolerance: 38,
      });
      total += 1;
      if (resolved && resolved.decomposition.structure === expect) ok += 1;
      else wrong.push(`${char}: 期望${expect} 实得${resolved ? resolved.decomposition.structure : "判不出"}`);
    }

    expect(total, "可分解的标注字太少，评测不成立").toBeGreaterThan(80);
    const rate = ok / total;
    // 报错信息里带上错例，改算法时能直接看到退在哪
    expect(rate, `构形准确率 ${(rate * 100).toFixed(1)}%（${ok}/${total}）。错例：\n${wrong.join("；")}`)
      .toBeGreaterThanOrEqual(ACCURACY_FLOOR);
  });

  it("说文部首就是整字的字，判出独体", () => {
    const store = new GlyphStore();
    const registry = loadSealRegistry();
    const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
    const seal = store.index("seal");

    let checked = 0;
    for (const char of SELF_RADICAL) {
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
      const resolved = resolveStructure(glyph, radicalGlyph, {
        radicalTypes: forms?.types ?? [],
        typeTolerance: 38,
      });
      if (!resolved) continue;
      checked += 1;
      expect(resolved.decomposition.structure, `${char} 的说文部首就是整字，应判独体`).toBe("⿻");
    }
    expect(checked).toBeGreaterThan(30);
  });
});

describe.skipIf(!hasAssets)("结构判定的高层入口", () => {
  it("投票优先、判不出回退模板", () => {
    const store = new GlyphStore();
    const registry = loadSealRegistry();
    const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
    const seal = store.index("seal");

    const row = seal.byChar("投");
    expect(row).toBeTruthy();
    if (!row) return;
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
    expect(glyph && radicalGlyph).toBeTruthy();
    if (!glyph || !radicalGlyph) return;

    // 有偏旁形时走投票法
    const forms = FORMS[reg?.radicalNo ?? ""];
    const withVote = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
      typeTolerance: 34,
    });
    expect(withVote).toBeTruthy();
    expect(withVote?.method).toBe("vote");

    // 不给偏旁形就只剩模板法
    const templateOnly = resolveStructure(glyph, radicalGlyph);
    expect(templateOnly).toBeTruthy();
    expect(templateOnly?.method).toBe("template");
  });
});

describe("标注集本身", () => {
  it("结构符都是合法的 IDS 符号", () => {
    const valid = new Set(["⿰", "⿱", "⿲", "⿳", "⿴", "⿵", "⿶", "⿷", "⿸", "⿹", "⿺", "⿻", "⿼"]);
    for (const [char, code] of [...LABELED, ...SELF_RADICAL_COMPOUND]) {
      expect(valid.has(code), `${char} 的标注「${code}」不合法`).toBe(true);
    }
  });

  it("三个分组互不重叠", () => {
    const a = new Set(LABELED.map(([c]) => c));
    for (const c of SELF_RADICAL) expect(a.has(c), `${c} 同时出现在两组里`).toBe(false);
    for (const [c] of SELF_RADICAL_COMPOUND) expect(a.has(c), `${c} 同时出现在两组里`).toBe(false);
  });
});
