/**
 * C2 隶变算法的测试。
 *
 * 隶变是四条规则的合成（圆转方折 / 线条波磔 / 横平竖直 / 象形性降低），
 * 每条规则都作用在点列上，所以边界全在点列上：点太少、容差为 0、坐标是 NaN、
 * 末段朝左……
 *
 * **两条路径**：
 * - 描边型（甲骨骨架的开放折线）→ 规则直接作用在折线上；
 * - 填充型（摹本的闭合轮廓）→ 先取笔画中线，规则作用在中线上，再按半宽撑回轮廓。
 *   直接简化闭合轮廓会把环压扁、在环上加尾巴会凭空长出尖刺。
 *
 * **波磔幅度是绝对值**（用户单位），不再按字身长边缩放——按字身缩放时
 * `waveAmplitude: 10` 在 100 单位见方的字上会变成 105.6，比整个字还长，
 * 隶变演示因此「一团乱」。未显式给幅度时按 `waveRatio × 字身长边` 兜底。
 *
 * 这里把两类期望分开：
 * - **正常行为**——规则确实按文档说的那样生效；
 * - **已知缺陷**——当前实现与文档/直觉不一致的地方，把实际行为记录在案。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { boundsOf, type Point, type Rect, type SubPath } from "../src/geometry/path.ts";
import { parseGlyphSvg, type Glyph, type GlyphPath } from "../src/glyph.ts";
import {
  DEFAULT_LISHU,
  addWaveTail,
  isClosedSubpath,
  levelAndStraight,
  lishuTransform,
  lishuTransformSubpath,
  simplifyPolyline,
  snapToAxes,
} from "../src/morph/lishu.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "seal.json"));

/** 真实字形：读 assets/index 的索引 + assets/glyphs 的 SVG。 */
function loadGlyph(layer: string, char: string): Glyph | null {
  const index = JSON.parse(
    readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"),
  ) as Record<string, string>;
  const file = index[char];
  if (!file) return null;
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8"));
}

/** 造一个字形（每条路径一条子路径）。 */
function makeGlyph(subpaths: SubPath[], viewBox: Rect = { x: 0, y: 0, width: 100, height: 100 }): Glyph {
  const paths: GlyphPath[] = subpaths.map((sp) => ({
    subpaths: [sp],
    strokeWidth: 0,
    filled: true,
    bounds: boundsOf([sp]),
  }));
  return { viewBox, paths, bounds: boundsOf(subpaths) };
}

/** 造一个描边型字形（甲骨骨架）。 */
function makeSkeletonGlyph(subpaths: SubPath[], strokeWidth = 1.3): Glyph {
  const paths: GlyphPath[] = subpaths.map((sp) => ({
    subpaths: [sp],
    strokeWidth,
    filled: false,
    bounds: boundsOf([sp]),
  }));
  return { viewBox: { x: 0, y: 0, width: 100, height: 100 }, paths, bounds: boundsOf(subpaths) };
}

/** 一条向右的水平线段（末端在最右，适合加波磔）。 */
const HORIZONTAL: Point[] = [{ x: 10, y: 50 }, { x: 90, y: 50 }];

/** 一条闭合的横笔轮廓（首尾同点）。 */
const CLOSED_CONTOUR: SubPath = [
  { x: 20, y: 55 }, { x: 20, y: 45 }, { x: 85, y: 45 }, { x: 90, y: 50 }, { x: 20, y: 55 },
];

describe("C2 simplifyPolyline：折线简化", () => {
  it("曲线上的冗余点被去掉，首尾保留", () => {
    const points: Point[] = [
      { x: 0, y: 0 }, { x: 5, y: 1 }, { x: 10, y: 0 },
    ];
    // 凸起 1 < 容差 3 → 中间点可丢
    expect(simplifyPolyline(points, 3)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    // 容差收紧到 0.5 → 中间点必须留
    expect(simplifyPolyline(points, 0.5).length).toBe(3);
  });

  it("容差为 0 或负 → 原样返回", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 1 }, { x: 10, y: 0 }];
    expect(simplifyPolyline(points, 0)).toEqual(points);
    expect(simplifyPolyline(points, -1)).toEqual(points);
  });

  it("返回的是深拷贝——改结果不会改到入参", () => {
    // 修好的行为：同模块的 snapToAxes / addWaveTail 都是 `map(p => ({...p}))`，
    // simplifyPolyline 早先却是 `points.slice()` / 直接 push 原对象。
    const points: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 1 }, { x: 10, y: 0 }];
    const out = simplifyPolyline(points, 3);
    out[0].x = 999;
    expect(points[0].x).toBe(0);
  });

  it("点少于 3 个 → 原样返回", () => {
    expect(simplifyPolyline([], 3)).toEqual([]);
    expect(simplifyPolyline([{ x: 1, y: 2 }], 3)).toEqual([{ x: 1, y: 2 }]);
    expect(simplifyPolyline([{ x: 1, y: 2 }, { x: 3, y: 4 }], 3).length).toBe(2);
  });

  it("共线的点只留首尾", () => {
    const line: Point[] = [
      { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 },
    ];
    expect(simplifyPolyline(line, 1)).toEqual([{ x: 0, y: 0 }, { x: 9, y: 0 }]);
  });

  it("退化：所有点相同 → 不抛异常", () => {
    const same: Point[] = [{ x: 4, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 4 }];
    expect(() => simplifyPolyline(same, 3)).not.toThrow();
    expect(simplifyPolyline(same, 3).length).toBeGreaterThanOrEqual(2);
  });

  it("退化：含 NaN 坐标 → 不抛异常（但中间点会被丢掉）", () => {
    const withNaN: Point[] = [{ x: 0, y: 0 }, { x: Number.NaN, y: 5 }, { x: 10, y: 0 }];
    expect(() => simplifyPolyline(withNaN, 3)).not.toThrow();
    // 距离算成 NaN，比较恒为假，于是没有点被判为「必须保留」
    expect(simplifyPolyline(withNaN, 3)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });
});

describe("C2 snapToAxes：轴向吸附", () => {
  it("近水平段 → 两点 y 相同（方折）", () => {
    const out = snapToAxes([{ x: 0, y: 0 }, { x: 10, y: 0.5 }], DEFAULT_LISHU.axisSnapAngle);
    expect(out[0].y).toBeCloseTo(out[1].y, 10);
  });

  it("近垂直段 → 两点 x 相同", () => {
    const out = snapToAxes([{ x: 10, y: 0 }, { x: 10.5, y: 10 }], DEFAULT_LISHU.axisSnapAngle);
    expect(out[0].x).toBeCloseTo(out[1].x, 10);
  });

  it("明显倾斜的段 → 不动", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    expect(snapToAxes(points, DEFAULT_LISHU.axisSnapAngle)).toEqual(points);
  });

  it("点少于 2 个 → 原样返回", () => {
    expect(snapToAxes([], 0.3)).toEqual([]);
    expect(snapToAxes([{ x: 1, y: 2 }], 0.3)).toEqual([{ x: 1, y: 2 }]);
  });

  it("零长度段（首尾同点）→ 不动", () => {
    const same: Point[] = [{ x: 5, y: 5 }, { x: 5, y: 5 }];
    expect(snapToAxes(same, 0.3)).toEqual(same);
  });

  it("吸附与行进方向无关——向左的近水平段同样被吸附", () => {
    // 修好的行为：判据改成「到**最近轴线**的夹角」（min(norm, PI-norm)），
    // 不再受方向影响。早先只判 `norm <= snapAngle`，向左的近水平段
    // 归一化后接近 PI，落在两个阈值之外，于是原样保留。
    const right = snapToAxes([{ x: 0, y: 0 }, { x: 10, y: 0.5 }], DEFAULT_LISHU.axisSnapAngle);
    const left = snapToAxes([{ x: 10, y: 0 }, { x: 0, y: 0.5 }], DEFAULT_LISHU.axisSnapAngle);
    expect(right[0].y).toBeCloseTo(right[1].y, 10);
    expect(left[0].y).toBeCloseTo(left[1].y, 10);
  });
});

describe("C2 addWaveTail：波磔", () => {
  it("末端在最右 → 追加一段上扬的波峰", () => {
    const out = addWaveTail(HORIZONTAL, 10);
    expect(out.length).toBe(HORIZONTAL.length + 8);
    // 波峰在中间抬起（SVG 的 y 向下，抬起即 y 变小）
    expect(Math.min(...out.map((p) => p.y))).toBeLessThan(50);
    // 尾巴向右延伸 2.2 倍幅度
    expect(out[out.length - 1].x - 90).toBeCloseTo(22, 8);
  });

  it("末端不是最右 → 不加波磔", () => {
    const points: Point[] = [{ x: 90, y: 10 }, { x: 10, y: 50 }];
    expect(addWaveTail(points, 10)).toEqual(points);
  });

  it("末段朝左（dx ≤ 0）→ 不加波磔", () => {
    const points: Point[] = [{ x: 90, y: 50 }, { x: 10, y: 50 }];
    expect(addWaveTail(points, 10)).toEqual(points);
  });

  it("幅度为 0 或负 → 原样返回", () => {
    expect(addWaveTail(HORIZONTAL, 0)).toEqual(HORIZONTAL);
    expect(addWaveTail(HORIZONTAL, -5)).toEqual(HORIZONTAL);
  });

  it("点少于 2 个 → 原样返回", () => {
    expect(addWaveTail([], 10)).toEqual([]);
    expect(addWaveTail([{ x: 1, y: 2 }], 10)).toEqual([{ x: 1, y: 2 }]);
  });

  it("不改动入参", () => {
    const input: Point[] = [{ x: 10, y: 50 }, { x: 90, y: 50 }];
    const snapshot = JSON.parse(JSON.stringify(input));
    addWaveTail(input, 10);
    expect(input).toEqual(snapshot);
  });
});

describe("C2 levelAndStraight：横平竖直", () => {
  it("近水平 → 旋成水平", () => {
    const out = levelAndStraight(
      [{ x: 0, y: 0 }, { x: 10, y: 0.5 }],
      DEFAULT_LISHU.axisSnapAngle,
    );
    expect(out[0].y).toBeCloseTo(out[1].y, 8);
  });

  it("近垂直 → 旋成垂直", () => {
    const out = levelAndStraight(
      [{ x: 0, y: 0 }, { x: 0.5, y: 10 }],
      DEFAULT_LISHU.axisSnapAngle,
    );
    expect(out[0].x).toBeCloseTo(out[1].x, 8);
  });

  it("45° 斜线 → 不动（超出阈值）", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    expect(levelAndStraight(points, DEFAULT_LISHU.axisSnapAngle)).toEqual(points);
  });

  it("点少于 2 个 → 原样返回", () => {
    expect(levelAndStraight([], 0.3)).toEqual([]);
    expect(levelAndStraight([{ x: 1, y: 2 }], 0.3)).toEqual([{ x: 1, y: 2 }]);
  });

  it("与 snapToAxes 同样不看行进方向——向左的近水平段也旋平", () => {
    const right = levelAndStraight(
      [{ x: 0, y: 0 }, { x: 10, y: 0.5 }],
      DEFAULT_LISHU.axisSnapAngle,
    );
    const left = levelAndStraight(
      [{ x: 10, y: 0 }, { x: 0, y: 0.5 }],
      DEFAULT_LISHU.axisSnapAngle,
    );
    expect(right[0].y).toBeCloseTo(right[1].y, 8);
    expect(left[0].y).toBeCloseTo(left[1].y, 8);
  });
});

describe("C2 isClosedSubpath：子路径是否闭合", () => {
  it("首尾点重合 → 闭合", () => {
    expect(isClosedSubpath(CLOSED_CONTOUR)).toBe(true);
  });

  it("首尾点不重合 → 不闭合", () => {
    expect(isClosedSubpath(HORIZONTAL)).toBe(false);
  });

  it("点数不足 3 个 → 一律不算闭合", () => {
    expect(isClosedSubpath([])).toBe(false);
    expect(isClosedSubpath([{ x: 0, y: 0 }])).toBe(false);
    expect(isClosedSubpath([{ x: 0, y: 0 }, { x: 0, y: 0 }])).toBe(false);
  });
});

describe("C2 lishuTransformSubpath：单条子路径的隶变", () => {
  it("开放折线 → 走原来的四规则，尾巴长 2.2 倍幅度", () => {
    const out = lishuTransformSubpath(HORIZONTAL, {
      waveAmplitude: 10,
      levelAndStraight: false,
      simplifyTolerance: 0,
    });
    expect(out.length).toBe(HORIZONTAL.length + 8);
    expect(out[out.length - 1].x - 90).toBeCloseTo(22, 6);
  });

  it("开放折线 → 关掉波磔就不加点", () => {
    const out = lishuTransformSubpath(HORIZONTAL, {
      waveAmplitude: 10,
      waveTail: false,
      levelAndStraight: false,
      simplifyTolerance: 0,
    });
    expect(out.length).toBe(2);
  });

  it("闭合轮廓 → 走中线路径：轮廓被撑成左右两列，形状保留", () => {
    const out = lishuTransformSubpath(CLOSED_CONTOUR, {
      waveAmplitude: 10,
      levelAndStraight: false,
      simplifyTolerance: 0,
    });
    expect(out.length).toBeGreaterThan(CLOSED_CONTOUR.length);
    expect(out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    // 撑回去的仍是闭合轮廓（首尾同点）
    const first = out[0];
    const last = out[out.length - 1];
    expect(first.x).toBeCloseTo(last.x, 6);
    expect(first.y).toBeCloseTo(last.y, 6);
  });

  it("闭合轮廓 → 不出尖刺：外接框不会暴涨", () => {
    const before = boundsOf([CLOSED_CONTOUR]);
    const out = lishuTransformSubpath(CLOSED_CONTOUR, {
      waveAmplitude: 10,
      levelAndStraight: false,
      simplifyTolerance: 0,
    });
    const after = boundsOf([out]);
    expect(after.width).toBeLessThan(before.width * 1.5);
    expect(after.height).toBeLessThan(before.height * 2);
  });

  it("退化：空子路径 / 单点子路径 → 原样返回", () => {
    expect(lishuTransformSubpath([])).toEqual([]);
    expect(lishuTransformSubpath([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });

  it("不改动入参", () => {
    const input: Point[] = [{ x: 10, y: 50 }, { x: 90, y: 50 }];
    const snapshot = JSON.parse(JSON.stringify(input));
    const out = lishuTransformSubpath(input);
    expect(out.length).toBeGreaterThan(0);
    expect(input).toEqual(snapshot);
  });

  it("波磔幅度语义一致：单条子路径与整字变换用的是同一个绝对幅度", () => {
    // 改过之后两边都按「绝对幅度」算，尾巴一样长。
    const sub = lishuTransformSubpath(HORIZONTAL, {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    const glyph = lishuTransform(makeSkeletonGlyph([HORIZONTAL]), {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    const whole = glyph.paths[0].subpaths[0];
    expect(sub[sub.length - 1].x - 90).toBeCloseTo(22, 6);
    expect(whole[whole.length - 1].x - 90).toBeCloseTo(22, 6);
  });
});

describe("C2 lishuTransform：整字隶变", () => {
  it("描边型字形：维持原样——开放折线直接上四规则", () => {
    const glyph = makeSkeletonGlyph([HORIZONTAL]);
    const out = lishuTransform(glyph, {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    expect(out.paths.length).toBe(glyph.paths.length);
    expect(out.paths[0].subpaths[0].length).toBe(10);
    expect(out.paths[0].subpaths[0][out.paths[0].subpaths[0].length - 1].x - 90)
      .toBeCloseTo(22, 6);
  });

  it("填充型字形：走中线路径——路径数与子路径数都不变", () => {
    const glyph = makeGlyph([CLOSED_CONTOUR]);
    const out = lishuTransform(glyph, {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    expect(out.paths.length).toBe(glyph.paths.length);
    expect(out.paths[0].subpaths.length).toBe(glyph.paths[0].subpaths.length);
  });

  it("填充型字形：结果仍是合法的闭合轮廓", () => {
    const glyph = makeGlyph([CLOSED_CONTOUR]);
    const out = lishuTransform(glyph, {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    const sp = out.paths[0].subpaths[0];
    expect(sp.length).toBeGreaterThanOrEqual(4);
    expect(sp.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    const first = sp[0];
    const last = sp[sp.length - 1];
    expect(first.x).toBeCloseTo(last.x, 6);
    expect(first.y).toBeCloseTo(last.y, 6);
  });

  it("填充型字形：不出尖刺——外接框不会暴涨", () => {
    // 旧实现把闭合轮廓直接简化 + 加尾巴：尾巴能长到整个字那么长，
    // 而且环被压扁（10 单位高的笔画被撑成 37 单位）。
    const before = boundsOf([CLOSED_CONTOUR]);
    const glyph = makeGlyph([CLOSED_CONTOUR]);
    const out = lishuTransform(glyph, {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0,
    });
    const after = out.bounds;
    expect(after.width).toBeLessThan(before.width * 1.5);
    expect(after.height).toBeLessThan(before.height * 2);
  });

  it("波磔幅度是绝对值：显式给 10 就是 10，不随字形缩放", () => {
    const opts = {
      waveAmplitude: 10, levelAndStraight: false, simplifyTolerance: 0, waveTail: true,
    };
    const small = lishuTransform(makeSkeletonGlyph([HORIZONTAL]), opts).paths[0].subpaths[0];
    const big = lishuTransform(
      makeSkeletonGlyph([HORIZONTAL.map((p) => ({ x: p.x * 10, y: p.y * 10 }))]),
      opts,
    ).paths[0].subpaths[0];
    // 尾巴长 2.2 倍幅度 = 22，与字形大小无关
    expect(small[small.length - 1].x - 90).toBeCloseTo(22, 6);
    expect(big[big.length - 1].x - 900).toBeCloseTo(22, 6);
  });

  it("波磔幅度未显式给出 → 按 waveRatio × 字身长边兜底", () => {
    const opts = { levelAndStraight: false, simplifyTolerance: 0, waveTail: true };
    // 字身长边 80 → wave = 0.025 × 80 = 2 → 尾巴 4.4
    const small = lishuTransform(makeSkeletonGlyph([HORIZONTAL]), opts).paths[0].subpaths[0];
    expect(small[small.length - 1].x - 90).toBeCloseTo(0.025 * 80 * 2.2, 6);
    // 字放大 10 倍 → 兜底的幅度也放大 10 倍（这是「比例」语义，不是绝对值语义）
    const big = lishuTransform(
      makeSkeletonGlyph([HORIZONTAL.map((p) => ({ x: p.x * 10, y: p.y * 10 }))]),
      opts,
    ).paths[0].subpaths[0];
    expect(big[big.length - 1].x - 900).toBeCloseTo(0.025 * 800 * 2.2, 6);
  });

  it("默认参数：波磔比例是字身长边的 2.5%", () => {
    expect(DEFAULT_LISHU.waveRatio).toBeCloseTo(0.025, 10);
  });

  it("路径数不变，viewBox 不变", () => {
    const glyph = makeGlyph([
      [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }],
      [{ x: 20, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 80 }],
    ]);
    const out = lishuTransform(glyph);
    expect(out.paths.length).toBe(glyph.paths.length);
    expect(out.viewBox).toEqual(glyph.viewBox);
    expect(out.bounds.width).toBeGreaterThan(0);
  });

  it("不改原字形（纯函数）", () => {
    const glyph = makeGlyph([CLOSED_CONTOUR]);
    const snapshot = JSON.stringify(glyph);
    lishuTransform(glyph);
    expect(JSON.stringify(glyph)).toBe(snapshot);
  });

  it("确定性：同样的输入跑两遍，结果完全一致", () => {
    const glyph = makeGlyph([
      [{ x: 10, y: 10 }, { x: 90, y: 20 }, { x: 50, y: 90 }],
      [{ x: 20, y: 30 }, { x: 60, y: 30 }, { x: 60, y: 70 }],
    ]);
    const a = lishuTransform(glyph);
    const b = lishuTransform(glyph);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("退化：空字形 → 空路径，零矩形，不抛异常", () => {
    const out = lishuTransform(makeGlyph([]));
    expect(out.paths).toEqual([]);
    expect(out.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("退化：零长度笔画 → 不抛异常", () => {
    const out = lishuTransform(makeSkeletonGlyph([[{ x: 5, y: 5 }, { x: 5, y: 5 }]]));
    expect(out.paths.length).toBe(1);
    expect(out.paths[0].subpaths[0].length).toBe(2);
  });

  it("退化：NaN 坐标 → 不抛异常", () => {
    const out = lishuTransform(
      makeSkeletonGlyph([[{ x: 10, y: 10 }, { x: Number.NaN, y: 20 }, { x: 30, y: 30 }]]),
    );
    expect(out.paths.length).toBe(1);
  });

  it("退化：Infinity 坐标 → 不抛异常", () => {
    const out = lishuTransform(
      makeSkeletonGlyph([[{ x: 10, y: 10 }, { x: Number.POSITIVE_INFINITY, y: 20 }]]),
    );
    expect(out.paths.length).toBe(1);
  });

  it("退化：负坐标 → 外接框照算", () => {
    const out = lishuTransform(
      makeSkeletonGlyph([[{ x: -40, y: -30 }, { x: -10, y: -30 }]]),
      { waveTail: false },
    );
    expect(out.bounds.x).toBeCloseTo(-40, 8);
    expect(out.bounds.width).toBeCloseTo(30, 8);
  });

  it("退化：超大坐标 → 不抛异常", () => {
    const out = lishuTransform(
      makeSkeletonGlyph([[{ x: -1e12, y: 1e12 }, { x: 1e12, y: -1e12 }]]),
    );
    expect(out.paths.length).toBe(1);
  });

  it("退化：中线取不出来的轮廓原样保留，不硬改", () => {
    // 零面积的轮廓取不出中线（返回 null），此时应保留原轮廓。
    const degenerate: SubPath = [
      { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 },
    ];
    const out = lishuTransform(makeGlyph([degenerate]), { waveAmplitude: 10 });
    const sp = out.paths[0].subpaths[0];
    expect(sp.length).toBeGreaterThanOrEqual(1);
    expect(sp.every((p) => p.x === 5 && p.y === 5)).toBe(true);
  });

  it("已知缺陷：描边型输入的输出被标成填充轮廓", () => {
    // 甲骨骨架是开放折线，靠描边呈现；隶变输出统一标成 filled，
    // 于是折线被当成闭合多边形填充，渲染出来是一坨实心块而不是笔画。
    const out = lishuTransform(makeSkeletonGlyph([HORIZONTAL]));
    expect(out.paths[0].filled).toBe(true);
    expect(out.paths[0].strokeWidth).toBe(0);
  });
});

describe.skipIf(!hasAssets)("C2 隶变：真实字形", () => {
  it("摹本轮廓走中线路径：路径数与轮廓数不变，撑回后仍是合法闭合轮廓", () => {
    const glyph = loadGlyph("seal", "明");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    const out = lishuTransform(glyph, { waveAmplitude: 10 });
    expect(out.paths.length).toBe(glyph.paths.length);
    expect(out.paths.flatMap((p) => p.subpaths).length)
      .toBe(glyph.paths.flatMap((p) => p.subpaths).length);
    for (const sp of out.paths.flatMap((p) => p.subpaths)) {
      expect(sp.length).toBeGreaterThanOrEqual(4);
      expect(sp.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true);
    }
  });

  it("摹本轮廓：外接框不暴涨（不再出现比整字还长的尖刺）", () => {
    // 旧实现直接简化闭合环 + 加尾巴：环被压扁，尾巴能长过整个字。
    const glyph = loadGlyph("seal", "明");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    const out = lishuTransform(glyph, { waveAmplitude: 10 });
    expect(out.bounds.width).toBeLessThan(glyph.bounds.width * 1.8);
    expect(out.bounds.height).toBeLessThan(glyph.bounds.height * 1.8);
  });

  it("甲骨骨架（描边型）：开放折线直接上规则，路径数不变", () => {
    const glyph = loadGlyph("oracle", "天");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    const out = lishuTransform(glyph, { waveAmplitude: 10 });
    expect(out.paths.length).toBe(glyph.paths.length);
    for (const sp of out.paths.flatMap((p) => p.subpaths)) {
      expect(sp.length).toBeGreaterThanOrEqual(2);
      expect(sp.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true);
    }
  });

  it("确定性：真实字形跑两遍结果一致", () => {
    const glyph = loadGlyph("seal", "日");
    expect(glyph).toBeTruthy();
    if (!glyph) return;
    expect(JSON.stringify(lishuTransform(glyph, { waveAmplitude: 10 })))
      .toBe(JSON.stringify(lishuTransform(glyph, { waveAmplitude: 10 })));
  });
});
