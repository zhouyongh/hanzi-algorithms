/**
 * 摹本轮廓 → 笔画中线（中心线）。
 *
 * 为什么需要：摹本的一笔是**闭合轮廓**（一圈描边），不是一条线。
 * 而隶变、描红这类算法要作用在**笔势线**上——「圆转方折」说的是笔画中段的转折，
 * 「波磔」说的是收笔的走势，这些都长在中线上，不长在轮廓上。
 *
 * 直接对闭合轮廓做折线简化与加尾巴会得到一团乱麻：轮廓是首尾相接的环，
 * 简化算法会把环压扁，而「末端追加波峰」加在环上就是凭空长出一个尖刺。
 * 早先的隶变演示就是这么变成「一团乱」的。
 *
 * 这里的做法是**对边配对**：
 *
 * 1. 把闭合轮廓按弧长均匀重采样；
 * 2. 取主轴（PCA 第一主成分），沿主轴投影找到轮廓的两个**端点**；
 * 3. 沿轮廓走一圈，得到「上边」与「下边」两条弧；
 * 4. 两条弧按弧长等比配对，逐对取中点 → 中线；两点距离的一半 → 该处的半宽。
 *
 * 前提是轮廓确实包着**一条细长的笔画**。点、块状笔画会退化，
 * 这时返回 `null`——算法不会假装自己能处理。
 */

import type { Point, SubPath } from "./path.ts";
import { polylineLength } from "./path.ts";
import { principalAngle, resampleByArcLength, resampleClosed } from "./sample.ts";

/** 笔画中线。 */
export interface Centerline {
  /** 中线点列：从一端到另一端。 */
  points: Point[];
  /** 每个中线点对应的半宽（到轮廓的距离）。 */
  halfWidths: number[];
  /** 中线长度。 */
  length: number;
}

/** 两条弧配对时的采样点数。 */
const DEFAULT_SAMPLES = 48;

/**
 * 把一条闭合轮廓转成中线。
 *
 * @returns 退化轮廓（点数太少、blob 状）时返回 `null`
 */
export function contourToCenterline(sp: SubPath, samples = DEFAULT_SAMPLES): Centerline | null {
  if (sp.length < 3) return null;
  const n = Math.max(8, samples * 2);
  const ring = resampleClosed(sp, n);
  if (ring.length < 8) return null;

  // 主轴：沿它投影，两端就是笔画的起止
  const angle = principalAngle(ring);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;

  let i0 = 0;
  let i1 = 0;
  let t0 = Infinity;
  let t1 = -Infinity;
  for (let i = 0; i < ring.length; i += 1) {
    const t = (ring[i].x - cx) * ux + (ring[i].y - cy) * uy;
    if (t < t0) { t0 = t; i0 = i; }
    if (t > t1) { t1 = t; i1 = i; }
  }
  if (t1 - t0 <= 1e-9) return null;

  // 两条弧：从 i0 走到 i1，和从 i1 走到 i0
  const sideA: Point[] = [];
  for (let i = i0; ; i = (i + 1) % ring.length) {
    sideA.push(ring[i]);
    if (i === i1) break;
  }
  const sideB: Point[] = [];
  for (let i = i1; ; i = (i + 1) % ring.length) {
    sideB.push(ring[i]);
    if (i === i0) break;
  }
  if (sideA.length < 2 || sideB.length < 2) return null;

  const a = resampleByArcLength(sideA, samples);
  const b = resampleByArcLength(sideB, samples);
  if (a.length < 2 || b.length < 2) return null;

  const points: Point[] = [];
  const halfWidths: number[] = [];
  for (let k = 0; k < samples; k += 1) {
    const p = a[k];
    const q = b[samples - 1 - k];
    points.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    halfWidths.push(Math.hypot(p.x - q.x, p.y - q.y) / 2);
  }

  const length = polylineLength(points);
  // 退化：blob 状轮廓（点、块）配出来的是一条几乎不动的线
  if (length <= 1e-6) return null;
  const maxHalf = Math.max(...halfWidths);
  if (maxHalf <= 1e-6) return null;

  // 块状轮廓的另一个判据：**配出来的「笔画」得能解释这圈墨**。
  //
  // 一条笔画的轮廓周长约等于「两倍笔画长 + 两端笔头」，
  // 所以中线长至少得是半周长的 0.75 倍。实测：
  // - 横笔画 100×10：周长 220、中线 100 → 比值 0.91，通过；
  // - 40×40 方块：周长 160、中线 56.6（沿对角线）→ 比值 0.71，**判为块状**；
  // - 圆：周长 125.7、中线 40 → 比值 0.64，判为块状。
  //
  // 不加这条判据，块状笔画会被重建成一条斜穿过去的带子——比不改还糟。
  const perimeter = polylineLength(ring);
  if (length < 0.75 * (perimeter / 2)) return null;

  return { points, halfWidths, length };
}

/**
 * 由中线重新撑出一个闭合轮廓。
 *
 * 半宽沿中线插值——中线被加长（波磔）时用末端的半宽续上。
 */
export function outlineFromCenterline(
  center: Centerline,
  options: { samples?: number; halfWidthScale?: number } = {},
): SubPath {
  const pts = center.points;
  if (pts.length < 2) return [];
  const scale = options.halfWidthScale ?? 1;
  const halfAt = (t: number): number => {
    if (center.halfWidths.length === 0) return 0;
    const idx = Math.max(0, Math.min(center.halfWidths.length - 1, Math.round(t * (center.halfWidths.length - 1))));
    return center.halfWidths[idx] * scale;
  };

  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * halfAt(i / (pts.length - 1));
    const ny = (dx / len) * halfAt(i / (pts.length - 1));
    left.push({ x: pts[i].x + nx, y: pts[i].y + ny });
    right.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  right.reverse();
  return [...left, ...right];
}
