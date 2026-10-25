/**
 * E5 笔画度量与统计。
 *
 * 教学应用要的「这个字几笔」「哪一笔最长」「笔画方向分布」这些，
 * 都从字形本身算出来，不查表。
 */

import type { Glyph } from "../glyph.ts";
import { isStrokeGlyph } from "../glyph.ts";
import { boundsOf, type Point, type Rect } from "../geometry/path.ts";
import { centroid } from "../geometry/sample.ts";
import { splitStrokes, type Stroke } from "../structure/strokes.ts";

/** 笔画统计。 */
export interface StrokeStats {
  /** 笔画数。 */
  count: number;
  /** 笔画总长。 */
  totalLength: number;
  /** 最长的一笔的长度。 */
  longestLength: number;
  /** 平均笔画长。 */
  meanLength: number;
  /** 笔画方向直方图（8 个方向，按 22.5° 分箱）。 */
  directionHistogram: number[];
  /** 全部笔画的质心。 */
  centroid: Point;
  /** 全部笔画的��接框。 */
  bounds: Rect;
  /** 每一笔的长度占比。 */
  lengthRatio: number[];
}

/** 方向分箱数。 */
const DIRECTION_BINS = 8;

/**
 * 笔画统计。
 *
 * 方向直方图对**描边型**（甲骨骨架）才有意义——折线有明确走向；
 * 填充型（摹本轮廓）的轮廓点走向是任意的，统计出来没有解释力。
 * 填充型会退化成按轮廓主方向统计，并在 `directionHistogram` 里照常返回。
 */
export function strokeStats(glyph: Glyph): StrokeStats {
  const strokes = splitStrokes(glyph);
  const lengths = strokes.map((s) => s.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const longest = lengths.length > 0 ? Math.max(...lengths) : 0;

  const histogram = new Array<number>(DIRECTION_BINS).fill(0);
  for (const s of strokes) {
    const bin = directionBin(s.angle);
    histogram[bin] += 1;
  }

  const all = glyph.paths.flatMap((p) => p.subpaths);
  const pts = all.flat();

  return {
    count: strokes.length,
    totalLength: total,
    longestLength: longest,
    meanLength: strokes.length > 0 ? total / strokes.length : 0,
    directionHistogram: histogram,
    centroid: centroid(pts),
    bounds: boundsOf(all),
    lengthRatio: lengths.map((l) => (total > 0 ? l / total : 0)),
  };
}

/** 角度（弧度）落到哪个方向箱。 */
function directionBin(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  // 方向是无向的：横与竖各有 180° 周期
  const bin = Math.floor((a / Math.PI) * DIRECTION_BINS) % DIRECTION_BINS;
  return bin;
}

/**
 * 笔顺检查：给一串笔画下标，判断它是否是一个合法的书写顺序。
 *
 * 「合法」的定义：每一笔都要么与前一笔相接（端点重合或接近），
 * 要么是**独立的**（如「三」的三横彼此不接）。
 *
 * **两种字形要分开说**：
 * - **描边型（甲骨骨架）**：文件里的出现顺序**就是落笔顺序**（构造如此），
 *   笔画彼此独立是常态。所以「不相接」只是事实，**推不出「笔序有误」**——
 *   早先这里一律报「笔序可能有误」，对甲骨字是纯误报。
 * - **填充型（摹本轮廓）**：路径顺序**不承载**笔顺信息。
 *   给出的顺序若首尾不接，只能说「这一串不像一条连续的笔顺」。
 */
export interface OrderCheck {
  /** 是否通过。 */
  ok: boolean;
  /** 第一个可疑的笔画下标。 */
  suspectIndex: number;
  /** 原因说明。 */
  reason: string;
}

/** 检查笔顺。 */
export function checkStrokeOrder(glyph: Glyph, order: number[]): OrderCheck {
  const strokes = splitStrokes(glyph);
  if (order.length !== strokes.length) {
    return { ok: false, suspectIndex: -1, reason: `笔序长度 ${order.length} 与笔画数 ${strokes.length} 不符` };
  }
  const skeleton = isStrokeGlyph(glyph);
  for (let i = 1; i < order.length; i += 1) {
    const prev = strokes[order[i - 1]];
    const cur = strokes[order[i]];
    if (!prev || !cur) continue;
    // 上一笔的终点应当靠近这一笔的起点（起点 = 折线的第一个点）
    const end = prev.points[prev.points.length - 1];
    const start = cur.points[0];
    if (!end || !start) continue;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const scale = Math.max(prev.length, cur.length, 1);
    if (dist > scale * 0.6) {
      if (skeleton) {
        // 骨架：不相接是常态，文件顺序即落笔顺序——没有「笔序错」这回事可查
        return {
          ok: true,
          suspectIndex: i,
          reason: `第 ${i} 笔与上一笔不衔接（骨架字形的笔画各自独立，文件顺序即落笔顺序，无笔序错误可查）`,
        };
      }
      return {
        ok: false,
        suspectIndex: i,
        reason: `第 ${i} 笔与上一笔相距 ${dist.toFixed(1)}，这一串不像一条连续的笔顺` +
          `（摹本字形的路径顺序本就不承载笔顺信息）`,
      };
    }
  }
  return { ok: true, suspectIndex: -1, reason: "笔序连贯" };
}

export type { Stroke };
