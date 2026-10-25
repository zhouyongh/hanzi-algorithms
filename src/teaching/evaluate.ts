/**
 * E2 描红评分：把学生写的与范字逐笔比对。
 *
 * 教学应用最需要的一个算法——「你写的这一笔得了 0.8 分」「整体形似度 72%」。
 *
 * 两层评分：
 * - **整体形似度**：两个字的墨量交并比（IoU）；
 * - **逐笔得分**：目标字形的每一笔，在学生写的里找最接近的一笔，
 *   用覆盖率和精确率的调和平均当得分——这样「写偏了」和「写多了」都会扣分。
 *
 * 外加一项**笔顺**检查：逐笔得分是按**形状**算的，所以「第 1 笔和第 2 笔的
 * 形状写反了」也拿满分——对描红教学是漏洞。这里单独判笔顺，不对时扣两成。
 *
 * 比对前会把两边**按墨迹外接框归一化**（可选），所以考的是形而不是位置大小；
 * 如果要连位置一起考，用 `normalize: "canvas"`。
 */

import type { Glyph } from "../glyph.ts";
import { glyphStrokes, isStrokeGlyph } from "../glyph.ts";
import { boundsOf, type Point, type Rect } from "../geometry/path.ts";
import { centroid } from "../geometry/sample.ts";
import { fitToBox } from "../geometry/transform.ts";
import { countInk, rasterizeGlyph, type Mask } from "../raster/mask.ts";

/** 逐笔得分。 */
export interface StrokeScore {
  /** 范字里的笔画下标。 */
  target: number;
  /** 学生写的最接近的笔画下标；-1 表示没有可比的。 */
  attempt: number;
  /** 这一笔的得分 [0, 1]。 */
  score: number;
  /** 覆盖率：范字这一笔被学生笔画盖住的比例。 */
  coverage: number;
  /** 精确率：学生这一笔画在范字笔画里的比例。 */
  precision: number;
}

/** 描红评分结果。 */
export interface TracingEvaluation {
  /** 总分 [0, 1]：整体形似度与逐笔得分的加权。 */
  score: number;
  /** 整体形似度（墨量交并比）。 */
  iou: number;
  /** 逐笔得分。 */
  strokes: StrokeScore[];
  /** 写对（得分达标）的笔画数。 */
  correct: number;
  /** 范字的总笔画数。 */
  total: number;
  /** 最不像的那一笔（用于提示学生重写哪一笔）。 */
  worstStroke: number;
  /** 学生多写出来的笔画（不在范字对应位置上的）。 */
  extraStrokes: number[];
  /**
   * 学生的**笔顺**是否与范字一致。
   *
   * 逐笔得分是**按形状**算的（这一笔像不像那一笔），所以光看形状
   * 「把第 1 笔和第 2 笔的形状写反了」也拿满分——对描红教学是漏洞。
   * 这里单独判：学生写的每一笔最像范字的哪一笔，这些「像的编号」
   * 应当递增；不递增就是笔顺写反了。
   */
  orderCorrect: boolean;
  /** 笔顺问题的说明（没问题时为空）。 */
  orderNote: string;
}

/** 评分参数。 */
export interface EvaluateOptions {
  /** 比对分辨率。 */
  resolution?: number;
  /** 归一化方式：`bbox` 只比形，`canvas` 连位置一起比。 */
  normalize?: "bbox" | "canvas";
  /** 判定「这一笔写对」的得分门槛。 */
  passThreshold?: number;
  /**
   * 笔顺写反时是否扣分（默认扣）。
   *
   * 逐笔得分只按**形状**算，所以「第 1 笔和第 2 笔的形状写反了」也拿满分。
   * 对描红教学这是漏洞：学生得知道顺序错了。
   */
  penalizeOrder?: boolean;
  /** 笔序不对时的扣分系数（默认 0.8，即扣两成）。 */
  orderPenalty?: number;
}

/** 统一画布的描述。 */
interface Frame {
  /** 把「墨迹外接框（用户单位）」映到「目标画布像素」的矩阵。 */
  matrix: ReturnType<typeof fitToBox>;
  /** 画布边长。 */
  resolution: number;
  /** 掩膜对应的 SVG viewBox（掩膜像素 ↔ 用户单位）。 */
  svgViewBox: Rect;
}

/** 一条笔画在给定画布上的墨量掩膜。 */
function strokeMask(
  glyph: Glyph,
  pathIndex: number,
  frame: Frame,
): Mask {
  const p = glyph.paths[pathIndex];
  const strokes = isStrokeGlyph(glyph)
    ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }]
    : undefined;
  const mask = rasterizeGlyph(p.subpaths, {
    width: frame.resolution,
    height: frame.resolution,
    viewBox: glyph.viewBox,
    strokes,
  });
  // 应用归一化：把掩膜按整字的外接框映射到统一画布
  return applyFrame(mask, frame);
}

/** 把一个画布内的掩膜映射到统一坐标系。 */
function applyFrame(mask: Mask, frame: Frame): Mask {
  const out = rasterizeGlyph([], {
    width: frame.resolution,
    height: frame.resolution,
    viewBox: { x: 0, y: 0, width: 1, height: 1 },
  });
  // 源掩膜像素 → 源用户单位 → 目标像素
  const m = frame.matrix;
  const vb = frame.svgViewBox;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.data[y * mask.width + x]) continue;
      const ux = vb.x + ((x + 0.5) * vb.width) / mask.width;
      const uy = vb.y + ((y + 0.5) * vb.height) / mask.height;
      const tx = m.a * ux + m.c * uy + m.e;
      const ty = m.b * ux + m.d * uy + m.f;
      const px = Math.floor(tx);
      const py = Math.floor(ty);
      if (px >= 0 && py >= 0 && px < frame.resolution && py < frame.resolution) {
        out.data[py * frame.resolution + px] = 1;
      }
    }
  }
  return out;
}

/** 为一个字形准备「统一画布」：按墨迹外接框等比居中。 */
function makeFrame(glyph: Glyph, resolution: number, normalize: "bbox" | "canvas"): Frame {
  const all = glyph.paths.flatMap((p) => p.subpaths);
  const ink = boundsOf(all);
  const target = normalize === "bbox"
    ? { x: resolution * 0.04, y: resolution * 0.04, width: resolution * 0.92, height: resolution * 0.92 }
    : { x: 0, y: 0, width: resolution, height: resolution };
  const matrix = fitToBox(ink, target, true);
  return { matrix, resolution, svgViewBox: glyph.viewBox };
}

/** 两个掩膜的交集像素数。 */
function intersect(a: Mask, b: Mask): number {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  let n = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (a.data[y * a.width + x] && b.data[y * b.width + x]) n += 1;
    }
  }
  return n;
}

/**
 * 描红评分。
 *
 * @param target  范字
 * @param attempt 学生写的（字形或已光栅化的掩膜）
 */
export function evaluateTracing(
  target: Glyph,
  attempt: Glyph | Mask,
  options: EvaluateOptions = {},
): TracingEvaluation {
  const resolution = options.resolution ?? 128;
  const normalize = options.normalize ?? "bbox";
  const passThreshold = options.passThreshold ?? 0.55;

  const tFrame = makeFrame(target, resolution, normalize);
  const targetFull = rasterizeGlyph(target.paths.flatMap((p) => p.subpaths), {
    width: resolution,
    height: resolution,
    viewBox: target.viewBox,
    strokes: isStrokeGlyph(target) ? glyphStrokes(target) : undefined,
  });
  const targetFullN = applyFrame(targetFull, tFrame);

  let attemptFull: Mask;
  let attemptFrame: typeof tFrame;
  if (isMask(attempt)) {
    attemptFrame = tFrame;
    attemptFull = attempt;
  } else {
    attemptFrame = makeFrame(attempt, resolution, normalize);
    const raw = rasterizeGlyph(attempt.paths.flatMap((p) => p.subpaths), {
      width: resolution,
      height: resolution,
      viewBox: attempt.viewBox,
      strokes: isStrokeGlyph(attempt) ? glyphStrokes(attempt) : undefined,
    });
    attemptFull = applyFrame(raw, attemptFrame);
  }

  // 整体形似度
  const inter = intersect(targetFullN, attemptFull);
  const union = countInk(targetFullN) + countInk(attemptFull) - inter;
  const iou = union > 0 ? inter / union : 0;

  // 逐笔
  const targetMasks = target.paths.map((_, i) => strokeMask(target, i, tFrame));
  const attemptMasks = isMask(attempt)
    ? []
    : attempt.paths.map((_, i) => strokeMask(attempt, i, attemptFrame));

  const strokes: StrokeScore[] = [];
  const usedAttempts = new Set<number>();
  for (let ti = 0; ti < targetMasks.length; ti += 1) {
    const tm = targetMasks[ti];
    const tInk = countInk(tm);
    if (tInk === 0) {
      strokes.push({ target: ti, attempt: -1, score: 0, coverage: 0, precision: 0 });
      continue;
    }
    let bestIdx = -1;
    let bestScore = 0;
    let bestCoverage = 0;
    let bestPrecision = 0;
    for (let ai = 0; ai < attemptMasks.length; ai += 1) {
      const am = attemptMasks[ai];
      const aInk = countInk(am);
      if (aInk === 0) continue;
      const ov = intersect(tm, am);
      const coverage = ov / tInk;
      const precision = ov / aInk;
      const score = coverage + precision > 0 ? (2 * coverage * precision) / (coverage + precision) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = ai;
        bestCoverage = coverage;
        bestPrecision = precision;
      }
    }
    if (bestIdx >= 0) usedAttempts.add(bestIdx);
    strokes.push({
      target: ti,
      attempt: bestIdx,
      score: bestScore,
      coverage: bestCoverage,
      precision: bestPrecision,
    });
  }

  const correct = strokes.filter((s) => s.score >= passThreshold).length;
  const meanStroke = strokes.length > 0
    ? strokes.reduce((s, x) => s + x.score, 0) / strokes.length
    : 0;
  const worst = strokes.reduce((w, s, i) => (s.score < (strokes[w]?.score ?? 1) ? i : w), 0);

  const extraStrokes = attemptMasks
    .map((_, i) => i)
    .filter((i) => !usedAttempts.has(i));

  // ── 笔顺 ──────────────────────────────────────────────────
  // 逐笔得分只按**形状**算，笔顺没参与——「把第 1 笔和第 2 笔的形状写反了」
  // 照样满分。这里单独判：学生的每一笔最像范字的哪一笔，这些编号应当递增。
  const orderMap = attemptMasks.map((am) => {
    let best = -1;
    let bestScore = 0;
    targetMasks.forEach((tm, ti) => {
      const s = strokePairScore(tm, am);
      if (s > bestScore) { bestScore = s; best = ti; }
    });
    return best;
  });
  let orderCorrect = true;
  let orderNote = "";
  for (let i = 1; i < orderMap.length; i += 1) {
    if (orderMap[i] >= 0 && orderMap[i - 1] >= 0 && orderMap[i] < orderMap[i - 1]) {
      orderCorrect = false;
      orderNote = `第 ${i + 1} 笔写成了第 ${orderMap[i] + 1} 笔的样子——笔顺反了`;
      break;
    }
  }

  const raw = iou * 0.4 + meanStroke * 0.6;
  const penalizeOrder = options.penalizeOrder ?? true;
  const orderPenalty = options.orderPenalty ?? 0.8;
  const score = !orderCorrect && penalizeOrder ? raw * orderPenalty : raw;

  return {
    score,
    iou,
    strokes,
    correct,
    total: strokes.length,
    worstStroke: strokes.length > 0 ? worst : -1,
    extraStrokes,
    orderCorrect,
    orderNote,
  };
}

/** 两笔的形状相似度（覆盖与精确的调和平均）。 */
function strokePairScore(target: Mask, attempt: Mask): number {
  const tInk = countInk(target);
  const aInk = countInk(attempt);
  if (tInk === 0 || aInk === 0) return 0;
  const ov = intersect(target, attempt);
  const coverage = ov / tInk;
  const precision = ov / aInk;
  return coverage + precision > 0 ? (2 * coverage * precision) / (coverage + precision) : 0;
}

/** 判断是不是掩膜（而不是字形）。 */
function isMask(x: Glyph | Mask): x is Mask {
  return "data" in x && "width" in x;
}

/** 字的墨量质心（辅助：判断学生写得偏不偏）。 */
export function inkCentroid(glyph: Glyph): Point {
  const all = glyph.paths.flatMap((p) => p.subpaths).flat();
  return centroid(all);
}
