/**
 * 笔画中线（摹本轮廓 → 笔势线）的测试。
 *
 * 隶变要作用在**笔势线**上：「圆转方折」说的是笔画中段的转折，「波磔」说的是
 * 收笔的走势——这些都长在中线上，不长在轮廓上。直接对闭合轮廓做折线简化与
 * 加尾巴，会把环压扁、在环上凭空长出尖刺。
 *
 * 中线的取法是**对边配对**：沿主轴找两端 → 拆成两条弧 → 按弧长等比配对取中点。
 * 前提是轮廓确实包着一条细长的笔画，块状/退化轮廓取不出来（返回 `null`）。
 */

import { describe, expect, it } from "vitest";
import { contourToCenterline, outlineFromCenterline } from "../src/geometry/centerline.ts";
import { boundsOf, type Point, type SubPath } from "../src/geometry/path.ts";

/** 矩形轮廓（顺时针，首尾不重复）。 */
function rect(x0: number, y0: number, x1: number, y1: number): SubPath {
  return [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
}

/** 一条横笔画的外轮廓：上下两条边各密集采样，模拟真实摹本的轮廓。 */
function strokeContour(x0: number, x1: number, y0: number, y1: number): SubPath {
  const top: Point[] = [];
  for (let x = x0; x <= x1; x += 2) top.push({ x, y: y0 });
  const bottom: Point[] = [];
  for (let x = x1; x >= x0; x -= 2) bottom.push({ x, y: y1 });
  return [...top, ...bottom];
}

describe("中心线：contourToCenterline", () => {
  it("正常：细长轮廓能取出中线，长度约等于轮廓长边", () => {
    const sp = strokeContour(10, 90, 45, 55); // 80×10 的一笔
    const center = contourToCenterline(sp);
    expect(center).toBeTruthy();
    if (!center) return;

    expect(center.points.length).toBe(48);
    expect(center.halfWidths.length).toBe(center.points.length);
    expect(center.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    // 中线长度与轮廓长边同量级
    expect(center.length).toBeGreaterThan(70);
    expect(center.length).toBeLessThan(95);
  });

  it("正常：半宽沿中线两端收窄、中间最宽", () => {
    const center = contourToCenterline(strokeContour(10, 90, 45, 55));
    expect(center).toBeTruthy();
    if (!center) return;
    // 两端是轮廓自身的端点，配对后落在同一点上 → 半宽为 0
    expect(center.halfWidths[0]).toBeCloseTo(0, 6);
    expect(center.halfWidths[center.halfWidths.length - 1]).toBeCloseTo(0, 6);
    const maxHalf = Math.max(...center.halfWidths);
    expect(maxHalf).toBeGreaterThan(3);
    expect(maxHalf).toBeLessThan(10);
  });

  it("参数：采样点数可调", () => {
    expect(contourToCenterline(strokeContour(10, 90, 45, 55), 12)?.points.length).toBe(12);
  });

  it("退化：点数不足 → null", () => {
    expect(contourToCenterline([])).toBeNull();
    expect(contourToCenterline([{ x: 0, y: 0 }])).toBeNull();
    expect(contourToCenterline([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBeNull();
  });

  it("退化：零面积的轮廓（点全同 / 全共线）→ null，不抛异常", () => {
    expect(contourToCenterline([
      { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 },
    ])).toBeNull();
    expect(contourToCenterline([
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    ])).toBeNull();
  });

  it("退化：NaN / Infinity 坐标 → null，不抛异常", () => {
    expect(contourToCenterline([
      { x: 0, y: 0 }, { x: Number.NaN, y: 5 }, { x: 10, y: 10 }, { x: 10, y: 0 },
    ])).toBeNull();
    expect(contourToCenterline([
      { x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 5 }, { x: 10, y: 10 }, { x: 10, y: 0 },
    ])).toBeNull();
  });

  it("方块、圆这类「块状」轮廓 → null（配出来的「笔画」解释不了这圈墨）", () => {
    // 修好的行为：加了一条判据——中线长至少要能解释这圈墨
    // （中线长 ≥ 0.75 × 半周长）。
    // 方块 50×50：周长 200、中线 70.7（对角线方向）→ 比值 0.71，判为块状；
    // 圆 r=20：周长 125.7、中线 40 → 比值 0.64，判为块状。
    // 不加这条判据，块状笔画会被重建成一条斜穿过去的带子——比不改还糟。
    const square = contourToCenterline(rect(10, 10, 50, 50));
    expect(square).toBeNull();
    const circle = contourToCenterline(
      Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return { x: 50 + 20 * Math.cos(a), y: 50 + 20 * Math.sin(a) };
      }),
    );
    expect(circle).toBeNull();
  });

  it("不变量：确定性——同一轮廓取两遍结果一致", () => {
    const sp = strokeContour(10, 90, 45, 55);
    const a = contourToCenterline(sp);
    const b = contourToCenterline(sp);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("中心线：outlineFromCenterline", () => {
  it("正常：撑出的轮廓点数是中线的两倍（左右各一条边）", () => {
    const center = contourToCenterline(strokeContour(10, 90, 45, 55));
    expect(center).toBeTruthy();
    if (!center) return;
    const outline = outlineFromCenterline(center);
    expect(outline.length).toBe(center.points.length * 2);
    expect(outline.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("正常：撑回去的轮廓仍是闭合的（首尾同点）", () => {
    const center = contourToCenterline(strokeContour(10, 90, 45, 55));
    expect(center).toBeTruthy();
    if (!center) return;
    const outline = outlineFromCenterline(center);
    const first = outline[0];
    const last = outline[outline.length - 1];
    expect(first.x).toBeCloseTo(last.x, 6);
    expect(first.y).toBeCloseTo(last.y, 6);
  });

  it("正常：撑回去的轮廓保留了原来的尺度", () => {
    const sp = strokeContour(10, 90, 45, 55);
    const center = contourToCenterline(sp);
    expect(center).toBeTruthy();
    if (!center) return;
    const before = boundsOf([sp]);
    const after = boundsOf([outlineFromCenterline(center)]);
    expect(after.width).toBeGreaterThan(before.width * 0.8);
    expect(after.width).toBeLessThan(before.width * 1.2);
  });

  it("参数：halfWidthScale 只影响粗细，不影响点数", () => {
    const center = contourToCenterline(strokeContour(10, 90, 45, 55));
    expect(center).toBeTruthy();
    if (!center) return;
    const thin = outlineFromCenterline(center, { halfWidthScale: 0.5 });
    const fat = outlineFromCenterline(center, { halfWidthScale: 2 });
    expect(thin.length).toBe(fat.length);
    expect(boundsOf([fat]).height).toBeGreaterThan(boundsOf([thin]).height);
  });

  it("退化：中线点数不足 → 空数组", () => {
    expect(outlineFromCenterline({ points: [], halfWidths: [], length: 0 })).toEqual([]);
    expect(outlineFromCenterline({ points: [{ x: 0, y: 0 }], halfWidths: [2], length: 0 })).toEqual([]);
  });

  it("退化：没有半宽信息 → 撑出零宽的轮廓，不抛异常", () => {
    const outline = outlineFromCenterline({
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      halfWidths: [],
      length: 10,
    });
    expect(outline.length).toBe(4);
    expect(boundsOf([outline]).height).toBe(0);
  });
});
