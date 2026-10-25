/**
 * C1 跨书体形变插值。
 *
 * 把两个书体的同一个字连成一条连续可变的曲线：甲骨 → 金文 → 篆 → 隶。
 *
 * 数学上很简单——**弧长等距重采样到同一点数，然后逐点线性插值**。难的是
 * 前面两步：归一化（不同书体画布大小、留白不同）与对应（哪一笔配哪一笔）。
 *
 * 诚实度：插值出来的中间形是**算法生成的过渡形**，不是任何一个历史书体的
 * 真摹本。调用方必须在界面上说明这一点，否则就是在教错东西。
 */

import type { Glyph, GlyphPath } from "../glyph.ts";
import { isStrokeGlyph } from "../glyph.ts";
import { boundsOf, type Point, type SubPath } from "../geometry/path.ts";
import { resampleClosed } from "../geometry/sample.ts";
import { applyAll, fitToBox, type Matrix } from "../geometry/transform.ts";
import { correspondStrokes, type CorrespondOptions } from "./correspond.ts";

/** 插值参数。 */
export interface InterpolationOptions extends CorrespondOptions {
  /** 每条轮廓重采样点数。 */
  samples?: number;
  /** 归一化时的画布尺寸。 */
  resolution?: number;
}

/**
 * 把一条折线（描边型的笔画）转成**闭合的带状轮廓**。
 *
 * 为什么需要：甲骨骨架的笔画是**折线**（开放路径），而摹本轮廓是**闭合轮廓**。
 * 形变插值只能在同一种形态之间做——把折线直接当闭合轮廓去插值，
 * 填充后就是一坨黑块（实测「日」的中间态整个糊成实心）。
 * 所以先把折线按笔宽左右偏移成一条闭合的带，两边就统一了。
 */
export function strokeToContour(points: Point[], halfWidth: number): SubPath {
  if (points.length < 2) return [];
  const hw = Math.max(halfWidth, 1e-6);
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * hw;
    const ny = (dx / len) * hw;
    left.push({ x: points[i].x + nx, y: points[i].y + ny });
    right.push({ x: points[i].x - nx, y: points[i].y - ny });
  }
  right.reverse();
  return [...left, ...right];
}

/** 把字形按墨迹外接框等比归一化到 `resolution × resolution` 画布。 */
export function normalizeGlyph(glyph: Glyph, resolution = 200): { glyph: Glyph; matrix: Matrix } {
  const all = glyph.paths.flatMap((p) => p.subpaths);
  const b = boundsOf(all);
  const box = {
    x: resolution * 0.04,
    y: resolution * 0.04,
    width: resolution * 0.92,
    height: resolution * 0.92,
  };
  const matrix = fitToBox(b, box, true);
  const skeleton = isStrokeGlyph(glyph);
  const paths: GlyphPath[] = glyph.paths.map((p) => {
    // 描边型：折线先转成闭合的带，再归一化——否则插值出来是一坨实心块
    const src = skeleton
      ? p.subpaths.map((sp) => strokeToContour(sp, p.strokeWidth / 2)).filter((sp) => sp.length >= 2)
      : p.subpaths;
    const moved = src.map((sp) => applyAll(matrix, sp));
    return {
      subpaths: moved,
      strokeWidth: 0,
      filled: true,
      bounds: boundsOf(moved),
    };
  });
  return {
    glyph: {
      viewBox: { x: 0, y: 0, width: resolution, height: resolution },
      paths,
      bounds: boundsOf(paths.flatMap((p) => p.subpaths)),
    },
    matrix,
  };
}

/**
 * 子路径的点是否都是有限值。
 *
 * 退化输入（NaN / Infinity 坐标）不能进插值——算出来的路径带 NaN，
 * 交给 SVG 会整条画不出来。宁可丢掉这一条，也不要产出一个坏路径。
 */
function isFiniteSubpath(sp: SubPath): boolean {
  if (sp.length < 2) return false;
  for (const p of sp) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  }
  return true;
}

/**
 * 取一条路径里最长的子路径。
 *
 * 留着是因为「一条路径里哪一段是主体」这个问题本身还会用到；
 * 但**插值不再用它**——只用最长的一条会把摹本的洞丢掉（见 `interpolateDetailed`）。
 */
export function longestSubpath(subpaths: SubPath[]): SubPath {
  let best: SubPath = [];
  let bestLen = -1;
  for (const sp of subpaths) {
    let len = 0;
    for (let i = 1; i < sp.length; i += 1) {
      len += Math.hypot(sp[i].x - sp[i - 1].x, sp[i].y - sp[i - 1].y);
    }
    if (len > bestLen) {
      bestLen = len;
      best = sp;
    }
  }
  return best;
}

/** 两条闭合轮廓之间的插值。 */
export function interpolateContours(
  a: SubPath,
  b: SubPath,
  t: number,
  samples = 64,
): SubPath {
  if (a.length < 2) return b.map((p) => ({ ...p }));
  if (b.length < 2) return a.map((p) => ({ ...p }));
  const pa = resampleClosed(a, samples);
  const pb = resampleClosed(b, samples);
  const out: Point[] = [];
  for (let i = 0; i < samples; i += 1) {
    out.push({
      x: pa[i].x + (pb[i].x - pa[i].x) * t,
      y: pa[i].y + (pb[i].y - pa[i].y) * t,
    });
  }
  return out;
}

/** 一组点围绕自身质心缩放。 */
function scaleAboutCentroid(points: Point[], factor: number): Point[] {
  if (points.length === 0) return points;
  let sx = 0;
  let sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const cx = sx / points.length;
  const cy = sy / points.length;
  return points.map((p) => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
}

/**
 * 输出笔画在演变中的角色。
 *
 * 用户要能一眼看出「哪几笔在演变、哪一笔隐藏了、哪两笔浮出来了」，
 * 所以插值不能只吐一个 Glyph——还得说清每条输出笔画的来历。
 */
export type StrokeRole = "morph" | "appear" | "disappear";

/** 插值的详细结果。 */
export interface DetailedInterpolation {
  /** 插值出来的字形（`paths` 与 `roles` 一一对应）。 */
  glyph: Glyph;
  /** 每条输出笔画的角色。 */
  roles: StrokeRole[];
  /** 笔画对应关系。 */
  correspond: ReturnType<typeof correspondStrokes>;
  /** 各类笔画的条数。 */
  stats: { morphed: number; appeared: number; disappeared: number };
}

/**
 * 生成两个书体字形之间的中间形，**并说明每条笔画从哪来**。
 *
 * @param t 0 = 完全等于 `from`，1 = 完全等于 `to`
 */
export function interpolateDetailed(
  from: Glyph,
  to: Glyph,
  t: number,
  options: InterpolationOptions = {},
): DetailedInterpolation {
  const samples = options.samples ?? 64;
  const resolution = options.resolution ?? 200;
  const clamped = Math.max(0, Math.min(1, t));

  const normFrom = normalizeGlyph(from, resolution).glyph;
  const normTo = normalizeGlyph(to, resolution).glyph;
  const corr = correspondStrokes(normFrom, normTo, options);

  const paths: GlyphPath[] = [];
  const roles: StrokeRole[] = [];
  const consumedTo = new Set<number>();

  for (const pair of corr.pairs) {
    // 逐条**子路径**插值，不是只取最长的一条。
    //
    // 摹本的一笔常常含多个子路径：外面一圈轮廓 + 里面几个反向绕向的洞
    // （小篆「日」就是外轮廓加两个洞）。只取最长的一条，
    // **洞就没了**——t=0 时输出的墨量比源字形多出一大截
    // （实测篆书「明」11088 vs 7447），「t=0 完全等于源字形」这个承诺就破了。
    const subsA = normFrom.paths[pair.from]?.subpaths ?? [];
    const subsB = normTo.paths[pair.to]?.subpaths ?? [];
    const midSubs: SubPath[] = [];
    const count = Math.max(subsA.length, subsB.length);
    for (let k = 0; k < count; k += 1) {
      const a = subsA[k] ?? [];
      const b = subsB[k] ?? [];
      if (a.length >= 2 && b.length >= 2 && isFiniteSubpath(a) && isFiniteSubpath(b)) {
        midSubs.push(interpolateContours(a, b, clamped, samples));
      } else if (a.length >= 2) {
        // 源有、目标无 → 这一小块随 t 消失
        midSubs.push(scaleAboutCentroid(a, 1 - clamped));
      } else if (b.length >= 2) {
        // 目标有、源无 → 这一小块随 t 浮出
        midSubs.push(scaleAboutCentroid(b, clamped));
      }
    }
    if (midSubs.length === 0) continue;
    paths.push({ subpaths: midSubs, strokeWidth: 0, filled: true, bounds: boundsOf(midSubs) });
    roles.push("morph");
    consumedTo.add(pair.to);
  }

  // 目标字形里没被配上的笔画：随 t **长大**（t=0 时看不见，t=1 时是完整的）
  //
  // 早先写的是 `1 - clamped`（随 t 收缩），方向正好反了——于是 t=1 时目标里
  // 没配上的笔画缩成了零，而源里没配上的笔画反而**长大**了 1.6 倍。
  // 结果是：中间态一堆乱笔，**连 t=1 都不是目标字形**。
  for (let i = 0; i < normTo.paths.length; i += 1) {
    if (consumedTo.has(i)) continue;
    const subs = normTo.paths[i].subpaths.filter(isFiniteSubpath);
    if (subs.length === 0) continue;
    const grown = subs.map((sp) => scaleAboutCentroid(sp, clamped));
    paths.push({ subpaths: grown, strokeWidth: 0, filled: true, bounds: boundsOf(grown) });
    roles.push("appear");
  }

  // 源字形里没被配上的笔画：随 t **消失**（t=0 时是完整的，t=1 时看不见）
  const pairedFrom = new Set(corr.pairs.map((p) => p.from));
  for (let i = 0; i < normFrom.paths.length; i += 1) {
    if (pairedFrom.has(i)) continue;
    const subs = normFrom.paths[i].subpaths.filter(isFiniteSubpath);
    if (subs.length === 0) continue;
    const shrunk = subs.map((sp) => scaleAboutCentroid(sp, 1 - clamped));
    paths.push({ subpaths: shrunk, strokeWidth: 0, filled: true, bounds: boundsOf(shrunk) });
    roles.push("disappear");
  }

  return {
    glyph: {
      viewBox: { x: 0, y: 0, width: resolution, height: resolution },
      paths,
      bounds: boundsOf(paths.flatMap((p) => p.subpaths)),
    },
    roles,
    correspond: corr,
    stats: {
      morphed: roles.filter((r) => r === "morph").length,
      appeared: roles.filter((r) => r === "appear").length,
      disappeared: roles.filter((r) => r === "disappear").length,
    },
  };
}

/**
 * 生成两个书体字形之间的中间形。
 *
 * @param t 0 = 完全等于 `from`，1 = 完全等于 `to`
 */
export function interpolateGlyphs(
  from: Glyph,
  to: Glyph,
  t: number,
  options: InterpolationOptions = {},
): Glyph {
  return interpolateDetailed(from, to, t, options).glyph;
}

/** 生成一条演变序列（等分 t）。 */
export function interpolateSequence(
  from: Glyph,
  to: Glyph,
  steps: number,
  options: InterpolationOptions = {},
): Glyph[] {
  const out: Glyph[] = [];
  const n = Math.max(2, steps);
  for (let i = 0; i < n; i += 1) {
    out.push(interpolateGlyphs(from, to, i / (n - 1), options));
  }
  return out;
}
