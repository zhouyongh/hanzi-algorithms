/**
 * 弧长重采样与点集度量。
 *
 * 跨书体形变的核心是「把两个不同点数的轮廓变成同样点数，再逐点插值」。
 * 关键在于重采样必须**按弧长等距**——按参数等距会在曲率大的地方稀疏、
 * 在平直段过密，插出来的中间形会走形。
 */

import type { Point, SubPath } from "./path.ts";
import { polylineLength } from "./path.ts";

/**
 * 按弧长把折线等距重采样为 `count` 个点。
 *
 * 开放折线：首尾各取一个端点。闭合折线：首尾重合（`count` 个点覆盖一整圈）。
 * 长度为零的折线返回首点重复。
 */
export function resampleByArcLength(points: SubPath, count: number): Point[] {
  if (count <= 0) return [];
  if (points.length === 0) return [];
  if (points.length === 1) return new Array<Point>(count).fill({ ...points[0] });

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(
      cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return new Array<Point>(count).fill({ ...points[0] });

  const out: Point[] = [];
  for (let k = 0; k < count; k += 1) {
    const target = (total * k) / (count - 1);
    let j = 1;
    while (j < cumulative.length - 1 && cumulative[j] < target) j += 1;
    const segStart = cumulative[j - 1];
    const segLen = cumulative[j] - segStart;
    const u = segLen <= 0 ? 0 : (target - segStart) / segLen;
    out.push({
      x: points[j - 1].x + u * (points[j].x - points[j - 1].x),
      y: points[j - 1].y + u * (points[j].y - points[j - 1].y),
    });
  }
  return out;
}

/**
 * 闭合轮廓的等距重采样。
 *
 * 与开放折线的区别：闭合轮廓没有「首尾两端」，一圈上等距取 `count` 个点，
 * 首尾不重复。用于形变插值时，两端必须用同一种约定，否则会有一根「跳线」。
 */
export function resampleClosed(points: SubPath, count: number): Point[] {
  if (count <= 0) return [];
  if (points.length < 2) return new Array<Point>(count).fill({ ...(points[0] ?? { x: 0, y: 0 }) });

  const ring = points.slice();
  if (ring[0].x !== ring[ring.length - 1].x || ring[0].y !== ring[ring.length - 1].y) {
    ring.push({ ...ring[0] });
  }
  const cumulative: number[] = [0];
  for (let i = 1; i < ring.length; i += 1) {
    cumulative.push(
      cumulative[i - 1] + Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y),
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return new Array<Point>(count).fill({ ...ring[0] });

  const out: Point[] = [];
  for (let k = 0; k < count; k += 1) {
    const target = (total * k) / count;
    let j = 1;
    while (j < cumulative.length - 1 && cumulative[j] < target) j += 1;
    const segStart = cumulative[j - 1];
    const segLen = cumulative[j] - segStart;
    const u = segLen <= 0 ? 0 : (target - segStart) / segLen;
    out.push({
      x: ring[j - 1].x + u * (ring[j].x - ring[j - 1].x),
      y: ring[j - 1].y + u * (ring[j].y - ring[j - 1].y),
    });
  }
  return out;
}

/** 点集算术平均（质心）。 */
export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  return { x: sx / points.length, y: sy / points.length };
}

/** 点到线段的距离。 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** 点到折线的最短距离。 */
export function distanceToPolyline(p: Point, poly: SubPath): number {
  if (poly.length === 0) return Infinity;
  if (poly.length === 1) return Math.hypot(p.x - poly[0].x, p.y - poly[0].y);
  let best = Infinity;
  for (let i = 1; i < poly.length; i += 1) {
    const d = distanceToSegment(p, poly[i - 1], poly[i]);
    if (d < best) best = d;
  }
  return best;
}

/** 折线的主方向（PCA 第一主成分的角度，弧度）。 */
export function principalAngle(points: Point[]): number {
  if (points.length < 2) return 0;
  const c = centroid(points);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  return 0.5 * Math.atan2(2 * sxy, sxx - syy);
}

/** 折线总长（便捷封装）。 */
export { polylineLength };
