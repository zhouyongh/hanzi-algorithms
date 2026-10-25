/**
 * C1 跨书体笔画对应的测试。
 *
 * 这个模块把两个字形各自光栅化，再按「墨量重叠」配对。原先记在案的两处坑
 * 已经修掉，用例改成正常断言：
 *
 * 1. **配对是一对一**（原先是缺陷 P1）：`usedTo` 只记不用，目标笔画会被配多次；
 * 2. **先归一化再比**（原先是缺陷 P2）：文档写的是「按墨迹外接框等比居中到
 *    同一张画布」，实现却各按自己的 `viewBox` 光栅化，画布大小/留白不同的
 *    两个书体根本不在同一个坐标系里。
 *
 * 每条修好的缺陷都在下面留了对应用例，注释里写明「原来是缺陷 Px」。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg, type Glyph } from "../src/glyph.ts";
import { boundsOf, type Rect, type SubPath } from "../src/geometry/path.ts";
import { countInk, inkBounds, rasterizeGlyph } from "../src/raster/mask.ts";
import { apply } from "../src/geometry/transform.ts";
import { correspondStrokes, normalizeToFrame } from "../src/morph/correspond.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "oracle.json"));

/** 造一个字形（每条路径一条子路径，填充型）。 */
function makeGlyph(subpaths: SubPath[], viewBox: Rect = { x: 0, y: 0, width: 100, height: 100 }): Glyph {
  const paths = subpaths.map((sp) => ({
    subpaths: [sp],
    strokeWidth: 0,
    filled: true,
    bounds: boundsOf([sp]),
  }));
  return { viewBox, paths, bounds: boundsOf(subpaths) };
}

/** 一个矩形轮廓（填得出墨量）。 */
function rect(x0: number, y0: number, x1: number, y1: number): SubPath {
  return [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
}

/** 真实字形：读 assets/index 的索引 + assets/glyphs 的 SVG。 */
function loadGlyph(layer: string, char: string): Glyph | null {
  const index = JSON.parse(
    readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"),
  ) as Record<string, string>;
  const file = index[char];
  if (!file) return null;
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8"));
}

describe("C1 correspondStrokes：跨书体笔画对应", () => {
  it("正常路径：位置相近的两笔各自配上，confidence 是 overlap 的均值", () => {
    const from = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90)]);
    const to = makeGlyph([rect(12, 12, 42, 42), rect(62, 62, 92, 92)]);
    const r = correspondStrokes(from, to);

    expect(r.pairs.length).toBe(2);
    expect(r.pairs.map((p) => [p.from, p.to])).toEqual([[0, 0], [1, 1]]);
    expect(r.unmatchedFrom).toEqual([]);
    expect(r.unmatchedTo).toEqual([]);
    expect(r.pairs[0].overlap).toBeGreaterThan(0.8);
    expect(r.confidence).toBeCloseTo(
      r.pairs.reduce((s, p) => s + p.overlap, 0) / r.pairs.length,
      10,
    );
  });

  it("正常路径：源多目标少 → 只配上一对，多出来的源笔画进 unmatchedFrom", () => {
    // 目标只有一笔时，归一化后它占满整个画布，源的两笔都完整落在它里面
    // （overlap 相同），所以只能配一对——另一笔进 unmatchedFrom。
    const from = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90)]);
    const to = makeGlyph([rect(60, 60, 90, 90)]);
    const r = correspondStrokes(from, to);

    expect(r.pairs.length).toBe(1);
    expect(r.unmatchedFrom.length).toBe(1);
    // 配上的那一笔不在 unmatchedFrom 里
    expect(r.unmatchedFrom).not.toContain(r.pairs[0].from);
    expect(r.pairs.length + r.unmatchedFrom.length).toBe(from.paths.length);
    // 唯一被用掉的目标不算「没被覆盖」
    expect(r.unmatchedTo).toEqual([]);
  });

  it("正常路径：目标多出来的一笔进 unmatchedTo", () => {
    const from = makeGlyph([rect(10, 10, 40, 40)]);
    const to = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90)]);
    const r = correspondStrokes(from, to);

    expect(r.pairs.length).toBe(1);
    expect(r.unmatchedFrom).toEqual([]);
    expect(r.unmatchedTo).toEqual([1]);
  });

  it("参数：minOverlap 调高 → 低重叠的配对被撤掉，退回 unmatched", () => {
    // 源是一整块方块，目标是上下两半：归一化后源占满画布、目标各占一半，
    // 最好的一条也只有 0.5 的重叠——这样阈值才真的卡得住。
    const from = makeGlyph([rect(10, 10, 40, 40)]);
    const to = makeGlyph([rect(10, 10, 40, 25), rect(10, 25, 40, 40)]);
    expect(correspondStrokes(from, to).pairs.length).toBe(1);
    const strict = correspondStrokes(from, to, { minOverlap: 0.99 });
    expect(strict.pairs.length).toBe(0);
    expect(strict.unmatchedFrom).toEqual([0]);
    expect(strict.confidence).toBe(0);
  });

  it("参数：分辨率调小仍能配对", () => {
    const from = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90)]);
    const to = makeGlyph([rect(12, 12, 42, 42), rect(62, 62, 92, 92)]);
    const r = correspondStrokes(from, to, { resolution: 32 });
    expect(r.pairs.length).toBe(2);
  });

  it("不变量：每一笔源笔画要么被配上、要么进 unmatchedFrom，不重不漏", () => {
    const from = makeGlyph([
      rect(10, 10, 40, 40), rect(60, 60, 90, 90), rect(10, 60, 40, 90),
    ]);
    const to = makeGlyph([rect(12, 12, 42, 42)]);
    const r = correspondStrokes(from, to);

    expect(r.pairs.length + r.unmatchedFrom.length).toBe(from.paths.length);
    // 一个源笔画不会被配两次
    expect(new Set(r.pairs.map((p) => p.from)).size).toBe(r.pairs.length);
    // unmatchedFrom 里的下标不在 pairs 里
    for (const f of r.unmatchedFrom) expect(r.pairs.some((p) => p.from === f)).toBe(false);
  });

  it("不变量：unmatchedTo 是目标下标的子集且不重复", () => {
    const from = makeGlyph([rect(10, 10, 40, 40)]);
    const to = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90), rect(10, 60, 40, 90)]);
    const r = correspondStrokes(from, to);
    expect(new Set(r.unmatchedTo).size).toBe(r.unmatchedTo.length);
    for (const t of r.unmatchedTo) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(to.paths.length);
    }
    // 被配上的目标不进 unmatchedTo
    for (const p of r.pairs) expect(r.unmatchedTo).not.toContain(p.to);
  });

  it("确定性：同样的输入跑两遍，结果完全一致", () => {
    const from = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90)]);
    const to = makeGlyph([rect(12, 12, 42, 42), rect(62, 62, 92, 92)]);
    expect(JSON.stringify(correspondStrokes(from, to)))
      .toBe(JSON.stringify(correspondStrokes(from, to)));
  });

  it("边界：单笔对单笔", () => {
    const from = makeGlyph([rect(10, 10, 40, 40)]);
    const to = makeGlyph([rect(10, 10, 40, 40)]);
    const r = correspondStrokes(from, to);
    expect(r.pairs.length).toBe(1);
    expect(r.pairs[0].overlap).toBeCloseTo(1, 2);
    expect(r.pairs[0].coverage).toBeCloseTo(1, 2);
  });

  it("边界：零墨量的路径（退化多边形）→ 进 unmatchedFrom", () => {
    // 水平线段填充后面积为 0，光栅化出来没有墨
    const from = makeGlyph([[{ x: 10, y: 10 }, { x: 30, y: 10 }]]);
    const to = makeGlyph([rect(10, 10, 40, 40)]);
    const r = correspondStrokes(from, to);
    expect(r.pairs.length).toBe(0);
    expect(r.unmatchedFrom).toEqual([0]);
  });

  it("边界：viewBox 恰好等于墨迹范围", () => {
    const from = makeGlyph([rect(10, 10, 40, 40)], { x: 10, y: 10, width: 30, height: 30 });
    const to = makeGlyph([rect(10, 10, 40, 40)], { x: 10, y: 10, width: 30, height: 30 });
    const r = correspondStrokes(from, to);
    expect(r.pairs.length).toBe(1);
    expect(r.pairs[0].overlap).toBeGreaterThan(0.9);
  });

  it("退化：空字形 → 无配对，confidence 为 0，不抛异常", () => {
    const empty = makeGlyph([]);
    const solid = makeGlyph([rect(10, 10, 40, 40)]);
    const a = correspondStrokes(empty, solid);
    expect(a.pairs).toEqual([]);
    expect(a.unmatchedFrom).toEqual([]);
    expect(a.unmatchedTo).toEqual([0]);
    expect(a.confidence).toBe(0);

    const b = correspondStrokes(solid, empty);
    expect(b.pairs).toEqual([]);
    expect(b.unmatchedFrom).toEqual([0]);
    expect(b.unmatchedTo).toEqual([]);
    expect(b.confidence).toBe(0);
  });

  it("退化：两边都是空字形 → 不抛异常", () => {
    const r = correspondStrokes(makeGlyph([]), makeGlyph([]));
    expect(r.pairs).toEqual([]);
    expect(r.confidence).toBe(0);
  });

  it("退化：NaN / Infinity 坐标 → 不抛异常", () => {
    const from = makeGlyph([[{ x: 10, y: 10 }, { x: Number.NaN, y: 20 }, { x: 30, y: 30 }]]);
    const to = makeGlyph([rect(10, 10, 40, 40)]);
    expect(() => correspondStrokes(from, to)).not.toThrow();
    expect(() => correspondStrokes(to, from)).not.toThrow();
  });

  it("退化：负坐标 / 超大坐标 → 不抛异常", () => {
    const neg = makeGlyph([rect(-500, -500, -400, -400)]);
    const huge = makeGlyph([rect(-1e12, -1e12, 1e12, 1e12)]);
    expect(() => correspondStrokes(neg, huge)).not.toThrow();
    expect(() => correspondStrokes(huge, neg)).not.toThrow();
  });

  it("退化：分辨率取 0 或 1 → 不抛异常", () => {
    const from = makeGlyph([rect(10, 10, 40, 40)]);
    const to = makeGlyph([rect(10, 10, 40, 40)]);
    expect(() => correspondStrokes(from, to, { resolution: 0 })).not.toThrow();
    expect(() => correspondStrokes(from, to, { resolution: 1 })).not.toThrow();
  });

  it("缺陷 P1（已修）：同一个目标笔画不会被配多次——配对严格一对一", () => {
    // 原来是缺陷 P1：`usedTo` 集合只记不用，内层循环没跳过已被占用的目标，
    // 于是两条源笔画都配到同一条目标笔画上（pairs = [[0,0],[1,0]]）。
    const to = makeGlyph([rect(10, 10, 90, 90)]);
    const from = makeGlyph([rect(20, 25, 80, 35), rect(20, 55, 80, 65)]);
    const r = correspondStrokes(from, to);

    // 一个目标笔画最多被一个源笔画配
    expect(new Set(r.pairs.map((p) => p.to)).size).toBe(r.pairs.length);
    // 配不上的源笔画进 unmatchedFrom，不许悄悄丢掉
    expect(r.pairs.length + r.unmatchedFrom.length).toBe(from.paths.length);
    expect(r.pairs.length).toBe(1);
    expect(r.unmatchedFrom.length).toBe(1);
    expect(r.unmatchedFrom).not.toContain(r.pairs[0].from);
  });

  it("缺陷 P1（已修）：配对数不超过两边笔画数的较小者", () => {
    const from = makeGlyph([rect(10, 10, 40, 40), rect(60, 60, 90, 90), rect(10, 60, 40, 90)]);
    const to = makeGlyph([rect(12, 12, 42, 42), rect(62, 12, 92, 42)]);
    const r = correspondStrokes(from, to);
    expect(r.pairs.length).toBeLessThanOrEqual(Math.min(from.paths.length, to.paths.length));
    expect(new Set(r.pairs.map((p) => p.from)).size).toBe(r.pairs.length);
    expect(new Set(r.pairs.map((p) => p.to)).size).toBe(r.pairs.length);
  });

  it("缺陷 P2（已修）：按墨迹外接框归一化——同一个形状换个位置也配得上", () => {
    // 原来是缺陷 P2：文档说「把两个字形各自按墨迹外接框等比居中到同一张画布」，
    // 实现却各按自己的 viewBox 光栅化，画布没对齐，同样的方块换个位置就配不上
    // （pairs = []、confidence = 0）。
    const a = makeGlyph([rect(10, 10, 30, 30)]);
    const b = makeGlyph([rect(60, 60, 80, 80)]);
    const r = correspondStrokes(a, b);
    expect(r.pairs.length).toBe(1);
    expect(r.pairs[0].overlap).toBeGreaterThan(0.9);
    expect(r.confidence).toBeGreaterThan(0.9);
    expect(r.unmatchedFrom).toEqual([]);
    expect(r.unmatchedTo).toEqual([]);
  });

  it("缺陷 P2（已修）：viewBox 大小不同也一样——归一化看的是墨迹不是画布", () => {
    // 篆书层的 viewBox 是 0 0 400 400，甲骨层是 0 0 21 19：
    // 画布口径不同不该影响「这两个形状是不是同一个」。
    const a = makeGlyph([rect(10, 10, 30, 30)], { x: 0, y: 0, width: 100, height: 100 });
    const b = makeGlyph([rect(60, 60, 80, 80)], { x: 0, y: 0, width: 400, height: 400 });
    const r = correspondStrokes(a, b);
    expect(r.pairs.length).toBe(1);
    expect(r.pairs[0].overlap).toBeGreaterThan(0.9);
  });
});

describe("C1 normalizeToFrame：归一化到统一画布", () => {
  it("墨迹外接框被等比映射到 0.92 画布，缩放是均匀的", () => {
    const glyph = makeGlyph([rect(20, 20, 60, 40)]);
    const res = 200;
    const { mask, matrix } = normalizeToFrame(glyph, res);

    expect(matrix.a).toBeCloseTo(matrix.d, 12);
    expect(matrix.b).toBe(0);
    expect(matrix.c).toBe(0);
    expect(matrix.a).toBeCloseTo((res * 0.92) / Math.max(mask.width, mask.height), 10);
  });

  it("墨迹中心落在画布中心", () => {
    const glyph = makeGlyph([rect(20, 20, 60, 40)]);
    const res = 200;
    const { matrix } = normalizeToFrame(glyph, res);
    const raw = rasterizeGlyph(glyph.paths.flatMap((p) => p.subpaths), {
      width: res, height: res, viewBox: glyph.viewBox,
    });
    const b = inkBounds(raw);
    expect(b).toBeTruthy();
    if (!b) return;
    const center = apply(matrix, {
      x: (b.x0 + b.x1 + 1) / 2,
      y: (b.y0 + b.y1 + 1) / 2,
    });
    expect(center.x).toBeCloseTo(res * 0.46, 6);
    expect(center.y).toBeCloseTo(res * 0.46, 6);
  });

  it("确定性：跑两遍结果一致", () => {
    const glyph = makeGlyph([rect(20, 20, 60, 40)]);
    const a = normalizeToFrame(glyph, 200);
    const b = normalizeToFrame(glyph, 200);
    expect(JSON.stringify(a.matrix)).toBe(JSON.stringify(b.matrix));
    expect(countInk(a.mask)).toBe(countInk(b.mask));
  });

  it("退化：空字形 → 不抛异常", () => {
    expect(() => normalizeToFrame(makeGlyph([]), 200)).not.toThrow();
    const { mask, matrix } = normalizeToFrame(makeGlyph([]), 200);
    expect(countInk(mask)).toBe(0);
    expect(Number.isFinite(matrix.a)).toBe(true);
  });

  it("已知偏差：取景与 normalizeGlyph 不一致——少了 4% 的内缩", () => {
    // interpolate.ts 的 normalizeGlyph 用 box = {x: 0.04res, y: 0.04res, ...}，
    // 墨迹中心落在 0.5res；normalizeToFrame 的 box 从 0 起，中心落在 0.46res。
    // 同一个字形用两套归一化会差 4% 的画布，混用时会对不齐。
    // （correspondStrokes 自己走的是字形坐标系的归一化，取景与 normalizeGlyph 一致，
    //  这个偏差只影响直接用 normalizeToFrame 的调用方。）
    const glyph = makeGlyph([rect(20, 20, 60, 40)]);
    const res = 200;
    const { matrix } = normalizeToFrame(glyph, res);
    const raw = rasterizeGlyph(glyph.paths.flatMap((p) => p.subpaths), {
      width: res, height: res, viewBox: glyph.viewBox,
    });
    const b = inkBounds(raw);
    expect(b).toBeTruthy();
    if (!b) return;
    const center = apply(matrix, {
      x: (b.x0 + b.x1 + 1) / 2,
      y: (b.y0 + b.y1 + 1) / 2,
    });
    expect(center.x).toBeCloseTo(res * 0.46, 6);
    expect(center.x).not.toBeCloseTo(res * 0.5, 3);
  });
});

describe.skipIf(!hasAssets)("C1 真实字形", () => {
  it("甲骨「日」→ 篆书「日」：配上了，confidence 落在合理区间", () => {
    const oracle = loadGlyph("oracle", "日");
    const seal = loadGlyph("seal", "日");
    expect(oracle).toBeTruthy();
    expect(seal).toBeTruthy();
    if (!oracle || !seal) return;

    const r = correspondStrokes(oracle, seal);
    expect(r.pairs.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    // 不变量在真实数据上同样成立
    expect(r.pairs.length + r.unmatchedFrom.length).toBe(oracle.paths.length);
  });

  it("缺陷 P1（已修）：真实数据上同一个目标笔画不会被配多次", () => {
    // 原来是缺陷 P1：甲骨「日」3 笔、篆书「日」1 条轮廓 → 必然多对一
    // （pairs = [[0,0],[1,0]]，那条篆书轮廓被配了两次）。
    const oracle = loadGlyph("oracle", "日");
    const seal = loadGlyph("seal", "日");
    expect(oracle).toBeTruthy();
    expect(seal).toBeTruthy();
    if (!oracle || !seal) return;

    const r = correspondStrokes(oracle, seal);
    const targets = r.pairs.map((p) => p.to);
    expect(new Set(targets).size).toBe(targets.length);
    // 篆书「日」只有一条轮廓 → 最多配上一对，其余源笔画进 unmatchedFrom
    expect(r.pairs.length).toBeLessThanOrEqual(seal.paths.length);
    expect(r.pairs.length).toBe(1);
    expect(r.unmatchedFrom.length).toBe(oracle.paths.length - r.pairs.length);
    expect(r.unmatchedTo).toEqual([]);
  });

  it("确定性：真实字形跑两遍结果一致", () => {
    const oracle = loadGlyph("oracle", "日");
    const clerical = loadGlyph("clerical", "日");
    expect(oracle).toBeTruthy();
    expect(clerical).toBeTruthy();
    if (!oracle || !clerical) return;
    expect(JSON.stringify(correspondStrokes(oracle, clerical)))
      .toBe(JSON.stringify(correspondStrokes(oracle, clerical)));
  });

  it("缺陷 P1/P2（已修）：真实字形上配对严格一对一，且不超过两边的笔画数", () => {
    const chars = ["日", "月", "山", "水", "木", "人", "目", "口"];
    for (const ch of chars) {
      const oracle = loadGlyph("oracle", ch);
      const seal = loadGlyph("seal", ch);
      if (!oracle || !seal) continue;
      const r = correspondStrokes(oracle, seal);
      expect(new Set(r.pairs.map((p) => p.from)).size, `${ch} 源笔画被配了多次`)
        .toBe(r.pairs.length);
      expect(new Set(r.pairs.map((p) => p.to)).size, `${ch} 目标笔画被配了多次`)
        .toBe(r.pairs.length);
      expect(r.pairs.length, `${ch} 配对数超过两边的笔画数`)
        .toBeLessThanOrEqual(Math.min(oracle.paths.length, seal.paths.length));
      expect(r.pairs.length + r.unmatchedFrom.length).toBe(oracle.paths.length);
      expect(r.unmatchedTo.length).toBe(seal.paths.length - r.pairs.length);
    }
  });
});
