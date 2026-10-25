/**
 * A2b 部件划分：把一个字形切成「块」。
 *
 * ## 为什么要有这个
 *
 * 构形分解（A2）只回答「部首在整字里的方位」——两分法：部首 / 其余。
 * 但教学上真正要指认的是**块**：「投」是扌 + 几 + 又，三块，
 * 点右上那一块就该整块亮起来，而不是亮其中一笔。
 *
 * 早期演示页按「笔」高亮，点哪一笔亮哪一笔，其余还被打淡——
 * 结果是「右上变色、其他变灰」，块的结构根本没显出来。
 *
 * ## 怎么切
 *
 * 纯几何的**递归二分**：
 *
 * 1. 取整字的墨量质心与字宽字高；
 * 2. 对当前这一组笔画，找**分离度最大**的轴向切分：
 *    - 左右切：两簇质心横向相距 ≥ 18% 字宽，且纵向相距 < 55% 字高；
 *    - 上下切：两簇质心纵向相距 ≥ 18% 字高，且横向相距 < 55% 字宽；
 * 3. 两个轴都切得动就取分离度大的那个；
 * 4. 切不动（只剩一笔、或怎么切都并排）就停，这是一块；
 * 5. 标签按切分方式**叠加**：「左」组再上下切 → 「左上」「左下」，
 *    「右」组再上下切 → 「右上」「右下」。
 *
 * 阈值与 `decompose.ts` 的几何判据一致（18% / 55%），两处对同一个字给出的
 * 结构不会互相打架。
 */

import type { Point, Rect } from "../geometry/path.ts";
import { boundsOf, centroidOf } from "../geometry/path.ts";
import type { Glyph } from "../glyph.ts";

/**
 * 一个块。
 *
 * 标签是**相对整字**的方位，不是「相对父块」的串接——
 * 「上左上」这种组合对人没有意义（那只是切分路径的痕迹）。
 */
export interface Block {
  /** 本块包含的路径下标（升序）。 */
  pathIndices: number[];
  /** 方位标签，如「左」「右上」「右下」。 */
  label: string;
  /** 外接框。 */
  bounds: Rect;
  /** 墨量质心。 */
  centroid: Point;
  /** 递归切出的子块（叶子块为空数组）。 */
  children: Block[];
}

/** 分块参数。 */
export interface BlockOptions {
  /** 分离度下限（相对字宽/字高）。 */
  separation?: number;
  /** 另一轴上的最大偏移（相对字宽/字高）。 */
  cross?: number;
  /** 最多递归几层。 */
  maxDepth?: number;
}

/** 默认参数。 */
export const DEFAULT_BLOCKS: Required<BlockOptions> = {
  separation: 0.18,
  cross: 0.55,
  maxDepth: 3,
};

/** 一个候选切分。 */
interface Split {
  /** 一簇的路径下标。 */
  a: number[];
  /** 另一簇的路径下标。 */
  b: number[];
  /** 切分轴：`x` = 左右切，`y` = 上下切。 */
  axis: "x" | "y";
  /** 分离度（沿切分轴，相对字宽/字高）。 */
  separation: number;
  /** 标签前缀（这一簇的方位）。 */
  labelA: string;
  /** 标签前缀（另一簇的方位）。 */
  labelB: string;
}

/**
 * 把字形切成块。
 *
 * 返回的是**叶子块**的列表（平铺），每块带方位标签。
 *
 * 标签按块相对**整字**的位置给（见 `labelOf`），不是切分路径的串接——
 * 「上左上」那种组合是人看不懂的。
 */
export function segmentBlocks(glyph: Glyph, options: BlockOptions = {}): Block[] {
  const opts = { ...DEFAULT_BLOCKS, ...options };
  const all = glyph.paths.flatMap((p) => p.subpaths);
  if (glyph.paths.length === 0) return [];

  const gBounds = boundsOf(all);
  const gW = gBounds.width || 1;
  const gH = gBounds.height || 1;
  // 整字的墨量质心：块相对它偏哪边，就是哪一侧
  const gCenter = centroidOf(all);

  // 每条路径的墨量质心——框会骗人，墨量不会
  const items = glyph.paths.map((p, index) => ({
    index,
    c: centroidOf(p.subpaths),
  }));

  const leaves: Block[] = [];
  const walk = (group: typeof items, depth: number): void => {
    if (group.length === 0) return;
    if (group.length === 1 || depth >= opts.maxDepth) {
      leaves.push(makeBlock(glyph, group.map((g) => g.index)));
      return;
    }
    const split = findSplit(group, gW, gH, opts.separation, opts.cross);
    if (!split) {
      leaves.push(makeBlock(glyph, group.map((g) => g.index)));
      return;
    }
    const byIndex = new Map(group.map((g) => [g.index, g]));
    const a = split.a.map((i) => byIndex.get(i)).filter((x): x is typeof group[0] => Boolean(x));
    const b = split.b.map((i) => byIndex.get(i)).filter((x): x is typeof group[0] => Boolean(x));
    walk(a, depth + 1);
    walk(b, depth + 1);
  };

  walk(items, 0);

  // 标签：相对整字
  for (const b of leaves) {
    b.label = labelOf(b.centroid, gCenter, gW, gH);
  }
  return leaves;
}

/**
 * 块相对整字的方位标签。
 *
 * 判据用**墨量质心**（与 `decompose.ts` 一致）：框会骗人，墨量不会。
 * 偏移不足字宽/字高的 10% 就算「不偏向那一侧」。
 */
function labelOf(c: Point, gCenter: Point, gW: number, gH: number): string {
  const dx = (c.x - gCenter.x) / gW;
  const dy = (c.y - gCenter.y) / gH;
  const OFF = 0.1;
  const h: "左" | "右" | "中" = dx < -OFF ? "左" : dx > OFF ? "右" : "中";
  const v: "上" | "下" | "中" = dy < -OFF ? "上" : dy > OFF ? "下" : "中";
  if (h === "中" && v === "中") return "中";
  if (h !== "中" && v === "中") return h;
  if (h === "中" && v !== "中") return v;
  return `${h}${v}`;
}

/** 造一个块（标签稍后按整字统一给）。 */
function makeBlock(glyph: Glyph, pathIndices: number[]): Block {
  const subpaths = pathIndices.flatMap((i) => glyph.paths[i]?.subpaths ?? []);
  return {
    pathIndices: pathIndices.slice().sort((a, b) => a - b),
    label: "中",
    bounds: boundsOf(subpaths),
    centroid: centroidOf(subpaths),
    children: [],
  };
}

/** 在这一组里找最好的轴向切分。切不动返回 `null`。 */
function findSplit(
  group: Array<{ index: number; c: Point }>,
  gW: number,
  gH: number,
  separation: number,
  cross: number,
): Split | null {
  // 两个轴都试一遍，取**分离度大**的那个。
  //
  // 不能只看横向：上下结构的字（思 = 田 + 心）横向分不开，
  // 而「投」这种左右结构横向分得更开——所以要比，不能先到先得。
  const onX = bestSplitOnAxis(group, gW, gH, separation, cross, "x");
  const onY = bestSplitOnAxis(group, gW, gH, separation, cross, "y");
  if (!onX) return onY;
  if (!onY) return onX;
  return onX.separation >= onY.separation ? onX : onY;
}

/** 在指定轴上找最好的切分。 */
function bestSplitOnAxis(
  group: Array<{ index: number; c: Point }>,
  gW: number,
  gH: number,
  separation: number,
  cross: number,
  axis: "x" | "y",
): Split | null {
  const val = (c: Point): number => (axis === "x" ? c.x : c.y);
  const crossVal = (c: Point): number => (axis === "x" ? c.y : c.x);
  const extent = axis === "x" ? gW : gH;
  const crossExtent = axis === "x" ? gH : gW;

  // 候选切点：相邻两个不同投影的中点
  const sorted = group.slice().sort((p, q) => val(p.c) - val(q.c));
  const candidates: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const v0 = val(sorted[i - 1].c);
    const v1 = val(sorted[i].c);
    if (v1 - v0 > 1e-9) candidates.push((v0 + v1) / 2);
  }
  if (candidates.length === 0) return null;

  let best: Split | null = null;
  for (const t of candidates) {
    const lo = sorted.filter((g) => val(g.c) < t);
    const hi = sorted.filter((g) => val(g.c) >= t);
    if (lo.length === 0 || hi.length === 0) continue;

    const mean = (arr: typeof group, f: (c: Point) => number): number =>
      arr.reduce((s, g) => s + f(g.c), 0) / arr.length;

    const sep = Math.abs(mean(hi, val) - mean(lo, val)) / extent;
    if (sep < separation) continue;
    const crossDiff = Math.abs(mean(hi, crossVal) - mean(lo, crossVal)) / crossExtent;
    if (crossDiff >= cross) continue;

    if (!best || sep > best.separation) {
      best = {
        a: lo.map((g) => g.index),
        b: hi.map((g) => g.index),
        axis,
        separation: sep,
        labelA: axis === "x" ? "左" : "上",
        labelB: axis === "x" ? "右" : "下",
      };
    }
  }
  return best;
}

/**
 * 某个路径属于哪一块。
 *
 * @returns 块的标签；找不到返回 `null`
 */
export function blockOfPath(blocks: Block[], pathIndex: number): string | null {
  for (const b of blocks) {
    if (b.pathIndices.includes(pathIndex)) return b.label;
  }
  return null;
}
