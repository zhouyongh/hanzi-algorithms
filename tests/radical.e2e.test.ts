/**
 * 端到端验证：在**真实字形**上跑 A1 部首定位。
 *
 * 字形来自 `assets/glyphs/`（由 `tools/sync_glyphs.ts` 从兄弟仓库同步，
 * 不在版本库里）。没有字形时整组测试跳过——这样 CI 不依赖本机素材。
 *
 * 期望值是**人工目视核验**过的（渲染出来看哪个高亮的是部首），
 * 核验图由 `tools/diag_split2.ts` / `tools/diag_ascii.ts` 生成。
 *
 * 这里跑的是 `resolveStructure`——库的**默认行为**（投票优先、判不出回退模板），
 * 不是单独的模板匹配。单独模板法在「眼」「語」上会挑错部件：
 * 小篆的「艮」里本来就含一个「目」形的框，形状上分不开；
 * 「語」的「言」在左边，模板法却落到右边的「吾」上。
 * 偏旁形投票法（拿这个部**在合体字里惯用的写法**去比）才分得开。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";
import { resolveStructure } from "../src/structure/resolve.ts";
import { GlyphStore, loadSealRegistry } from "../tools/lib/store.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets", "glyphs");
const hasAssets = existsSync(join(ASSETS, "seal", "index.csv"));

/** 部首的偏旁形（由 `tools/build_radical_forms.ts` 归纳，不入库）。 */
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> = (() => {
  const p = join(ROOT, "assets", "index", "radical-forms.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
})();

/** 期望：说文部 → 该字里属于部首的 `<path>` 下标。 */
const CASES: Array<{ char: string; radicalNo: string; paths: number[] }> = [
  { char: "投", radicalNo: "441", paths: [0] },
  { char: "指", radicalNo: "441", paths: [0] },
  { char: "持", radicalNo: "441", paths: [1] },
  { char: "想", radicalNo: "408", paths: [0] },
  { char: "好", radicalNo: "443", paths: [0] },
  { char: "如", radicalNo: "443", paths: [0] },
  // 「河」的氵是三笔（x 居左 10%/14%/34%），但摹本把中间那一长笔拆成了两段，
  // 所以部首占 4 条路径：0、3、4、5。
  { char: "河", radicalNo: "410", paths: [0, 3, 4, 5] },
  // 「眼」= ⿰目艮：路径 0 是「艮」（带𧘇的腿），路径 1 是「目」。
  { char: "眼", radicalNo: "99", paths: [1] },
  // 「語」= ⿰言吾：言在左，是路径 0 与 3；吾在右，是路径 1 与 2。
  { char: "語", radicalNo: "56", paths: [0, 3] },
  { char: "明", radicalNo: "239", paths: [0, 1, 2] },
  { char: "本", radicalNo: "206", paths: [0] },
];

describe.skipIf(!hasAssets)("部首定位（真实字形）", () => {
  const store = new GlyphStore(ASSETS);
  const registry = loadSealRegistry(ASSETS);
  const regByCp = new Map(registry.map((r) => [r.codepoint, r]));

  it("说文 540 部在复合字里定位正确", () => {
    const seal = store.index("seal");
    const failures: string[] = [];

    for (const c of CASES) {
      const row = seal.byChar(c.char);
      expect(row, `仓内没有「${c.char}」`).toBeTruthy();
      if (!row) continue;
      const sealCp = row.codepoint || row.glyphId;
      const reg = regByCp.get(sealCp);
      expect(reg, `「${c.char}」没有说文部登记`).toBeTruthy();
      if (!reg) continue;
      expect(reg.radicalNo, `「${c.char}」的说文部不对`).toBe(c.radicalNo);

      const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
      expect(radicalRow, `部首字形 ${reg.radicalCp} 缺失`).toBeTruthy();
      if (!radicalRow) continue;
      const glyph = store.glyph("seal", row.file);
      const radicalGlyph = store.glyph("seal", radicalRow.file);
      expect(glyph).toBeTruthy();
      expect(radicalGlyph).toBeTruthy();
      if (!glyph || !radicalGlyph) continue;

      const forms = FORMS[reg.radicalNo];
      const resolved = resolveStructure(glyph, radicalGlyph, {
        radicalTypes: forms?.types ?? [],
      });
      expect(resolved, `「${c.char}」没有给出结果`).toBeTruthy();
      if (!resolved) continue;

      const got = [...resolved.match.pathIndices].sort((a, b) => a - b);
      const want = [...c.paths].sort((a, b) => a - b);
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        failures.push(`${c.char}: 期望 ${want.join(",")} 实得 ${got.join(",")}（ncc=${resolved.match.score.toFixed(3)}）`);
      }
    }

    expect(failures, `部首定位失败：\n${failures.join("\n")}`).toEqual([]);
  });

  it("构形分解能给出结构符", () => {
    const seal = store.index("seal");
    const row = seal.byChar("想");
    expect(row).toBeTruthy();
    if (!row) return;
    const sealCp = row.codepoint || row.glyphId;
    const reg = regByCp.get(sealCp);
    const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = store.glyph("seal", radicalRow?.file ?? "");
    expect(glyph && radicalGlyph).toBeTruthy();
    if (!glyph || !radicalGlyph) return;

    const m = locateRadical(glyph, radicalGlyph);
    expect(m).toBeTruthy();
    if (!m) return;
    const dec = decompose(glyph, m, radicalGlyph);
    // 「想」= ⿱相心：版面是上下结构；说文部首「心」在下，
    // 方位由 radicalSide 单独说（结构符按 IDS 版面语义给）。
    expect(dec.structure).toBe("⿱");
    expect(dec.radicalSide).toBe("bottom");
    expect(dec.meaning).toContain("上下");
  });

  it("默认按墨迹取景，命中的是真部件而不是被裁掉的巧合", () => {
    const seal = store.index("seal");
    const row = seal.byChar("語");
    expect(row).toBeTruthy();
    if (!row) return;
    const sealCp = row.codepoint || row.glyphId;
    const reg = regByCp.get(sealCp);
    const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = store.glyph("seal", radicalRow?.file ?? "");
    expect(glyph && radicalGlyph).toBeTruthy();
    if (!glyph || !radicalGlyph) return;

    // 这条测试把两种取景的差别钉住：换取景不该悄悄换答案。
    // 「語」的「言」在左边：ink 取景命中右边的「吾」的一部分（错），
    // viewBox 取景命中另一处（也错）——真正的「言」由偏旁形投票法找到。
    const ink = locateRadical(glyph, radicalGlyph);
    const vb = locateRadical(glyph, radicalGlyph, { frame: "viewBox" });
    expect(ink).toBeTruthy();
    expect(vb).toBeTruthy();
    expect(ink?.pathIndices).not.toEqual(vb?.pathIndices);

    // 库的默认行为（投票优先）能找到左边那两笔。
    const forms = FORMS[reg?.radicalNo ?? ""];
    const resolved = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
    });
    expect(resolved?.match.pathIndices.sort()).toEqual([0, 3]);
  });
});
