/**
 * C1 跨书体形变插值的「角色账」测试。
 *
 * 插值不能只吐一个 Glyph——用户要能一眼看出「哪几笔在演变、哪一笔隐藏了、
 * 哪两笔浮出来了」，所以 `interpolateDetailed` 还得说清每条输出笔画的来历。
 * 这份「来历说明」一旦算错，界面上的高亮就会指错笔画，
 * 所以这里把角色账当成**账本**来对：进出必须平、必须能对上对应关系。
 *
 * 覆盖五层：正常路径、边界、**退化输入不抛异常**、不变量、真实字形端到端。
 *
 * 一处已知性质（不是 bug，但要知道）：每条笔画只保留**最长的一条子路径**，
 * 摹本轮廓里的「洞」（内轮廓）会被丢掉，所以 t=0 / t=1 的结果与
 * 源 / 目标字形并非逐像素相等——见「端点性质」一节的容差说明。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg, type Glyph, type GlyphPath } from "../src/glyph.ts";
import { boundsOf, type Rect, type SubPath } from "../src/geometry/path.ts";
import {
  interpolateDetailed,
  interpolateGlyphs,
  normalizeGlyph,
  type DetailedInterpolation,
  type StrokeRole,
} from "../src/morph/interpolate.ts";
import { countInk, rasterizeGlyph } from "../src/raster/mask.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");

/** 端到端用例按**实际要用到的层**分别把门：素材不全就整组跳过，绝不能红。 */
const hasOracleChu = existsSync(join(ASSETS, "index", "oracle.json"))
  && existsSync(join(ASSETS, "index", "chu.json"));
const hasSealClerical = existsSync(join(ASSETS, "index", "seal.json"))
  && existsSync(join(ASSETS, "index", "clerical.json"));

/** 角色全集——`StrokeRole` 只该是这三个值。 */
const ALL_ROLES: StrokeRole[] = ["morph", "appear", "disappear"];

/** 造一条路径。 */
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

/** 造一条闭合的方框轮廓（首点重复一次，`centroidOf` 才认它是闭合的）。 */
function box(x0: number, y0: number, x1: number, y1: number): SubPath {
  return [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 },
    { x: x0, y: y1 }, { x: x0, y: y0 },
  ];
}

/** 造一个填充型字形（每条路径一条闭合轮廓）。 */
function outlineGlyph(contours: SubPath[], viewBox?: Rect): Glyph {
  return makeGlyph(contours.map((sp) => makePath([sp])), viewBox);
}

/** 造一个描边型字形（甲骨骨架）：每条路径是一条折线。 */
function skeletonGlyph(strokes: SubPath[], strokeWidth = 1.3): Glyph {
  return makeGlyph(strokes.map((sp) => makePath([sp], { strokeWidth })));
}

/** 真实字形：读 assets/index 的索引 + assets/glyphs 的 SVG。 */
function loadGlyph(layer: string, char: string): Glyph | null {
  const indexPath = join(ASSETS, "index", `${layer}.json`);
  if (!existsSync(indexPath)) return null;
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as Record<string, string>;
  const file = index[char];
  if (!file) return null;
  const path = join(ASSETS, "glyphs", layer, file);
  if (!existsSync(path)) return null;
  return parseGlyphSvg(readFileSync(path, "utf8"));
}

/** 一组子路径在某张画布上的墨量（像素数）。 */
function inkOf(subpaths: SubPath[], viewBox: Rect, size = 200): number {
  if (subpaths.length === 0) return 0;
  const mask = rasterizeGlyph(subpaths, { width: size, height: size, viewBox });
  return countInk(mask);
}

/** 某个角色的笔画合起来的墨量。 */
function inkOfRole(detail: DetailedInterpolation, role: StrokeRole): number {
  const subs: SubPath[] = [];
  detail.glyph.paths.forEach((p, i) => {
    if (detail.roles[i] === role) subs.push(...p.subpaths);
  });
  return inkOf(subs, detail.glyph.viewBox);
}

/** 归一化之后一个字形的墨量（与插值结果同一张画布，才好比）。 */
function inkOfNormalized(glyph: Glyph, resolution = 200): number {
  const norm = normalizeGlyph(glyph, resolution).glyph;
  return inkOf(norm.paths.flatMap((p) => p.subpaths), norm.viewBox, resolution);
}

describe("C1 interpolateDetailed：角色账", () => {
  const from = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);
  const to = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40), box(20, 60, 80, 95)]);

  it("roles 与输出笔画一一对应", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.roles.length).toBe(detail.glyph.paths.length);
  });

  it("morphed + appeared = 目标字形的笔画数", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.stats.morphed + detail.stats.appeared).toBe(to.paths.length);
  });

  it("morphed + disappeared = 源字形的笔画数", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.stats.morphed + detail.stats.disappeared).toBe(from.paths.length);
  });

  it("每条配对关系恰好产生一条 morph 笔画", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.stats.morphed).toBe(detail.correspond.pairs.length);
  });

  it("appear 的条数等于对应关系里的 unmatchedTo", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.stats.appeared).toBe(detail.correspond.unmatchedTo.length);
  });

  it("角色只可能是 morph / appear / disappear，且计数与 stats 一致", () => {
    const detail = interpolateDetailed(from, to, 0.5);
    for (const role of detail.roles) {
      expect(ALL_ROLES).toContain(role);
    }
    expect(detail.stats.morphed).toBe(detail.roles.filter((r) => r === "morph").length);
    expect(detail.stats.appeared).toBe(detail.roles.filter((r) => r === "appear").length);
    expect(detail.stats.disappeared).toBe(detail.roles.filter((r) => r === "disappear").length);
  });

  it("笔数不等时：源多出来的记 disappear，目标多出来的记 appear", () => {
    const fewer = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);
    const detail = interpolateDetailed(to, fewer, 0.5);

    expect(detail.roles.filter((r) => r === "disappear").length).toBe(1);
    expect(detail.roles.filter((r) => r === "appear").length).toBe(0);
    expect(detail.stats).toEqual({ morphed: 2, appeared: 0, disappeared: 1 });
  });
});

describe("C1 interpolateDetailed：薄封装", () => {
  const from = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);
  const to = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40), box(20, 60, 80, 95)]);

  it("interpolateGlyphs 与 interpolateDetailed(...).glyph 完全相等", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(interpolateGlyphs(from, to, t)).toEqual(interpolateDetailed(from, to, t).glyph);
    }
  });

  it("薄封装在同样的 t 下给出同样的结果（没有隐藏的随机性）", () => {
    expect(JSON.stringify(interpolateGlyphs(from, to, 0.3)))
      .toBe(JSON.stringify(interpolateGlyphs(from, to, 0.3)));
  });
});

describe("C1 interpolateDetailed：端点性质", () => {
  const from = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);
  const to = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40), box(20, 60, 80, 95)]);

  it("t=0：还没浮出来的笔画墨量为 0", () => {
    const detail = interpolateDetailed(from, to, 0);
    expect(detail.stats.appeared).toBe(1);
    expect(inkOfRole(detail, "appear")).toBe(0);
  });

  it("t=1：该消失的笔画墨量为 0", () => {
    const detail = interpolateDetailed(to, from, 1);
    expect(detail.stats.disappeared).toBe(1);
    expect(inkOfRole(detail, "disappear")).toBe(0);
  });

  it("t=0 的总墨量等于归一化后的源字形（方框轮廓逐像素相等）", () => {
    const detail = interpolateDetailed(from, to, 0);
    const total = inkOf(detail.glyph.paths.flatMap((p) => p.subpaths), detail.glyph.viewBox);
    expect(total).toBe(inkOfNormalized(from));
  });

  it("t=1 的总墨量等于归一化后的目标字形（方框轮廓逐像素相等）", () => {
    const detail = interpolateDetailed(from, to, 1);
    const total = inkOf(detail.glyph.paths.flatMap((p) => p.subpaths), detail.glyph.viewBox);
    expect(total).toBe(inkOfNormalized(to));
  });

  it("t=0 的 morph 笔画落在归一化后的源轮廓上（外接框逐位相等）", () => {
    const detail = interpolateDetailed(from, to, 0);
    const norm = normalizeGlyph(from, 200).glyph;

    expect(detail.correspond.pairs.length).toBeGreaterThan(0);
    detail.correspond.pairs.forEach((pair, i) => {
      const got = detail.glyph.paths[i].bounds;
      const want = norm.paths[pair.from].bounds;
      expect(got.x).toBeCloseTo(want.x, 6);
      expect(got.y).toBeCloseTo(want.y, 6);
      expect(got.width).toBeCloseTo(want.width, 6);
      expect(got.height).toBeCloseTo(want.height, 6);
    });
  });

  it("t=1 的 morph 笔画落在归一化后的目标轮廓上（外接框逐位相等）", () => {
    const detail = interpolateDetailed(from, to, 1);
    const norm = normalizeGlyph(to, 200).glyph;

    expect(detail.correspond.pairs.length).toBeGreaterThan(0);
    detail.correspond.pairs.forEach((pair, i) => {
      const got = detail.glyph.paths[i].bounds;
      const want = norm.paths[pair.to].bounds;
      expect(got.x).toBeCloseTo(want.x, 6);
      expect(got.y).toBeCloseTo(want.y, 6);
      expect(got.width).toBeCloseTo(want.width, 6);
      expect(got.height).toBeCloseTo(want.height, 6);
    });
  });

  it("非矩形轮廓：端点墨量与归一化后的字形一致（重采样削角，容差 1%）", () => {
    // 三角形：顶点会被弧长重采样削掉一点，所以只能给容差
    const tri = [{ x: 10, y: 10 }, { x: 90, y: 30 }, { x: 50, y: 90 }, { x: 10, y: 10 }];
    const src = outlineGlyph([tri]);
    const detail = interpolateDetailed(src, src, 0);
    const total = inkOf(detail.glyph.paths.flatMap((p) => p.subpaths), detail.glyph.viewBox);
    const want = inkOfNormalized(src);

    expect(Math.abs(total - want) / want).toBeLessThan(0.01);
  });

  it("t 越界被钳制：t=-1 等同 t=0，t=2 等同 t=1", () => {
    const from2 = outlineGlyph([box(5, 5, 40, 40)]);
    const to2 = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);

    expect(JSON.stringify(interpolateDetailed(from2, to2, -1)))
      .toBe(JSON.stringify(interpolateDetailed(from2, to2, 0)));
    expect(JSON.stringify(interpolateDetailed(from2, to2, 2)))
      .toBe(JSON.stringify(interpolateDetailed(from2, to2, 1)));
  });

  it("appear 的墨量随 t 单调不减，disappear 的墨量随 t 单调不增", () => {
    const src = outlineGlyph([box(5, 5, 40, 40)]);
    const dst = outlineGlyph([box(5, 5, 40, 40), box(20, 60, 80, 95)]);

    const appearInks: number[] = [];
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      appearInks.push(inkOfRole(interpolateDetailed(src, dst, t), "appear"));
    }
    for (let i = 1; i < appearInks.length; i += 1) {
      expect(appearInks[i]).toBeGreaterThanOrEqual(appearInks[i - 1]);
    }
    expect(appearInks[0]).toBe(0);
    expect(appearInks[appearInks.length - 1]).toBeGreaterThan(0);

    const vanishInks: number[] = [];
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      vanishInks.push(inkOfRole(interpolateDetailed(dst, src, t), "disappear"));
    }
    for (let i = 1; i < vanishInks.length; i += 1) {
      expect(vanishInks[i]).toBeLessThanOrEqual(vanishInks[i - 1]);
    }
    expect(vanishInks[0]).toBeGreaterThan(0);
    expect(vanishInks[vanishInks.length - 1]).toBe(0);
  });
});

describe("C1 interpolateDetailed：退化输入不抛异常", () => {
  const good = outlineGlyph([box(5, 5, 40, 40)]);

  it("空字形 → 空结果", () => {
    const detail = interpolateDetailed(makeGlyph([]), makeGlyph([]), 0.5);
    expect(detail.glyph.paths).toEqual([]);
    expect(detail.roles).toEqual([]);
    expect(detail.stats).toEqual({ morphed: 0, appeared: 0, disappeared: 0 });
  });

  it("空源 + 有笔画的目标 → 目标那一笔记 appear", () => {
    const detail = interpolateDetailed(makeGlyph([]), good, 0.5);
    expect(detail.roles).toEqual(["appear"]);
    expect(detail.stats.appeared).toBe(1);
  });

  it("子路径只有 1 个点 → 不抛异常", () => {
    const dot = makeGlyph([makePath([[{ x: 3, y: 4 }]])]);
    expect(() => interpolateDetailed(dot, good, 0.5)).not.toThrow();
    expect(interpolateDetailed(dot, good, 0.5).glyph.paths.length).toBeGreaterThan(0);
  });

  it("NaN 坐标 → 不抛异常（该笔画被丢掉，不进角色账）", () => {
    const nan = makeGlyph([
      makePath([[{ x: Number.NaN, y: Number.NaN }, { x: Number.NaN, y: Number.NaN }]]),
    ]);
    expect(() => interpolateDetailed(nan, good, 0.5)).not.toThrow();
    const detail = interpolateDetailed(nan, good, 0.5);
    expect(detail.roles).toEqual(["appear"]);
    expect(detail.stats.disappeared).toBe(0);
  });

  it("Infinity 坐标 → 不抛异常", () => {
    const inf = makeGlyph([
      makePath([[{ x: Number.POSITIVE_INFINITY, y: 0 }, { x: 0, y: Number.POSITIVE_INFINITY }]]),
    ]);
    expect(() => interpolateDetailed(inf, good, 0.5)).not.toThrow();
  });

  it("超大坐标 → 不抛异常", () => {
    const huge = makeGlyph([
      makePath([[{ x: -1e12, y: 1e12 }, { x: 1e12, y: -1e12 }]]),
    ]);
    expect(() => interpolateDetailed(huge, good, 0.5)).not.toThrow();
  });

  it("全零宽高 viewBox → 不抛异常", () => {
    const zero = outlineGlyph([box(5, 5, 40, 40)], { x: 0, y: 0, width: 0, height: 0 });
    expect(() => interpolateDetailed(zero, good, 0.5)).not.toThrow();
  });

  it("描边型（甲骨骨架）与填充型（摹本轮廓）混插 → 不抛异常", () => {
    const skeleton = skeletonGlyph([[{ x: 10, y: 10 }, { x: 90, y: 10 }]]);
    expect(() => interpolateDetailed(skeleton, good, 0.5)).not.toThrow();
    const detail = interpolateDetailed(skeleton, good, 0.5);
    expect(detail.roles.length).toBe(detail.glyph.paths.length);
    expect(detail.glyph.paths.every((p) => p.subpaths[0]?.length >= 2)).toBe(true);
  });

  it("零墨路径（单点）既不出现在输出里，也不计入任何角色", () => {
    // 这是角色账唯一的破口，必须钉住：目标里多一条没有墨的路径，
    // 它既配不上对（没有墨），也画不出来（缩到 0 面积），
    // 于是 morphed + appeared 会比目标路径数少一条。
    const dst = makeGlyph([
      makePath([box(5, 5, 40, 40)]),
      makePath([[{ x: 50, y: 50 }]]),
    ]);
    const detail = interpolateDetailed(good, dst, 0.5);

    expect(detail.glyph.paths.length).toBe(1);
    expect(detail.roles).toEqual(["morph"]);
    expect(detail.stats).toEqual({ morphed: 1, appeared: 0, disappeared: 0 });
    // 目标有 2 条路径，角色账只算 1 条——差的正是那条零墨路径
    expect(detail.stats.morphed + detail.stats.appeared).toBe(dst.paths.length - 1);
  });
});

describe("C1 interpolateDetailed：确定性", () => {
  it("同一输入两次运行结果完全相同", () => {
    const from = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40)]);
    const to = outlineGlyph([box(5, 5, 40, 40), box(60, 5, 95, 40), box(20, 60, 80, 95)]);

    expect(JSON.stringify(interpolateDetailed(from, to, 0.5)))
      .toBe(JSON.stringify(interpolateDetailed(from, to, 0.5)));
  });
});

describe.skipIf(!hasOracleChu)("C1 interpolateDetailed：真实字形（甲骨 → 楚）", () => {
  it("甲骨「日」→ 楚「日」：三条笔画全是 morph", () => {
    const from = loadGlyph("oracle", "日");
    const to = loadGlyph("chu", "日");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.roles).toEqual(["morph", "morph", "morph"]);
    expect(detail.stats).toEqual({ morphed: 3, appeared: 0, disappeared: 0 });
    // 角色账仍然闭合
    expect(detail.stats.morphed + detail.stats.appeared).toBe(to.paths.length);
    expect(detail.stats.morphed + detail.stats.disappeared).toBe(from.paths.length);
  });

  });

describe.skipIf(!hasSealClerical)("C1 interpolateDetailed：真实字形（篆书 → 隶书）", () => {
  it("篆书「明」→ 隶书「明」：角色账自洽", () => {
    const from = loadGlyph("seal", "明");
    const to = loadGlyph("clerical", "明");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    const detail = interpolateDetailed(from, to, 0.5);
    expect(detail.roles.length).toBe(detail.glyph.paths.length);
    expect(detail.stats.morphed + detail.stats.appeared).toBe(to.paths.length);
    expect(detail.stats.morphed + detail.stats.disappeared).toBe(from.paths.length);
    expect(detail.stats.morphed).toBe(detail.correspond.pairs.length);
    expect(detail.stats.appeared).toBe(detail.correspond.unmatchedTo.length);
  });

  it("真实字形上：t=0 没有浮出来的墨，t=1 没有该消失的墨", () => {
    const from = loadGlyph("seal", "明");
    const to = loadGlyph("clerical", "明");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    expect(inkOfRole(interpolateDetailed(from, to, 0), "appear")).toBe(0);
    expect(inkOfRole(interpolateDetailed(from, to, 1), "disappear")).toBe(0);
  });

  it("真实字形上：同一输入两次运行结果完全相同", () => {
    const from = loadGlyph("seal", "明");
    const to = loadGlyph("clerical", "明");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    expect(JSON.stringify(interpolateDetailed(from, to, 0.5)))
      .toBe(JSON.stringify(interpolateDetailed(from, to, 0.5)));
  });
});
