/**
 * 归一化互相关（NCC）模板匹配。
 *
 * 这是「在复合字里找出部首」的核心。三个关键设计：
 *
 * 1. **必须用归一化，不能用最大重叠量**。小模板落在密集笔画区时重叠量也很大，
 *    但毫无意义——原型阶段「語」的言部就是这样被匹配到右上角错误位置的。
 *    归一化后，小模板在空旷处得低分、在真实位置得高分。
 *
 * 2. **尺度必须各向异性搜索**。部首作偏旁时会被纵向拉长（实测「手」作偏旁时
 *    横向压缩到 0.50、纵向保持 0.90），等比缩放找不到。
 *
 * 3. **用 FFT 算全图互相关**，位置搜索才有足够速度。
 */

import { connectedComponents, cropToInk, countInk, resizeMaskSmooth, type Mask } from "./mask.ts";
import { fft2d, nextPow2 } from "./fft.ts";

/** 一次匹配的结果。 */
export interface MatchResult {
  /** 归一化互相关得分，理论区间 [-1, 1]，越大越像。 */
  score: number;
  /** 模板左上角在图中的像素坐标。 */
  x: number;
  y: number;
  /** 模板在图中的像素尺寸。 */
  width: number;
  height: number;
  /** 模板相对原图的横向/纵向缩放系数。 */
  fx: number;
  fy: number;
  /** 模板像素落在墨量上的比例（覆盖度）。 */
  coverage: number;
  /** 匹配框内的交并比。 */
  iou: number;
  /** 匹配框的连通域精确率：框内墨量 ÷ 框所触及的全部连通域的墨量。 */
  precision: number;
}

/** 匹配参数。 */
export interface MatchOptions {
  /** 缩放搜索区间。 */
  minScale?: number;
  maxScale?: number;
  /** 粗搜步长。 */
  coarseStep?: number;
  /** 细搜步长（在粗搜最优点附近再搜一轮）。 */
  fineStep?: number;
  /** 细搜的相对邻域半径（以粗搜步长为单位）。 */
  fineRadius?: number;
  /**
   * **各向异性上限**：允许 fx/fy 偏离 1 的最大倍数。
   *
   * 为什么需要它：部首作偏旁确实会被拉长（实测「手」作偏旁时横向压到 0.50），
   * 但那只是**一维**的畸变。没有约束时，fx 与 fy 可以各自取到区间两端，
   * 纵横比能变形近 4 倍——于是「囗」被压成一条扁条，也能跟字里的一根横画
   * 拿到 0.84 的相关度，部首就被定位到一根完全不相干的笔画上。
   *
   * 默认 2.0：允许偏旁被压扁/拉长到两倍，但不允许「压成一条线」。
   */
  maxAnisotropy?: number;
}

/** 生成等比缩放档位。 */
export function scaleGrid(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(4)));
  return out;
}

/**
 * 积分图：求任意矩形窗口内的像素和。
 *
 * NCC 的分母需要「窗口内图像能量」，用积分图 O(1) 取。
 */
export function integralImage(mask: Mask): Float64Array {
  const { width: w, height: h } = mask;
  const ii = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < w; x += 1) {
      rowSum += mask.data[y * w + x];
      ii[(y + 1) * (w + 1) + (x + 1)] = ii[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  return ii;
}

/** 取积分图里以 (x, y) 为左上角、尺寸 (ww, wh) 的窗口和。 */
export function windowSum(
  ii: Float64Array,
  stride: number,
  x: number,
  y: number,
  ww: number,
  wh: number,
): number {
  return (
    ii[(y + wh) * stride + (x + ww)] -
    ii[y * stride + (x + ww)] -
    ii[(y + wh) * stride + x] +
    ii[y * stride + x]
  );
}

/** 模板匹配器：把一次 FFT 准备摊到多次尺度搜索上。 */
export class TemplateMatcher {
  private readonly image: Mask;
  private readonly n: number;
  private readonly m: number;
  private readonly imageRe: Float64Array;
  private readonly imageIm: Float64Array;
  private readonly ii: Float64Array;
  private readonly componentInk: number[];
  private readonly componentBox: Array<{ x: number; y: number; x1: number; y1: number }>;

  constructor(image: Mask) {
    this.image = image;
    this.n = nextPow2(image.height * 2);
    this.m = nextPow2(image.width * 2);
    this.imageRe = new Float64Array(this.n * this.m);
    this.imageIm = new Float64Array(this.n * this.m);
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        this.imageRe[y * this.m + x] = image.data[y * image.width + x];
      }
    }
    fft2d(this.imageRe, this.imageIm, this.n, this.m, false);
    this.ii = integralImage(image);
    const cc = connectedComponents(image);
    this.componentInk = cc.ink;
    this.componentBox = componentBoxes(image, cc.label, cc.ink.length);
  }

  /**
   * 匹配框的「连通域精确率」。
   *
   * 框内墨量 ÷ 框所触及的**全部**连通域的墨量。
   *
   * 这一项治的是「只截取笔画的一部分」：小方块嵌在一根粗笔画里时，
   * 它在框内是满分，但框只覆盖了那根笔画的 6%，精确率就低；
   * 而真正的部首作为完整的一组笔画被框住时，精确率接近 1。
   *
   * 用连通域的**外接框**判断是否被触及（O(连通域数)），比逐像素查标签快得多；
   * 外接框相交是像素相交的超集，略微低估精确率，但不影响候选之间的排序。
   */
  precisionAt(x: number, y: number, w: number, h: number, overlap: number): number {
    if (overlap <= 0) return 0;
    const x1 = x + w;
    const y1 = y + h;
    let total = 0;
    for (let c = 0; c < this.componentInk.length; c += 1) {
      const b = this.componentBox[c];
      if (b.x >= x1 || b.x1 <= x || b.y >= y1 || b.y1 <= y) continue;
      total += this.componentInk[c];
    }
    return total > 0 ? overlap / total : 0;
  }

  /**
   * 在图像中找出与模板最匹配的位置（模板已按 (fx, fy) 缩放）。
   *
   * 走 FFT：一次变换就能扫全图。
   */
  matchScaled(template: Mask, fx: number, fy: number): MatchResult | null {
    const th = template.height;
    const tw = template.width;
    if (th > this.image.height || tw > this.image.width) return null;

    const tArea = countInk(template);
    if (tArea === 0) return null;

    const tRe = new Float64Array(this.n * this.m);
    const tIm = new Float64Array(this.n * this.m);
    for (let y = 0; y < th; y += 1) {
      for (let x = 0; x < tw; x += 1) {
        tRe[y * this.m + x] = template.data[y * tw + x];
      }
    }
    fft2d(tRe, tIm, this.n, this.m, false);

    const re = new Float64Array(this.n * this.m);
    const im = new Float64Array(this.n * this.m);
    for (let i = 0; i < this.n * this.m; i += 1) {
      re[i] = this.imageRe[i] * tRe[i] + this.imageIm[i] * tIm[i];
      im[i] = this.imageIm[i] * tRe[i] - this.imageRe[i] * tIm[i];
    }
    fft2d(re, im, this.n, this.m, true);

    const vh = this.image.height - th + 1;
    const vw = this.image.width - tw + 1;

    // 第一遍：算出整张相关图。量化到 1e-6 存，避开 FFT 浮点噪声，
    // 否则并列位置会由 1.0+1e-10 打败 1.0-1e-10 这种纯噪声决定。
    const Q = 1e6;
    const nccMap = new Float64Array(vh * vw);
    let bestQ = -Infinity;
    for (let y = 0; y < vh; y += 1) {
      for (let x = 0; x < vw; x += 1) {
        const overlap = re[y * this.m + x];
        const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
        const denom = Math.sqrt(Math.max(energy, 1e-6) * tArea);
        const ncc = overlap / denom;
        nccMap[y * vw + x] = ncc;
        const q = Math.round(ncc * Q);
        if (q > bestQ) bestQ = q;
      }
    }
    if (!Number.isFinite(bestQ)) return null;

    // 第二遍：在相关度并列最优的位置里，挑「连通域精确率」最高的那一个。
    // 这一步治的是「小方块嵌在粗笔画里」——它在相关度上同样是满分，
    // 但只覆盖了那根笔画的一小段。
    const threshold = (bestQ - 1) / Q;
    let best: MatchResult | null = null;
    let bestPrecision = -1;
    for (let y = 0; y < vh; y += 1) {
      for (let x = 0; x < vw; x += 1) {
        const ncc = nccMap[y * vw + x];
        if (ncc < threshold) continue;
        const overlap = re[y * this.m + x];
        const precision = this.precisionAt(x, y, tw, th, overlap);
        if (precision <= bestPrecision) continue;
        bestPrecision = precision;
        const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
        const union = tArea + energy - overlap;
        best = {
          score: ncc,
          x,
          y,
          width: tw,
          height: th,
          fx,
          fy,
          coverage: overlap / tArea,
          iou: union > 0 ? overlap / union : 0,
          precision,
        };
      }
    }
    return best;
  }

  /**
   * 在给定中心附近做**直接**匹配（不走 FFT）。
   *
   * 各向异性细搜要试成百上千组 (fx, fy)，每组都做一次全图 FFT 太贵；
   * 但细搜的位置一定在等比粗搜的解附近，所以只在邻域内直接算就够了。
   */
  matchScaledNear(
    template: Mask,
    fx: number,
    fy: number,
    centerX: number,
    centerY: number,
    radius: number,
  ): MatchResult | null {
    const th = template.height;
    const tw = template.width;
    if (th > this.image.height || tw > this.image.width) return null;
    const tArea = countInk(template);
    if (tArea === 0) return null;

    // 模板的墨点稀疏化：抽样到最多 400 点，直接算就够快
    const pts: number[] = [];
    for (let y = 0; y < th; y += 1) {
      for (let x = 0; x < tw; x += 1) {
        if (template.data[y * tw + x]) pts.push(y * tw + x);
      }
    }
    if (pts.length === 0) return null;
    const stride = Math.max(1, Math.floor(pts.length / 400));
    const sample = pts.filter((_, i) => i % stride === 0);
    const tAreaSampled = sample.length;

    const x0 = Math.max(0, centerX - radius);
    const x1 = Math.max(x0, Math.min(this.image.width - tw, centerX + radius));
    const y0 = Math.max(0, centerY - radius);
    const y1 = Math.max(y0, Math.min(this.image.height - th, centerY + radius));
    if (x1 < x0 || y1 < y0) return null;

    let best: MatchResult | null = null;
    let bestQ = -Infinity;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        let overlap = 0;
        for (let i = 0; i < sample.length; i += 1) {
          const p = sample[i];
          const py = y + Math.floor(p / tw);
          const px = x + (p % tw);
          if (this.image.data[py * this.image.width + px]) overlap += 1;
        }
        const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
        // 模板抽样后，overlap 是命中抽样点的个数；除以 sqrt(energy × 抽样点数)
        // 就是无偏的归一化相关度（与全点计算同式）
        const ncc = overlap / Math.sqrt(Math.max(energy, 1e-6) * tAreaSampled);
        const q = Math.round(ncc * 1e6);
        if (q > bestQ) {
          bestQ = q;
          const realOverlap = (overlap * tArea) / tAreaSampled;
          const precision = this.precisionAt(x, y, tw, th, realOverlap);
          const union = tArea + energy - realOverlap;
          best = {
            score: ncc,
            x,
            y,
            width: tw,
            height: th,
            fx,
            fy,
            coverage: realOverlap / tArea,
            iou: union > 0 ? realOverlap / union : 0,
            precision,
          };
        }
      }
    }
    return best;
  }
}

/** 求各连通域的外接框。 */
function componentBoxes(
  mask: Mask,
  label: Int32Array,
  count: number,
): Array<{ x: number; y: number; x1: number; y1: number }> {
  const boxes: Array<{ x: number; y: number; x1: number; y1: number }> = [];
  for (let i = 0; i < count; i += 1) boxes.push({ x: Infinity, y: Infinity, x1: -Infinity, y1: -Infinity });
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const id = label[y * mask.width + x];
      if (id < 0) continue;
      const b = boxes[id];
      if (x < b.x) b.x = x;
      if (y < b.y) b.y = y;
      if (x + 1 > b.x1) b.x1 = x + 1;
      if (y + 1 > b.y1) b.y1 = y + 1;
    }
  }
  return boxes;
}

/**
 * 高层入口：在图像里找模板，各向异性尺度粗搜 + 细搜。
 *
 * @param image  被搜索的图（复合字）
 * @param rawTemplate 模板（原尺寸，会先裁到墨迹外接框）
 */
export function matchTemplate(
  image: Mask,
  rawTemplate: Mask,
  options: MatchOptions = {},
): MatchResult | null {
  const minScale = options.minScale ?? 0.3;
  const maxScale = options.maxScale ?? 1.15;
  const coarseStep = options.coarseStep ?? 0.1;
  const fineStep = options.fineStep ?? 0.025;
  const fineRadius = options.fineRadius ?? 1;

  const cropped = cropToInk(rawTemplate).mask;
  if (countInk(cropped) === 0) return null;

  const matcher = new TemplateMatcher(image);
  const evaluate = (fx: number, fy: number): MatchResult | null => {
    const tw = Math.max(4, Math.round(cropped.width * fx));
    const th = Math.max(4, Math.round(cropped.height * fy));
    if (tw > image.width || th > image.height) return null;
    const scaled = resizeMaskSmooth(cropped, tw, th);
    return matcher.matchScaled(scaled, fx, fy);
  };

  /**
   * 跨尺度排序：**相关度优先**，并列时看连通域精确率，再并列时取更大的模板。
   *
   * 相关度是主指标——它回答「这个位置像不像部首」；精确率只用来在**相关度
   * 打平**的候选之间裁决（小方块嵌在粗笔画里 vs 完整的一组笔画）；
   * 面积只作为最后的平局裁决，偏向「能匹配上的最大那块」。
   */
  const better = (a: MatchResult, b: MatchResult): boolean => {
    const qa = Math.round(a.score * 1e6);
    const qb = Math.round(b.score * 1e6);
    if (qa !== qb) return qa > qb;
    if (Math.abs(a.precision - b.precision) > 1e-6) return a.precision > b.precision;
    return a.width * a.height > b.width * b.height;
  };

  let best: MatchResult | null = null;

  // 粗搜一：等比（走 FFT，一次变换扫全图）
  for (const s of scaleGrid(minScale, maxScale, coarseStep)) {
    const r = evaluate(s, s);
    if (r && (!best || better(r, best))) best = r;
  }
  if (!best) return null;

  // 粗搜二：各向异性全网格。部首作偏旁时常被**纵向拉长**（实测「手」作偏旁时
  // 横向压到 0.50、纵向保持 0.90），只搜等比会漏掉这种解。
  //
  // 候选有两百多个，但每个候选只在**等比解所在位置**直接算一次——
  // 一次全图 FFT 扫全图太贵，直接算便宜一个数量级。排名靠前的几个比例
  // 再各自走一次全图 FFT 确认全局最优。
  const grid = scaleGrid(minScale, maxScale, coarseStep / 2);
  const maxAniso = options.maxAnisotropy ?? 2.0;
  const aspects: Array<{ fx: number; fy: number; score: number }> = [];
  for (const fy of grid) {
    for (const fx of grid) {
      // 各向异性约束：fx/fy 不能偏离 1 太多，否则模板会被压成一条线去蹭一根笔画
      if (fx / fy > maxAniso || fy / fx > maxAniso) continue;
      const tw = Math.max(4, Math.round(cropped.width * fx));
      const th = Math.max(4, Math.round(cropped.height * fy));
      if (tw > image.width || th > image.height) continue;
      const scaled = resizeMaskSmooth(cropped, tw, th);
      const r = matcher.matchScaledNear(
        scaled, fx, fy,
        best.x, best.y,
        0,
      );
      if (r) aspects.push({ fx, fy, score: r.score });
    }
  }
  aspects.sort((a, b) => b.score - a.score);
  for (const aspect of aspects.slice(0, 6)) {
    const r = evaluate(aspect.fx, aspect.fy);
    if (r && (!best || better(r, best))) best = r;
  }

  // 收尾：在胜出比例附近做一次小范围直接精修
  const refined = matcher.matchScaledNear(
    resizeMaskSmooth(
      cropped,
      Math.max(4, Math.round(cropped.width * best.fx)),
      Math.max(4, Math.round(cropped.height * best.fy)),
    ),
    best.fx, best.fy,
    best.x, best.y,
    Math.max(3, Math.round(Math.max(best.width, best.height) / 3)),
  );
  if (refined && better(refined, best)) best = refined;

  void fineRadius;
  void fineStep;
  return best;
}
