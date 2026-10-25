/**
 * A3 笔画切分与笔顺的测试。
 *
 * 本轮的重点是把「异常情况」钉死成可断言的行为——用户抱怨的「异常情况很多」，
 * 大多出在退化输入上：空字形、零长度笔画、NaN 坐标、越界的笔顺。
 *
 * 期望分两类：
 * - **正常行为**（结果长度、笔序语义、几何量）——钉住，不许回归；
 * - **已知缺陷**（用例名里标了「已知缺陷」）——把当前的实际行为记录在案，
 *   修的时候照着改期望值即可，不用再翻 git 历史猜当时是什么样。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg, type Glyph, type GlyphPath } from "../src/glyph.ts";
import { boundsOf, type Rect, type SubPath } from "../src/geometry/path.ts";
import { splitStrokes, strokeCount, strokeOrder, strokesInOrder } from "../src/structure/strokes.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "oracle.json"));

/**
 * 造一条路径。
 *
 * `filled` 的默认推断跟 `parseGlyphSvg` 保持一致：有笔宽即为描边型。
 */
function makePath(
  subpaths: SubPath[],
  opts: { strokeWidth?: number; filled?: boolean } = {},
): GlyphPath {
  const strokeWidth = opts.strokeWidth ?? 0;
  return {
    subpaths,
    strokeWidth,
    filled: opts.filled ?? strokeWidth === 0,
    bounds: boundsOf(subpaths),
  };
}

/** 造一个字形。 */
function makeGlyph(
  paths: GlyphPath[],
  viewBox: Rect = { x: 0, y: 0, width: 100, height: 100 },
): Glyph {
  return { viewBox, paths, bounds: boundsOf(paths.flatMap((p) => p.subpaths)) };
}

/** 描边型字形（甲骨骨架）：每条路径是一条折线。 */
function skeletonGlyph(strokes: SubPath[], strokeWidth = 1.3): Glyph {
  return makeGlyph(strokes.map((sp) => makePath([sp], { strokeWidth })));
}

/** 填充型字形（摹本轮廓）：每条路径是一条闭合轮廓。 */
function outlineGlyph(contours: SubPath[]): Glyph {
  return makeGlyph(contours.map((sp) => makePath([sp])));
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

describe("A3 splitStrokes：切分", () => {
  it("描边型（甲骨骨架）：每笔是折线，长度按折线算，笔宽原样带出", () => {
    const glyph = skeletonGlyph([
      [{ x: 6, y: 4 }, { x: 21, y: 4 }],
      [{ x: 14, y: 4 }, { x: 14, y: 19 }, { x: 10, y: 21 }],
    ]);
    const strokes = splitStrokes(glyph);

    expect(strokes.length).toBe(2);
    expect(strokes.every((s) => s.kind === "skeleton")).toBe(true);
    expect(strokes[0].points).toEqual([{ x: 6, y: 4 }, { x: 21, y: 4 }]);
    expect(strokes[0].length).toBeCloseTo(15, 10);
    expect(strokes[0].strokeWidth).toBe(1.3);
    expect(strokes[0].bounds).toEqual({ x: 6, y: 4, width: 15, height: 0 });
  });

  it("填充型（摹本轮廓）：points 为空，长度按周长算，subpaths 原样带出", () => {
    const square: SubPath = [
      { x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 },
    ];
    const glyph = outlineGlyph([square]);
    const strokes = splitStrokes(glyph);

    expect(strokes.length).toBe(1);
    expect(strokes[0].kind).toBe("outline");
    expect(strokes[0].points).toEqual([]);
    expect(strokes[0].subpaths).toEqual([square]);
    // 已知缺陷：字段注释说「轮廓笔为周长近似」，但闭合轮廓的首尾不重复，
    // polylineLength 只累加相邻点之间的距离，**闭合的那条边没算进去**。
    // 这里 80×80 的方框周长应为 320，实得 240（少一条边）。
    expect(strokes[0].length).toBeCloseTo(240, 10);
    expect(strokes[0].strokeWidth).toBe(0);
  });

  it("结果长度恒等于 paths.length，index 与 pathIndex 一致且连续", () => {
    // 不变量：切分不增不减、不重排
    const cases: Glyph[] = [
      makeGlyph([]),
      skeletonGlyph([[{ x: 0, y: 0 }, { x: 1, y: 1 }]]),
      skeletonGlyph([
        [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        [{ x: 2, y: 2 }, { x: 3, y: 3 }],
        [{ x: 4, y: 4 }, { x: 5, y: 5 }],
      ]),
      outlineGlyph([
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        [{ x: 20, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }],
      ]),
      // 一条路径里有多个子路径（摹本里很常见：外框 + 洞）
      makeGlyph([
        makePath([
          [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
          [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7 }],
        ]),
      ]),
    ];
    for (const glyph of cases) {
      const strokes = splitStrokes(glyph);
      expect(strokes.length).toBe(glyph.paths.length);
      expect(strokeCount(glyph)).toBe(glyph.paths.length);
      strokes.forEach((s, i) => {
        expect(s.index).toBe(i);
        expect(s.pathIndex).toBe(i);
      });
    }
  });

  it("边界：单笔画字形", () => {
    const glyph = skeletonGlyph([[{ x: 10, y: 10 }, { x: 90, y: 10 }]]);
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBe(1);
    expect(strokes[0].length).toBeCloseTo(80, 10);
    expect(strokes[0].angle).toBeCloseTo(0, 10);
  });

  it("边界：路径自闭合（首尾同点）仍算一笔", () => {
    const closed: SubPath = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 },
    ];
    const strokes = splitStrokes(outlineGlyph([closed]));
    expect(strokes.length).toBe(1);
    // 自闭合的折线按点列逐段算长（首尾同点多算一段）
    expect(strokes[0].length).toBeCloseTo(40, 10);
  });

  it("边界：viewBox 恰好等于墨迹范围", () => {
    const glyph = outlineGlyph([
      [{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 90, y: 80 }, { x: 10, y: 80 }],
    ]);
    expect(glyph.bounds).toEqual({ x: 10, y: 20, width: 80, height: 60 });
    const strokes = splitStrokes(glyph);
    expect(strokes[0].bounds).toEqual({ x: 10, y: 20, width: 80, height: 60 });
  });

  it("退化：空 paths 数组 → 空结果，不抛异常", () => {
    const glyph = makeGlyph([]);
    expect(splitStrokes(glyph)).toEqual([]);
    expect(strokeCount(glyph)).toBe(0);
  });

  it("退化：零长度笔画（所有点相同）→ 长度为 0，外接框退化", () => {
    const strokes = splitStrokes(skeletonGlyph([[{ x: 5, y: 5 }, { x: 5, y: 5 }]]));
    expect(strokes.length).toBe(1);
    expect(strokes[0].length).toBe(0);
    expect(strokes[0].bounds).toEqual({ x: 5, y: 5, width: 0, height: 0 });
  });

  it("退化：全零宽高（viewBox 是 0×0）→ 不抛异常", () => {
    const glyph = makeGlyph(
      [makePath([[{ x: 0, y: 0 }, { x: 0, y: 0 }]])],
      { x: 0, y: 0, width: 0, height: 0 },
    );
    expect(() => splitStrokes(glyph)).not.toThrow();
    expect(splitStrokes(glyph).length).toBe(1);
  });

  it("退化：NaN 坐标 → 不抛异常，长度为 NaN（几何量无法定义）", () => {
    const strokes = splitStrokes(
      skeletonGlyph([[{ x: 10, y: 10 }, { x: Number.NaN, y: 20 }, { x: 30, y: 30 }]]),
    );
    expect(strokes.length).toBe(1);
    expect(Number.isNaN(strokes[0].length)).toBe(true);
  });

  it("退化：Infinity 坐标 → 不抛异常", () => {
    const strokes = splitStrokes(
      skeletonGlyph([[{ x: 10, y: 10 }, { x: Number.POSITIVE_INFINITY, y: 20 }]]),
    );
    expect(strokes.length).toBe(1);
    expect(Number.isFinite(strokes[0].length)).toBe(false);
  });

  it("退化：负坐标 → 外接框照算", () => {
    const strokes = splitStrokes(skeletonGlyph([[{ x: -50, y: -30 }, { x: -10, y: -30 }]]));
    expect(strokes[0].bounds).toEqual({ x: -50, y: -30, width: 40, height: 0 });
  });

  it("退化：超大坐标 → 不抛异常", () => {
    const strokes = splitStrokes(
      skeletonGlyph([[{ x: -1e12, y: 1e12 }, { x: 1e12, y: -1e12 }]]),
    );
    expect(strokes.length).toBe(1);
    expect(Number.isFinite(strokes[0].length)).toBe(true);
  });

  it("退化：子路径只有 1 个点 → 不抛异常", () => {
    const strokes = splitStrokes(makeGlyph([makePath([[{ x: 3, y: 4 }]])]));
    expect(strokes.length).toBe(1);
    expect(strokes[0].length).toBe(0);
    expect(strokes[0].bounds).toEqual({ x: 3, y: 4, width: 0, height: 0 });
  });
});

describe("A3 strokeOrder：笔顺序列", () => {
  const glyph = skeletonGlyph([
    [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    [{ x: 0, y: 10 }, { x: 10, y: 10 }],
    [{ x: 0, y: 20 }, { x: 10, y: 20 }],
  ]);

  it("缺省 order → 恒等排列", () => {
    expect(strokeOrder(glyph)).toEqual([0, 1, 2]);
  });

  it("合法 order → 原样返回，且是副本（改动返回值不影响入参）", () => {
    const order = [2, 0, 1];
    const got = strokeOrder(glyph, order);
    expect(got).toEqual([2, 0, 1]);
    got[0] = 99;
    expect(order).toEqual([2, 0, 1]);
  });

  it("非法长度的 order → 回退到恒等排列，不崩", () => {
    expect(strokeOrder(glyph, [1, 0])).toEqual([0, 1, 2]);
    expect(strokeOrder(glyph, [0, 1, 2, 3])).toEqual([0, 1, 2]);
    expect(strokeOrder(glyph, [])).toEqual([0, 1, 2]);
  });

  it("空字形：任何 order 都得到空排列", () => {
    const empty = makeGlyph([]);
    expect(strokeOrder(empty)).toEqual([]);
    expect(strokeOrder(empty, [])).toEqual([]);
    expect(strokeOrder(empty, [1, 2])).toEqual([]);
  });
});

describe("A3 strokesInOrder：按笔顺重排", () => {
  const glyph = skeletonGlyph([
    [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    [{ x: 0, y: 10 }, { x: 10, y: 10 }],
    [{ x: 0, y: 20 }, { x: 10, y: 20 }],
  ]);

  it("缺省 order → 与 splitStrokes 同样顺序", () => {
    const ordered = strokesInOrder(glyph);
    expect(ordered.length).toBe(3);
    expect(ordered.map((s) => s.pathIndex)).toEqual([0, 1, 2]);
  });

  it("给定 order → 按 order 重排，元素仍是原来那批笔画", () => {
    const ordered = strokesInOrder(glyph, [2, 0, 1]);
    expect(ordered.length).toBe(3);
    expect(ordered.map((s) => s.pathIndex)).toEqual([2, 0, 1]);
    // 重排后每笔的 index 与 pathIndex 仍然自洽（index 记的是原始路径下标）
    ordered.forEach((s) => expect(s.index).toBe(s.pathIndex));
  });

  it("不变量：结果与 splitStrokes 是同一个多重集（只是换了顺序）", () => {
    const base = splitStrokes(glyph);
    const ordered = strokesInOrder(glyph, [1, 2, 0]);
    expect([...ordered].sort((a, b) => a.pathIndex - b.pathIndex)).toEqual(base);
  });

  it("order 长度对但下标越界 → 回退到恒等排列，不返回 undefined 元素", () => {
    // 修好的行为：`strokeOrder` 现在校验「是不是 0..n-1 的排列」，
    // 不合法就回退。早先只校验长度，于是 order=[5,5,5] 会让数组里塞进
    // undefined，下游任何一次 stroke.length 都会炸。
    const ordered = strokesInOrder(glyph, [5, 5, 5]);
    expect(ordered.length).toBe(3);
    expect(ordered.every((s) => s !== undefined)).toBe(true);
    expect(ordered.map((s) => s.pathIndex)).toEqual([0, 1, 2]);
  });

  it("order 有重复项 → 也回退到恒等排列", () => {
    const ordered = strokesInOrder(glyph, [1, 1, 2]);
    expect(ordered.map((s) => s.pathIndex)).toEqual([0, 1, 2]);
  });

  it("已知缺陷：重排后 index 仍是原始路径下标，不反映新的笔序位置", () => {
    // 下游若拿 `stroke.index` 当笔号（动画序号），重排后会与数组位置对不上。
    const ordered = strokesInOrder(glyph, [2, 0, 1]);
    expect(ordered.map((s, i) => s.index === i)).toEqual([false, false, false]);
    expect(ordered.map((s) => s.index)).toEqual([2, 0, 1]);
  });
});

describe.skipIf(!hasAssets)("A3 真实字形", () => {
  it("甲骨「天」：6 笔，全是骨架笔，每笔都是折线", () => {
    const glyph = loadGlyph("oracle", "天");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBe(6);
    expect(strokes.every((s) => s.kind === "skeleton")).toBe(true);
    expect(strokes.every((s) => s.points.length >= 2)).toBe(true);
    expect(strokes.every((s) => s.length > 0)).toBe(true);
  });

  it("甲骨「山」：单笔画字形", () => {
    const glyph = loadGlyph("oracle", "山");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBe(1);
    expect(strokes[0].kind).toBe("skeleton");
  });

  it("篆书「明」：3 笔，全是轮廓笔（points 为空）", () => {
    const glyph = loadGlyph("seal", "明");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBe(3);
    expect(strokes.every((s) => s.kind === "outline")).toBe(true);
    expect(strokes.every((s) => s.points.length === 0)).toBe(true);
    expect(strokes.every((s) => s.length > 0)).toBe(true);
  });

  it("隶书「明」：3 笔轮廓，切分结果与路径数一致", () => {
    const glyph = loadGlyph("clerical", "明");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBe(glyph.paths.length);
    expect(strokes.every((s) => s.kind === "outline")).toBe(true);
  });

  it("真实字形上：笔顺序列是恒等排列，按它重排不改变任何一笔", () => {
    const glyph = loadGlyph("oracle", "日");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    expect(strokeOrder(glyph)).toEqual(glyph.paths.map((_, i) => i));
    const ordered = strokesInOrder(glyph);
    expect(ordered.map((s) => s.pathIndex)).toEqual(glyph.paths.map((_, i) => i));
  });
});
