/**
 * E 类教学算法的测试。
 *
 * 描红评分、形声分析这类算法「看着对」很容易，必须用可验证的断言钉住：
 * 自己跟自己比应当满分，抄错字应当低分，笔顺搞反应当被查出来。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg } from "../src/glyph.ts";
import { buildTraceTemplate, traceTemplateToSvg } from "../src/teaching/trace.ts";
import { evaluateTracing } from "../src/teaching/evaluate.ts";
import { GlyphIndex, groupByRadical, radicalFrequency } from "../src/teaching/search.ts";
import { analyzePhonetic, phonoSemanticStats } from "../src/teaching/phonetic.ts";
import { strokeStats, checkStrokeOrder } from "../src/teaching/stats.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "seal.json"));

function loadIndex(layer: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"));
}
function loadRadicals(): Record<string, [number, string, string]> {
  return JSON.parse(readFileSync(join(ASSETS, "index", "seal-radicals.json"), "utf8"));
}
function loadGlyph(layer: string, file: string) {
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8"));
}

/** 造一个字形：若干条独立的折线（描边型）。 */
function synthGlyph(strokes: Array<Array<[number, number]>>, width = 100, height = 100) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`
    + strokes
      .map((pts) => {
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
        return `<path d="${d}" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
      })
      .join("")
    + "</svg>";
  return parseGlyphSvg(svg);
}

describe("E1 描红底本", () => {
  it("描边型字形：每一笔是一条加粗的折线", () => {
    const g = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const tpl = buildTraceTemplate(g, { widthScale: 2 });
    expect(tpl.kind).toBe("skeleton");
    expect(tpl.strokes.length).toBe(2);
    expect(tpl.strokes[0].kind).toBe("stroke");
    expect(tpl.strokes[0].width).toBeCloseTo(8, 0);   // 原笔宽 4 × 2
    expect(tpl.strokes[0].points.length).toBe(2);
    expect(tpl.order).toEqual([0, 1]);
  });

  it("填充型字形：每一笔是一条闭合轮廓", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
      + `<path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" fill="#111"/></svg>`;
    const g = parseGlyphSvg(svg);
    const tpl = buildTraceTemplate(g);
    expect(tpl.kind).toBe("outline");
    expect(tpl.strokes[0].kind).toBe("fill");
    expect(tpl.strokes[0].subpaths.length).toBe(1);
  });

  it("能出 SVG 片段", () => {
    const g = synthGlyph([[[10, 10], [90, 10]]]);
    const svg = traceTemplateToSvg(buildTraceTemplate(g));
    expect(svg).toContain("<path");
    expect(svg).toContain("M 10.00,10.00 L 90.00,10.00");
  });
});

describe("E2 描红评分", () => {
  it("自己跟自己比：得分接近满分", () => {
    const g = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const r = evaluateTracing(g, g);
    expect(r.iou).toBeGreaterThan(0.95);
    expect(r.score).toBeGreaterThan(0.9);
    expect(r.correct).toBe(2);
    expect(r.total).toBe(2);
    expect(r.extraStrokes).toEqual([]);
  });

  it("写偏了：得分明显下降", () => {
    const target = synthGlyph([[[10, 10], [90, 10]]]);
    const shifted = synthGlyph([[[10, 60], [90, 60]]]);
    const same = evaluateTracing(target, target);
    const diff = evaluateTracing(target, shifted);
    expect(diff.score).toBeLessThan(same.score - 0.3);
  });

  it("逐笔得分能指出哪一笔最差", () => {
    const target = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const attempt = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 70], [50, 95]],
    ]);
    const r = evaluateTracing(target, attempt);
    expect(r.strokes.length).toBe(2);
    expect(r.strokes[0].score).toBeGreaterThan(r.strokes[1].score);
    expect(r.worstStroke).toBe(1);
  });
});

describe("E3 字表检索", () => {
  const entries = [
    { char: "投", script: "seal" as const, strokes: 7, radicalNo: 441, structure: "⿰" as const },
    { char: "指", script: "seal" as const, strokes: 9, radicalNo: 441, structure: "⿰" as const },
    { char: "明", script: "seal" as const, strokes: 8, radicalNo: 239, structure: "⿴" as const },
    { char: "天", script: "oracle" as const, strokes: 4, radicalNo: 12 },
  ];
  const index = new GlyphIndex(entries);

  it("按部首查字", () => {
    expect(index.byRadical(441).map((e) => e.char)).toEqual(["投", "指"]);
    expect(index.byRadical(999)).toEqual([]);
  });

  it("按笔画数与区间查字", () => {
    expect(index.query({ strokes: 8 }).map((e) => e.char)).toEqual(["明"]);
    expect(index.query({ strokesRange: [4, 8] }).map((e) => e.char)).toEqual(["投", "明", "天"]);
  });

  it("按书体与结构查字", () => {
    expect(index.query({ script: "oracle" }).map((e) => e.char)).toEqual(["天"]);
    expect(index.query({ structure: "⿰" }).map((e) => e.char)).toEqual(["投", "指"]);
  });

  it("组合条件是「与」", () => {
    expect(index.query({ radicalNo: 441, strokes: 9 }).map((e) => e.char)).toEqual(["指"]);
    expect(index.query({ radicalNo: 441, strokes: 3 })).toEqual([]);
  });

  it("limit 截断结果", () => {
    expect(index.query({ radicalNo: 441, limit: 1 }).map((e) => e.char)).toEqual(["投"]);
  });

  it("按部首分组与频次统计", () => {
    const groups = groupByRadical(index);
    expect(groups.map((g) => g.radicalNo)).toEqual([12, 239, 441]);
    const freq = radicalFrequency(index);
    expect(freq[0]).toEqual({ radicalNo: 441, count: 2 });
  });
});

describe("E4 形声分析", () => {
  it("独体字不作形声分析", () => {
    const g = synthGlyph([[[10, 10], [90, 10]]]);
    const decomposition = {
      structure: "⿻" as const,
      meaning: "独体字",
      radicalPathIndices: [0],
      remainderPathIndices: [],
      radicalBounds: { x: 0, y: 0, width: 0, height: 0 },
      remainderBounds: { x: 0, y: 0, width: 0, height: 0 },
      confidence: 0.5,
    };
    const a = analyzePhonetic(decomposition, null);
    expect(a.isPhonoSemantic).toBe(false);
    expect(a.phonetic.pathIndices).toEqual([]);
  });

  it("左右结构：形符在左，声符在右", () => {
    const decomposition = {
      structure: "⿰" as const,
      meaning: "左右结构",
      radicalPathIndices: [0],
      remainderPathIndices: [1],
      radicalBounds: { x: 0, y: 0, width: 0, height: 0 },
      remainderBounds: { x: 0, y: 0, width: 0, height: 0 },
      confidence: 0.5,
    };
    const a = analyzePhonetic(decomposition, {
      pathIndices: [0], score: 0.9, precision: 0.8, coverage: 0.7, iou: 0.6,
      box: { x: 0, y: 0, width: 1, height: 1 }, fx: 1, fy: 1, resolution: 128,
      perPath: [],
    }, { radicalChar: "手", phoneticChar: "殳" });
    expect(a.isPhonoSemantic).toBe(true);
    expect(a.semantic.side).toBe("left");
    expect(a.semantic.pathIndices).toEqual([0]);
    expect(a.phonetic.side).toBe("right");
    expect(a.phonetic.pathIndices).toEqual([1]);
    expect(a.confidence).toBeGreaterThan(0.6);
    expect(a.basis).toContain("手");
    expect(a.basis).toContain("殳");
  });

  it("统计形声字比例", () => {
    const stats = phonoSemanticStats([
      { isPhonoSemantic: true, confidence: 0.8, basis: "常见" },
      { isPhonoSemantic: true, confidence: 0.5, basis: "相反" },
      { isPhonoSemantic: false, confidence: 0.2, basis: "独体" },
    ]);
    expect(stats.total).toBe(3);
    expect(stats.phonoSemantic).toBe(2);
    expect(stats.ratio).toBeCloseTo(2 / 3, 5);
    expect(stats.conventionalRatio).toBeCloseTo(0.5, 5);
  });
});

describe("E5 笔画统计与笔顺检查", () => {
  it("笔画数与长度统计", () => {
    const g = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const s = strokeStats(g);
    expect(s.count).toBe(2);
    expect(s.totalLength).toBeCloseTo(80 + 70, 0);
    expect(s.longestLength).toBeCloseTo(80, 0);
    expect(s.meanLength).toBeCloseTo(75, 0);
    expect(s.directionHistogram.reduce((a, b) => a + b, 0)).toBe(2);
    expect(s.lengthRatio.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("方向直方图区分横与竖", () => {
    const g = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const s = strokeStats(g);
    // 横向与纵向各占一箱
    const used = s.directionHistogram.filter((n) => n > 0);
    expect(used.length).toBe(2);
  });

  it("笔顺检查：正确的顺序通过", () => {
    const g = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 20], [50, 90]],
    ]);
    const r = checkStrokeOrder(g, [0, 1]);
    // 两笔不相接，「三」那样的独立笔画也是合法的
    expect(r.ok).toBe(true);
  });

  it("笔顺写反要扣分", () => {
    // 逐笔得分按**形状**算，所以两笔的形状写反了也拿满分——对描红教学是漏洞。
    const target = synthGlyph([
      [[10, 10], [90, 10]],
      [[50, 60], [50, 95]],
    ]);
    const swapped = synthGlyph([
      [[50, 60], [50, 95]],
      [[10, 10], [90, 10]],
    ]);
    const same = evaluateTracing(target, target);
    const wrong = evaluateTracing(target, swapped);
    expect(same.orderCorrect).toBe(true);
    expect(wrong.orderCorrect).toBe(false);
    expect(wrong.orderNote).toContain("笔顺");
    expect(wrong.score).toBeLessThan(same.score);
  });

  it("笔顺检查：长度不符直接判错", () => {
    const g = synthGlyph([[[10, 10], [90, 10]]]);
    const r = checkStrokeOrder(g, [0, 1]);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("不符");
  });

  it("笔顺检查：骨架字的笔画彼此独立不算笔序错", () => {
    // 甲骨骨架的字形是「一 stroke 一 path」，文件顺序**就是**落笔顺序；
    // 笔画之间不衔接是常态，推不出「笔序有误」。
    const g = synthGlyph([
      [[10, 10], [14, 10]],
      [[60, 60], [64, 60]],
    ]);
    const r = checkStrokeOrder(g, [0, 1]);
    expect(r.ok).toBe(true);
    expect(r.reason).not.toContain("笔序可能有误");
    expect(r.reason).toContain("骨架");
  });
});

describe.skipIf(!hasAssets)("E 类算法在真实字形上", () => {
  it("「投」的形声分析：手为形符，殳为声符", () => {
    const index = loadIndex("seal");
    const radicals = loadRadicals();
    const file = index["投"];
    const cp = file.replace(/\.svg$/, "");
    const reg = radicals[cp];
    const glyph = loadGlyph("seal", file);
    const radicalGlyph = loadGlyph("seal", `${reg[1]}.svg`);
    const match = locateRadical(glyph, radicalGlyph);
    expect(match).toBeTruthy();
    const dec = decompose(glyph, match!, radicalGlyph);
    const a = analyzePhonetic(dec, match, { radicalChar: radicals[reg[1]]?.[2] });
    expect(a.isPhonoSemantic).toBe(true);
    expect(a.semantic.pathIndices).toEqual(match!.pathIndices);
    expect(a.phonetic.side).toBe("right");
  });

  it("描红：拿甲骨骨架当范字，原样描一遍得满分", () => {
    const index = loadIndex("oracle");
    const file = index["天"];
    expect(file).toBeTruthy();
    const glyph = loadGlyph("oracle", file);
    const r = evaluateTracing(glyph, glyph);
    expect(r.iou).toBeGreaterThan(0.9);
    expect(r.correct).toBe(r.total);
    expect(r.total).toBe(6);
  });

  it("笔画统计与索引里的笔画数一致", () => {
    const index = loadIndex("seal");
    const file = index["明"];
    const glyph = loadGlyph("seal", file);
    const s = strokeStats(glyph);
    expect(s.count).toBe(glyph.paths.length);
    expect(s.count).toBe(3);
  });
});
