/**
 * A1 部首定位算法。
 *
 * 解决的问题：给定一个复合字的小篆字形，以及它的说文部首（部首本身也是
 * 一个可查的小篆字形），指出复合字里**哪些笔画属于这个部首**。
 *
 * 核心洞察：部首字形和它在复合字里的写法是同一形状的两次书写，所以问题
 * 是「在复合字里定位一个已知形状」——标准的各向异性模板匹配。
 *
 * 流程：
 *   1. 复合字与部首字各自光栅化成位图；
 *   2. 部首字按 (fx, fy) 独立缩放后用 FFT 归一化互相关在全图搜索最佳位置；
 *   3. 命中框内墨量占比达标的 `<path>` 判定为部首笔画；
 *   4. 取空间连通的一组作为最终结果。
 *
 * 输出带置信度：低于阈值时应当交给人工核验，而不是硬给答案。
 */

import type { Glyph } from "../glyph.ts";
import { glyphStrokes, inkViewBox, isStrokeGlyph } from "../glyph.ts";
import type { Rect } from "../geometry/path.ts";
import { cropToInk, countInk, rasterizeGlyph, type Mask } from "../raster/mask.ts";
import { matchTemplate, type MatchOptions } from "../raster/match.ts";
import { describeMask, minDescriptorDistance } from "./descriptor.ts";

/** 若干掩膜里指定那些的合并外接框（像素坐标）。 */
function boundsOfMask(masks: Mask[], indices: number[], resolution: number): {
  x: number; y: number; width: number; height: number;
} {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const i of indices) {
    const m = masks[i];
    if (!m) continue;
    for (let y = 0; y < m.height; y += 1) {
      for (let x = 0; x < m.width; x += 1) {
        if (!m.data[y * m.width + x]) continue;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x + 1 > x1) x1 = x + 1;
        if (y + 1 > y1) y1 = y + 1;
      }
    }
  }
  if (x1 < x0) return { x: 0, y: 0, width: resolution, height: resolution };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** 部首定位结果。 */
export interface RadicalMatch {
  /** 属于部首的 `<path>` 下标（按字形里的出现顺序）。 */
  pathIndices: number[];
  /** 归一化互相关得分，[-1, 1]。 */
  score: number;
  /** 匹配框的连通域精确率：框内墨量 ÷ 框所触及的全部连通域的墨量。 */
  precision: number;
  /** 部首笔画占复合字总墨量的比例。 */
  coverage: number;
  /** 匹配框内的交并比。 */
  iou: number;
  /** 匹配框（像素坐标，相对光栅画布）。 */
  box: { x: number; y: number; width: number; height: number };
  /** 找到的缩放系数。 */
  fx: number;
  fy: number;
  /** 光栅分辨率。 */
  resolution: number;
  /** 每个路径的「落在匹配框内的墨量比例」，下标与 `pathIndices` 对应。 */
  perPath: Array<{ index: number; inside: number }>;
  /**
   * **子路径级**的部件划分。
   *
   * 为什么需要它：篆书层里一条 `<path>` 常常含**多个子路径**（实测 35% 的路径
   * 不止一个子路径，最多 13 个），而这些子路径**不一定属于同一部件**——
   * 「眼」那条「艮」的路径里就有 4 段，最上面那段横帽一直伸到字的左边。
   * 用整条路径的外接框判断左右关系，框会横跨整个字，构形就废了。
   *
   * 所以部件的最小单位是**子路径**，不是路径。`pathIndices` 保留下来给界面
   * 高亮用（演示页按路径染色），几何判定走子路径。
   */
  perSubpath?: Array<{
    /** 所属 `<path>` 下标。 */
    path: number;
    /** 该路径内的子路径下标。 */
    subpath: number;
    /** 落在匹配框内的墨量比例（投票法下恒为 0，看 `distance`）。 */
    inside: number;
    /** 形状距离（投票法才有；模板法下为 undefined）。 */
    distance?: number;
    /** 是否判为部首。 */
    radical: boolean;
  }>;
}

/** 定位参数。 */
export interface RadicalOptions extends MatchOptions {
  /** 光栅分辨率。 */
  resolution?: number;
  /** 路径判为部首的墨量占比阈值。 */
  pathThreshold?: number;
  /** 置信度低于此值时返回 `null`（表示「不敢下结论」）。 */
  minScore?: number;
  /**
   * 部首偏旁形（笔画形状描述子集合）。
   *
   * 有它就不用模板匹配：部首字的**独立形态**跟它在合体字里的**偏旁形态**
   * 常常不一样（「水」独立是中间一竖两边四点，作偏旁是三条波浪线），
   * 拿独立形态当模板必然匹错。偏旁形是从语料里归纳出来的笔画类型，
   * 按形状投票更准（见 `tools/build_radical_forms.ts`）。
   */
  radicalTypes?: string[];
  /**
   * 判为部首笔画的形状距离上限（投票法）。
   *
   * 默认 **38**。实测（92 个可分解的标注字，组合模式）：
   * 26 → 61.3%、30 → 61.6%、34 → 64.1%、**38 → 65.2%**、42 → 65.2%、46 → 62.4%。
   * 取 38：在平台上（38 与 42 同为 65.2%），不取峰值，免得对这一组标注过拟合。
   *
   * 这个数字跟着形状距离的**量纲**走：距离函数改成按**长宽比的对数比**算之后，
   * 距离整体变小，容差就得跟着放大（早先是 34）。
   */
  typeTolerance?: number;
  /**
   * 光栅化取景：`ink` 用字形实际墨迹范围（不裁掉跑到 viewBox 外的部分），
   * `viewBox` 用 SVG 声明的 viewBox（会裁掉一部分）。
   *
   * 两种取景各有代价。实测（46 个带人工标注 IDS 的常用字）：
   * - 模板法：两者构形准确率**都是 37.0%**；`ink` 判不出更少（5 vs 7）。
   * - 投票法：`ink` **23.9%** vs `viewBox` **15.2%**——`viewBox` 裁掉的笔画
   *   恰好是偏旁笔画（偏旁多在字的边缘），裁掉就找不到了。
   * - 目视核验：「眼」在 `ink` 下命中「目」（正确），在 `viewBox` 下命中「艮」（错误）。
   *
   * 所以默认取 `ink`。`viewBox` 保留下来是因为它在「字画在框里」这个先验上
   * 另有用途（比如比对两幅取景的差异），不是推荐路径。
   */
  frame?: "ink" | "viewBox";
}

/** 把一个路径的墨量按「落在矩形内的比例」统计。 */
function insideRatio(mask: Mask, box: { x: number; y: number; width: number; height: number }): number {
  const total = countInk(mask);
  if (total === 0) return 0;
  let inside = 0;
  const y0 = Math.max(0, box.y);
  const y1 = Math.min(mask.height, box.y + box.height);
  const x0 = Math.max(0, box.x);
  const x1 = Math.min(mask.width, box.x + box.width);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (mask.data[y * mask.width + x]) inside += 1;
    }
  }
  return inside / total;
}

/** 两个掩膜是否相邻（间距 ≤ gap 像素即视为相接）。 */
function adjacent(a: Mask, b: Mask, gap = 2): boolean {
  const aBox = cropToInk(a);
  const bBox = cropToInk(b);
  if (countInk(aBox.mask) === 0 || countInk(bBox.mask) === 0) return false;
  const ax0 = aBox.offsetX - gap;
  const ay0 = aBox.offsetY - gap;
  const ax1 = aBox.offsetX + aBox.mask.width + gap;
  const ay1 = aBox.offsetY + aBox.mask.height + gap;
  const bx0 = bBox.offsetX - gap;
  const by0 = bBox.offsetY - gap;
  const bx1 = bBox.offsetX + bBox.mask.width + gap;
  const by1 = bBox.offsetY + bBox.mask.height + gap;
  if (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0) return false;
  // 精判：a 中距 b 最近的点是否在 gap 内
  const am = aBox.mask;
  const bm = bBox.mask;
  for (let y = 0; y < am.height; y += 1) {
    for (let x = 0; x < am.width; x += 1) {
      if (!am.data[y * am.width + x]) continue;
      const gx = aBox.offsetX + x;
      const gy = aBox.offsetY + y;
      for (let yy = 0; yy < bm.height; yy += 1) {
        for (let xx = 0; xx < bm.width; xx += 1) {
          if (!bm.data[yy * bm.width + xx]) continue;
          const hx = bBox.offsetX + xx;
          const hy = bBox.offsetY + yy;
          if (Math.hypot(gx - hx, gy - hy) <= gap) return true;
        }
      }
    }
  }
  return false;
}

/** 把一组路径按空间相邻关系分成若干组。 */
function spatialGroups(masks: Mask[], indices: number[]): number[][] {
  const groups: number[][] = [];
  const seen = new Set<number>();
  for (const start of indices) {
    if (seen.has(start)) continue;
    const group: number[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const cur = queue.shift() as number;
      group.push(cur);
      for (const cand of indices) {
        if (seen.has(cand)) continue;
        if (adjacent(masks[cur], masks[cand])) {
          seen.add(cand);
          queue.push(cand);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/** 导出给外部用：把一组路径按空间相邻关系分组。 */
export { spatialGroups };

/**
 * 在复合字里定位部首。
 *
 * 两条路径：
 * - **投票法**（给了 `options.radicalTypes`）：把每条笔画的形状与部首偏旁形比对，
 *   像的就是部首笔画。不依赖模板匹配，能抗住摹本的出入。
 * - **模板法**（没给）：拿部首字的独立形态做各向异性模板匹配。
 *
 * @param glyph 复合字形
 * @param radicalGlyph 部首字形（独立的一张字）；投票法下可以传 null
 * @param options 参数
 */
export function locateRadical(
  glyph: Glyph,
  radicalGlyph: Glyph | null,
  options: RadicalOptions = {},
): RadicalMatch | null {
  const resolution = options.resolution ?? 128;
  const pathThreshold = options.pathThreshold ?? 0.4;
  const minScore = options.minScore ?? 0.45;

  const glyphStrokesInfo = isStrokeGlyph(glyph) ? glyphStrokes(glyph) : undefined;
  // 光栅化用**墨迹范围**而不是 SVG 声明的 viewBox——上游字形的路径会跑到框外，
  // 按 viewBox 裁会把三分之一的字切掉，匹配就建立在残缺形状上了。
  // `frame: "viewBox"` 可以切回声明框，代价是裁掉跑到框外的笔画。
  const frameMode = options.frame ?? "ink";
  const frameOf = (g: Glyph): Rect => (frameMode === "ink" ? inkViewBox(g) : g.viewBox);
  const glyphInk = frameOf(glyph);
  const perPathMasks: Mask[] = glyph.paths.map((p) =>
    rasterizeGlyph(p.subpaths, {
      width: resolution,
      height: resolution,
      viewBox: glyphInk,
      strokes: glyphStrokesInfo
        ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }]
        : undefined,
    }),
  );

  // ── 子路径级掩膜 ──────────────────────────────────────────
  // 部件的最小单位是子路径：篆书层里一条 `<path>` 常常含多个子路径，
  // 而它们不一定属于同一部件（「眼」的「艮」那条路径有 4 段，
  // 最上面那段横帽一直伸到字的左边）。用整条路径的外接框判断左右关系，
  // 框会横跨整个字。
  const subpathRefs: Array<{ path: number; subpath: number }> = [];
  const subpathMasks: Mask[] = [];
  glyph.paths.forEach((p, pi) => {
    p.subpaths.forEach((sp, si) => {
      subpathRefs.push({ path: pi, subpath: si });
      subpathMasks.push(
        rasterizeGlyph([sp], {
          width: resolution,
          height: resolution,
          viewBox: glyphInk,
          strokes: glyphStrokesInfo
            ? [{ points: sp, halfWidth: p.strokeWidth / 2 }]
            : undefined,
        }),
      );
    });
  });

  // ── 投票法 ──────────────────────────────────────────────
  if (options.radicalTypes && options.radicalTypes.length > 0) {
    const tolerance = options.typeTolerance ?? 38;
    const perPath = perPathMasks.map((m, index) => {
      if (countInk(m) === 0) return { index, inside: 0, distance: Infinity };
      const desc = describeMask(m);
      const d = minDescriptorDistance(desc, options.radicalTypes as string[]);
      return { index, inside: 0, distance: d };
    });
    const selected = perPath.filter((p) => p.distance <= tolerance).map((p) => p.index);
    if (selected.length === 0) return null;

    // 置信度：命中笔画离部首形越近越可信；没命中的笔画离得越远也说明区分度好
    const hits = perPath.filter((p) => p.distance <= tolerance);
    const miss = perPath.filter((p) => p.distance > tolerance);
    const hitScore = hits.reduce((s, p) => s + (1 - p.distance / tolerance), 0) / Math.max(1, hits.length);
    const missScore = miss.length > 0
      ? miss.reduce((s, p) => s + Math.min(1, (p.distance - tolerance) / (tolerance * 2)), 0) / miss.length
      : 1;
    const score = Math.max(0, Math.min(1, hitScore * 0.7 + missScore * 0.3));
    if (score < minScore) return null;

    const radicalInk = selected.reduce((s, i) => s + countInk(perPathMasks[i]), 0);
    const totalInk = perPathMasks.reduce((s, m) => s + countInk(m), 0);
    const box = boundsOfMask(perPathMasks, selected, resolution);
    // 子路径级：逐子路径比形状。
    //
    // 偏旁形码本是**按路径**归纳的（`tools/build_radical_forms.ts` 每条路径一个描述子），
    // 拿单个子路径去比路径级的类型，粒度对不上——实测「語」的部首「言」横跨
    // 路径 0 与路径 3，逐子路径比只挑出路径 3 的子路径。
    // 但**几何判定用子路径级更准**（实测 62.0% vs 58.7%）：部首区域收紧，
    // 质心判据才不会被非部首的笔画带偏。
    // 所以：几何用子路径级，报出来的路径清单用路径级（界面高亮的也是它）。
    const perSubpath = subpathRefs.map((ref, i) => {
      const d = countInk(subpathMasks[i]) === 0
        ? Infinity
        : minDescriptorDistance(describeMask(subpathMasks[i]), options.radicalTypes as string[]);
      return { ...ref, inside: 0, distance: d, radical: d <= tolerance };
    });
    return {
      pathIndices: selected,
      score,
      precision: score,
      coverage: totalInk > 0 ? radicalInk / totalInk : 0,
      iou: score,
      box,
      fx: 1,
      fy: 1,
      resolution,
      perPath: perPath.map((p) => ({ index: p.index, inside: p.distance <= tolerance ? 1 : 0 })),
      perSubpath,
    };
  }

  if (!radicalGlyph) return null;

  const image = rasterizeGlyph(
    glyph.paths.flatMap((p) => p.subpaths),
    {
      width: resolution,
      height: resolution,
      viewBox: glyphInk,
      strokes: glyphStrokesInfo,
    },
  );
  if (countInk(image) === 0) return null;

  const radicalStrokes = isStrokeGlyph(radicalGlyph) ? glyphStrokes(radicalGlyph) : undefined;
  const template = rasterizeGlyph(
    radicalGlyph.paths.flatMap((p) => p.subpaths),
    {
      width: resolution,
      height: resolution,
      viewBox: frameOf(radicalGlyph),
      strokes: radicalStrokes,
    },
  );
  if (countInk(template) === 0) return null;

  const match = matchTemplate(image, template, options);
  if (!match || match.score < minScore) return null;

  const box = { x: match.x, y: match.y, width: match.width, height: match.height };
  const perPath = perPathMasks.map((m, index) => ({ index, inside: insideRatio(m, box) }));

  // 路径判定：墨量大部分落在匹配框里的算部首笔画。
  // 阈值本身就排除了远处的笔画，不需要再用连通性筛选——部首可能是**互不相连**
  // 的几笔（篆书的「水」作偏旁是三条分离的曲线，篆书的「日」是三段不相接的框）。
  let selected = perPath.filter((p) => p.inside >= pathThreshold).map((p) => p.index);

  // 一条都没命中时，退而求其次：取占比最高的那一条（≥0.25 才认）
  if (selected.length === 0) {
    const best = perPath.slice().sort((a, b) => b.inside - a.inside)[0];
    if (best && best.inside >= 0.25) selected = [best.index];
  }

  const radicalInk = selected.reduce((sum, i) => sum + countInk(perPathMasks[i]), 0);
  const totalInk = countInk(image);

  // 子路径级判定：同一条路径里的不同子路径可能分属不同部件，
  // 所以逐个子路径看「落在匹配框里的比例」，几何判定用它（见 RadicalMatch.perSubpath）。
  const perSubpath = subpathRefs.map((ref, i) => {
    const inside = insideRatio(subpathMasks[i], box);
    return { ...ref, inside, radical: inside >= pathThreshold };
  });

  return {
    pathIndices: selected,
    score: match.score,
    precision: match.precision,
    coverage: totalInk > 0 ? radicalInk / totalInk : 0,
    iou: match.iou,
    box,
    fx: match.fx,
    fy: match.fy,
    resolution,
    perPath,
    perSubpath,
  };
}
