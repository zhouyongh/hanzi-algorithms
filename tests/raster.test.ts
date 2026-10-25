import { describe, expect, it } from "vitest";
import {
  createMask, rasterizePolygons, rasterizeStrokes, countInk, cropToInk,
  resizeMask, resizeMaskSmooth, inkBounds, hasEnclosedHole,
} from "../src/raster/mask.ts";

describe("rasterizePolygons", () => {
  it("填充一个矩形", () => {
    const mask = rasterizePolygons(
      [[{ x: 2, y: 2 }, { x: 12, y: 2 }, { x: 12, y: 12 }, { x: 2, y: 12 }]],
      20, 20,
    );
    expect(countInk(mask)).toBeGreaterThan(80);
    const b = inkBounds(mask);
    expect(b).not.toBeNull();
    expect(b?.x0).toBeGreaterThanOrEqual(1);
    expect(b?.x1).toBeLessThanOrEqual(15);
  });

  it("空输入得到空掩膜", () => {
    const mask = rasterizePolygons([], 20, 20);
    expect(countInk(mask)).toBe(0);
  });

  it("nonzero winding：同向叠加强 unions", () => {
    const a = [[{ x: 2, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 10 }, { x: 2, y: 10 }]];
    const b = [[{ x: 6, y: 6 }, { x: 14, y: 6 }, { x: 14, y: 14 }, { x: 6, y: 14 }]];
    const union = countInk(rasterizePolygons([...a, ...b], 20, 20));
    const alone = countInk(rasterizePolygons(a, 20, 20)) + countInk(rasterizePolygons(b, 20, 20));
    expect(union).toBeLessThan(alone);
  });
});

describe("rasterizeStrokes", () => {
  it("一条水平线加粗成带状", () => {
    const mask = rasterizeStrokes(
      [{ points: [{ x: 5, y: 10 }, { x: 40, y: 10 }], halfWidth: 2 }],
      50, 20,
    );
    const ink = countInk(mask);
    // 长度 35、直径 4 → 面积约 140
    expect(ink).toBeGreaterThan(100);
    expect(ink).toBeLessThan(220);
  });

  it("墨迹外接框覆盖整条线", () => {
    const mask = rasterizeStrokes(
      [{ points: [{ x: 5, y: 10 }, { x: 40, y: 10 }], halfWidth: 2 }],
      50, 20,
    );
    const b = inkBounds(mask);
    expect(b?.x0).toBeLessThanOrEqual(5);
    expect(b?.x1).toBeGreaterThanOrEqual(40);
  });
});

describe("cropToInk / resize", () => {
  it("裁剪到墨迹外接框", () => {
    const mask = createMask(40, 40);
    for (let y = 10; y < 20; y += 1) {
      for (let x = 12; x < 30; x += 1) mask.data[y * 40 + x] = 1;
    }
    const { mask: cropped, offsetX, offsetY } = cropToInk(mask);
    expect(offsetX).toBeLessThanOrEqual(12);
    expect(offsetY).toBeLessThanOrEqual(10);
    expect(cropped.width).toBeLessThan(40);
    expect(countInk(cropped)).toBe(countInk(mask));
  });

  it("缩放保持墨迹非空", () => {
    const mask = createMask(20, 20);
    for (let y = 5; y < 15; y += 1) {
      for (let x = 5; x < 15; x += 1) mask.data[y * 20 + x] = 1;
    }
    expect(countInk(resizeMask(mask, 10, 10))).toBeGreaterThan(0);
    expect(countInk(resizeMaskSmooth(mask, 10, 10))).toBeGreaterThan(0);
  });
});

describe("hasEnclosedHole", () => {
  /** 画一个矩形环（框）。 */
  function ring(size: number, thickness: number): ReturnType<typeof createMask> {
    const mask = createMask(size, size);
    const lo = 2;
    const hi = size - 3;
    for (let y = lo; y <= hi; y += 1) {
      for (let x = lo; x <= hi; x += 1) {
        const onEdge = x < lo + thickness || x > hi - thickness
          || y < lo + thickness || y > hi - thickness;
        if (onEdge) mask.data[y * size + x] = 1;
      }
    }
    return mask;
  }

  it("闭合的框有封闭空腔", () => {
    // 「囗」是闭的 → 作部首时是全包围（⿴）
    expect(hasEnclosedHole(ring(20, 2))).toBe(true);
  });

  it("开口的框没有封闭空腔", () => {
    // 「匚」开在右边 → 是左上包围（⿵）
    const mask = ring(20, 2);
    // 抹掉右边那道竖边（环的右边在 x=16,17），打通到画布边缘
    for (let y = 0; y < 20; y += 1) {
      mask.data[y * 20 + 16] = 0;
      mask.data[y * 20 + 17] = 0;
    }
    expect(hasEnclosedHole(mask)).toBe(false);
  });

  it("实心块没有空腔", () => {
    const mask = createMask(20, 20);
    for (let y = 5; y < 15; y += 1) {
      for (let x = 5; x < 15; x += 1) mask.data[y * 20 + x] = 1;
    }
    expect(hasEnclosedHole(mask)).toBe(false);
  });
});
