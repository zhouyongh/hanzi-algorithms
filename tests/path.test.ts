import { describe, expect, it } from "vitest";
import { parsePath, boundsOf, polylineLength, flattenArc, centroidOf } from "../src/geometry/path.ts";

describe("parsePath", () => {
  it("解析直线段并保留两个点的子路径", () => {
    // 甲骨骨架全是这种两三点直线，丢掉就等于没解析
    const sp = parsePath("M 7 4 L 16 4");
    expect(sp).toHaveLength(1);
    expect(sp[0]).toHaveLength(2);
    expect(sp[0][0]).toEqual({ x: 7, y: 4 });
    expect(sp[0][1]).toEqual({ x: 16, y: 4 });
  });

  it("解析绝对坐标的 M/L 序列", () => {
    const sp = parsePath("M 4 4 L 26 4");
    expect(sp[0]).toHaveLength(2);
    expect(polylineLength(sp[0])).toBeCloseTo(22, 6);
  });

  it("相对坐标基于当前点累加", () => {
    const sp = parsePath("M 10 10 l 5 0 l 0 5");
    expect(sp[0].map((p) => p.x)).toEqual([10, 15, 15]);
    expect(sp[0].map((p) => p.y)).toEqual([10, 10, 15]);
  });

  it("M 之后的隐含命令是 lineto", () => {
    const sp = parsePath("M 0 0 10 10 20 0");
    expect(sp[0]).toHaveLength(3);
    expect(sp[0][2]).toEqual({ x: 20, y: 0 });
  });

  it("H/V 简写", () => {
    const sp = parsePath("M 0 0 H 10 V 20");
    expect(sp[0][1]).toEqual({ x: 10, y: 0 });
    expect(sp[0][2]).toEqual({ x: 10, y: 20 });
  });

  it("三次贝塞尔展平后端点精确", () => {
    const sp = parsePath("M 0 0 C 0 10 10 10 10 0");
    const last = sp[0][sp[0].length - 1];
    expect(last.x).toBeCloseTo(10, 6);
    expect(last.y).toBeCloseTo(0, 6);
    // 展平后点数 = 曲线段数 + 起点
    expect(sp[0].length).toBeGreaterThan(10);
  });

  it("S 命令用反射控制点", () => {
    const sp = parsePath("M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0");
    const last = sp[0][sp[0].length - 1];
    expect(last.x).toBeCloseTo(20, 6);
    expect(last.y).toBeCloseTo(0, 6);
  });

  it("Q / T 二次贝塞尔", () => {
    const sp = parsePath("M 0 0 Q 5 10 10 0 T 20 0");
    const last = sp[0][sp[0].length - 1];
    expect(last.x).toBeCloseTo(20, 6);
  });

  it("A 椭圆弧端点精确", () => {
    const sp = parsePath("M 0 0 A 10 10 0 0 1 20 0");
    const last = sp[0][sp[0].length - 1];
    expect(last.x).toBeCloseTo(20, 6);
    expect(last.y).toBeCloseTo(0, 6);
  });

  it("Z 闭合后回到起点", () => {
    const sp = parsePath("M 0 0 L 10 0 L 10 10 Z");
    // 闭合子路径保留 3 个点
    expect(sp).toHaveLength(1);
    expect(sp[0].length).toBeGreaterThanOrEqual(3);
  });

  it("空数据返回空数组", () => {
    expect(parsePath("")).toEqual([]);
  });
});

describe("boundsOf", () => {
  it("计算外接矩形", () => {
    const b = boundsOf([[{ x: 1, y: 2 }, { x: 5, y: 9 }]]);
    expect(b).toEqual({ x: 1, y: 2, width: 4, height: 7 });
  });

  it("空输入返回零矩形", () => {
    expect(boundsOf([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe("flattenArc", () => {
  it("零半径退化为直线", () => {
    const pts = flattenArc(0, 0, 0, 10, 0, false, true, 5, 5);
    expect(pts).toEqual([{ x: 5, y: 5 }]);
  });

  it("半圆弧产生合理点列", () => {
    const pts = flattenArc(0, 0, 10, 10, 0, false, true, 20, 0);
    expect(pts.length).toBe(48);
    // 弧上各点应大致落在半径 10 的圆上
    for (const p of pts) {
      expect(Math.hypot(p.x - 10, p.y)).toBeLessThan(10.5);
    }
  });
});

describe("parsePath —— z 之后的相对 m", () => {
  // 这条测试守着本仓库最贵的一个 bug：
  // SVG 规范里，`z` 之后**当前点回到本子路径的起点**，紧跟着的相对 `m`
  // 必须相对这个点算。早先的实现把 `started` 在 `z` 之后置了 false，
  // 于是相对偏移被丢掉——小篆「日」（`m…z m…z m…z`）的两个「格」被放到
  // 完全错误的位置，洞没了、字也歪了，六个书体里 58%–79% 的字形都踩这个模式。
  it("相对 m 相对的是上一个子路径的起点", () => {
    const sp = parsePath("M 100 100 L 200 100 L 200 200 Z m -50 -50 L 50 -50 L 50 50 Z");
    expect(sp).toHaveLength(2);
    // 第二个子路径的起点 = 上一个子路径的起点 + (-50,-50) = (50,50)
    expect(sp[1][0].x).toBeCloseTo(50, 6);
    expect(sp[1][0].y).toBeCloseTo(50, 6);
  });

  it("路径开头的相对 m 相对原点", () => {
    const sp = parsePath("m 30 40 l 10 0");
    expect(sp[0][0].x).toBeCloseTo(30, 6);
    expect(sp[0][0].y).toBeCloseTo(40, 6);
  });

  it("z 之后的相对 m 与绝对 m 不等价", () => {
    const rel = parsePath("M 100 100 L 200 100 Z m -50 -50 L 0 0");
    const abs = parsePath("M 100 100 L 200 100 Z M -50 -50 L 0 0");
    expect(rel[1][0].x).not.toBeCloseTo(abs[1][0].x, 6);
    expect(rel[1][0].x).toBeCloseTo(50, 6);
  });
});

describe("centroidOf", () => {  it("矩形的质心在中心", () => {
    const c = centroidOf([[
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 0 },
    ]]);
    expect(c.x).toBeCloseTo(5, 6);
    expect(c.y).toBeCloseTo(10, 6);
  });

  it("开放折线按弧长取中点", () => {
    const c = centroidOf([[{ x: 0, y: 0 }, { x: 10, y: 0 }]]);
    expect(c.x).toBeCloseTo(5, 6);
    expect(c.y).toBeCloseTo(0, 6);
  });

  it("两段等长折线的质心在两段中点之间", () => {
    const c = centroidOf([
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      [{ x: 10, y: 0 }, { x: 20, y: 0 }],
    ]);
    expect(c.x).toBeCloseTo(10, 6);
  });

  it("空输入返回原点", () => {
    const c = centroidOf([]);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });
});
