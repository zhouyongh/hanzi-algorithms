/**
 * E6 易混字差异对比。
 *
 * 教学里最常问的一句是：「『未』和『末』差在哪儿？」——两个字看着像，
 * 但差一笔。这类问题用眼睛比很费劲，用算法比很干脆。
 *
 * 做法：把两个字各自归一化后**逐笔配对**，配上的算「同笔画」，
 * 配不上的就是「只有它有的笔画」。于是能回答：
 * - 两字共有几笔、各自多出哪几笔；
 * - 每一笔的相似度（覆盖与精确的调和平均）；
 * - 一句话的差异说明。
 */

import type { Glyph } from "../glyph.ts";
import { glyphStrokes, isStrokeGlyph } from "../glyph.ts";
import { boundsOf, type Rect } from "../geometry/path.ts";
import { fitToBox } from "../geometry/transform.ts";
import { countInk, rasterizeGlyph, type Mask } from "../raster/mask.ts";

/** 一对笔画的配对结果。 */
export interface StrokePair {
  /** A 字的笔画下标。 */
  a: number;
  /** B 字的笔画下标。 */
  b: number;
  /** 相似度 [0, 1]。 */
  score: number;
  /** A 这一笔被盖住的比例。 */
  coverage: number;
  /** B 这一笔被盖住的比例（相对 A）。 */
  precision: number;
}

/** 对比结果。 */
export interface GlyphDifference {
  /** 整体形似度（墨量交并比）。 */
  similarity: number;
  /** 配上的笔画。 */
  pairs: StrokePair[];
  /** 只有 A 有的笔画。 */
  onlyA: number[];
  /** 只有 B 有的笔画。 */
  onlyB: number[];
  /** 一句话说明。 */
  summary: string;
}

/** 对比参数。 */
export interface CompareOptions {
  /** 比对分辨率。 */
  resolution?: number;
  /** 配对得分门槛：低于它就算「没配上」。 */
  pairThreshold?: number;
}

/** 归一化画布。 */
interface Frame {
  matrix: ReturnType<typeof fitToBox>;
  resolution: number;
  viewBox: Rect;
}

/**
 * 给两个字形各准备一个画布。
 *
 * **关键：两个字必须用同一个缩放系数。**
 *
 * 早先是各自按**自己的**墨迹外接框缩放（等比居中）。于是比例不同的易混字
 * 会被缩放成不同的形状、再各自居中——「日」（竖长）与「曰」（横长）比出来
 * 几乎没有交集：实测形似只有 11.9%，笔画一对都配不上。
 *
 * 而易混字恰恰是「形状几乎一样、只是比例不同」的一对字——比例差异
 * 不该被归一化抹掉，但更不该把两者错位开。
 *
 * 所以改成：两字的墨迹框**取并集**来定缩放系数（各自以自己的框心居中）。
 * 这样相对大小被保留（「日」真的比「曰」窄高），位置也对齐。
 *
 * 跨书体比较时两者的用户单位不同（甲骨 100 见方、篆书 400 见方），
 * 这时退回各自归一化——跨书体的「像不像」本来就难定义。
 */
function makeFrames(a: Glyph, b: Glyph, resolution: number): { fa: Frame; fb: Frame } {
  const inkA = boundsOf(a.paths.flatMap((p) => p.subpaths));
  const inkB = boundsOf(b.paths.flatMap((p) => p.subpaths));
  const canvas = {
    x: resolution * 0.04, y: resolution * 0.04,
    width: resolution * 0.92, height: resolution * 0.92,
  };
  const sameUnits =
    Math.abs(a.viewBox.width - b.viewBox.width) < 1e-6 &&
    Math.abs(a.viewBox.height - b.viewBox.height) < 1e-6;

  if (sameUnits) {
    const w = Math.max(inkA.width, inkB.width) || 1;
    const h = Math.max(inkA.height, inkB.height) || 1;
    const s = Math.min(canvas.width / w, canvas.height / h);
    const frameFor = (ink: Rect, glyph: Glyph): Frame => ({
      matrix: {
        a: s, b: 0, c: 0, d: s,
        e: canvas.x + canvas.width / 2 - (ink.x + ink.width / 2) * s,
        f: canvas.y + canvas.height / 2 - (ink.y + ink.height / 2) * s,
      },
      resolution,
      viewBox: glyph.viewBox,
    });
    return { fa: frameFor(inkA, a), fb: frameFor(inkB, b) };
  }

  const one = (glyph: Glyph, ink: Rect): Frame => ({
    matrix: fitToBox(ink, canvas, true),
    resolution,
    viewBox: glyph.viewBox,
  });
  return { fa: one(a, inkA), fb: one(b, inkB) };
}

function applyFrame(mask: Mask, frame: Frame): Mask {
  const out = rasterizeGlyph([], {
    width: frame.resolution,
    height: frame.resolution,
    viewBox: { x: 0, y: 0, width: 1, height: 1 },
  });
  const m = frame.matrix;
  const vb = frame.viewBox;
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

/** 某个路径在给定画布上的掩膜。 */
function pathMask(glyph: Glyph, pathIndex: number, frame: Frame): Mask {
  const p = glyph.paths[pathIndex];
  const strokes = isStrokeGlyph(glyph)
    ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }]
    : undefined;
  const raw = rasterizeGlyph(p.subpaths, {
    width: frame.resolution,
    height: frame.resolution,
    viewBox: glyph.viewBox,
    strokes,
  });
  return applyFrame(raw, frame);
}

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
 * 对比两个字形的笔画差异。
 */
export function compareGlyphs(a: Glyph, b: Glyph, options: CompareOptions = {}): GlyphDifference {
  const resolution = options.resolution ?? 128;
  const pairThreshold = options.pairThreshold ?? 0.3;

  const { fa, fb } = makeFrames(a, b, resolution);

  const ma = rasterizeGlyph(a.paths.flatMap((p) => p.subpaths), {
    width: resolution, height: resolution, viewBox: a.viewBox,
    strokes: isStrokeGlyph(a) ? glyphStrokes(a) : undefined,
  });
  const mb = rasterizeGlyph(b.paths.flatMap((p) => p.subpaths), {
    width: resolution, height: resolution, viewBox: b.viewBox,
    strokes: isStrokeGlyph(b) ? glyphStrokes(b) : undefined,
  });
  const na = applyFrame(ma, fa);
  const nb = applyFrame(mb, fb);

  const inter = intersect(na, nb);
  const union = countInk(na) + countInk(nb) - inter;
  const similarity = union > 0 ? inter / union : 0;

  // 逐笔掩膜
  const am = a.paths.map((_, i) => pathMask(a, i, fa));
  const bm = b.paths.map((_, i) => pathMask(b, i, fb));

  // 贪心配对：每次取全局最高分的一对
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const pairs: StrokePair[] = [];
  const cand: StrokePair[] = [];
  for (let i = 0; i < am.length; i += 1) {
    const ia = countInk(am[i]);
    if (ia === 0) continue;
    for (let j = 0; j < bm.length; j += 1) {
      const ib = countInk(bm[j]);
      if (ib === 0) continue;
      const ov = intersect(am[i], bm[j]);
      const coverage = ov / ia;
      const precision = ov / ib;
      const score = coverage + precision > 0 ? (2 * coverage * precision) / (coverage + precision) : 0;
      if (score >= pairThreshold) cand.push({ a: i, b: j, score, coverage, precision });
    }
  }
  cand.sort((x, y) => y.score - x.score);
  for (const c of cand) {
    if (usedA.has(c.a) || usedB.has(c.b)) continue;
    usedA.add(c.a);
    usedB.add(c.b);
    pairs.push(c);
  }

  const onlyA = am.map((_, i) => i).filter((i) => countInk(am[i]) > 0 && !usedA.has(i));
  const onlyB = bm.map((_, i) => i).filter((i) => countInk(bm[i]) > 0 && !usedB.has(i));

  const summary = onlyA.length === 0 && onlyB.length === 0
    ? `两字笔画一一对应，${pairs.length} 笔全部配得上（形似度 ${(similarity * 100).toFixed(0)}%）`
    : `共有 ${pairs.length} 笔；` +
      (onlyA.length > 0 ? `前者另有 ${onlyA.length} 笔（${onlyA.map((i) => i + 1).join("、")}）；` : "") +
      (onlyB.length > 0 ? `后者另有 ${onlyB.length} 笔（${onlyB.map((i) => i + 1).join("、")}）。` : "");

  return { similarity, pairs, onlyA, onlyB, summary };
}
