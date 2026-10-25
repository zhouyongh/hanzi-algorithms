/**
 * 二维仿射变换。
 *
 * 矩阵按 SVG 约定排列：`[a c e; b d f; 0 0 1]`，即
 * `x' = a·x + c·y + e`、`y' = b·x + d·y + f`。
 */

import type { Point, Rect, SubPath } from "./path.ts";

export interface Matrix {
  a: number; b: number; c: number; d: number; e: number; f: number;
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** 矩阵复合：`compose(m2, m1)` 表示先应用 m1 再应用 m2。 */
export function compose(m2: Matrix, m1: Matrix): Matrix {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

/** 矩阵求逆。行列式接近 0 时返回单位阵。 */
export function invert(m: Matrix): Matrix {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) return { ...IDENTITY };
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

/** 平移。 */
export function translate(tx: number, ty: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

/** 缩放。 */
export function scale(sx: number, sy = sx): Matrix {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

/** 绕原点旋转（弧度）。 */
export function rotate(rad: number): Matrix {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** 绕指定点旋转（弧度）。 */
export function rotateAround(pivot: Point, rad: number): Matrix {
  return compose(translate(pivot.x, pivot.y), compose(rotate(rad), translate(-pivot.x, -pivot.y)));
}

/** 绕指定点缩放。 */
export function scaleAround(pivot: Point, sx: number, sy = sx): Matrix {
  return compose(translate(pivot.x, pivot.y), compose(scale(sx, sy), translate(-pivot.x, -pivot.y)));
}

/** 应用矩阵到点。 */
export function apply(m: Matrix, p: Point): Point {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

/** 应用矩阵到点列。 */
export function applyAll(m: Matrix, points: Point[]): Point[] {
  return points.map((p) => apply(m, p));
}

/** 应用矩阵到子路径集合。 */
export function applyToSubpaths(m: Matrix, subpaths: SubPath[]): SubPath[] {
  return subpaths.map((sp) => applyAll(m, sp));
}

/** 应用矩阵到矩形（返回变换后的轴对齐外接盒）。 */
export function applyToRect(m: Matrix, r: Rect): Rect {
  const corners = [
    apply(m, { x: r.x, y: r.y }),
    apply(m, { x: r.x + r.width, y: r.y }),
    apply(m, { x: r.x + r.width, y: r.y + r.height }),
    apply(m, { x: r.x, y: r.y + r.height }),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/**
 * 把源外接盒等比映射到目标外接框（居中）。
 *
 * 字形归一化的标准动作：不同书体的字形画布大小、留白完全不同，比较之前
 * 先统一到「墨迹外接框 + 居中 + 等比」。`uniform` 为真时保持长宽比。
 */
export function fitToBox(src: Rect, dst: Rect, uniform = true): Matrix {
  if (src.width <= 0 || src.height <= 0) return { ...IDENTITY };
  let sx = dst.width / src.width;
  let sy = dst.height / src.height;
  if (uniform) {
    const s = Math.min(sx, sy);
    sx = s;
    sy = s;
  }
  const dx = dst.x + dst.width / 2 - ((src.x + src.width / 2) * sx);
  const dy = dst.y + dst.height / 2 - ((src.y + src.height / 2) * sy);
  return { a: sx, b: 0, c: 0, d: sy, e: dx, f: dy };
}
