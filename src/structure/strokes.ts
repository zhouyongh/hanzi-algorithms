/**
 * A3 笔画切分与笔顺。
 *
 * 汉字字形的「笔画」在两套数据里长得很不一样：
 *
 * - **甲骨骨架**：一个 `<path>` 就是一条折线一笔，**文件里的出现顺序就是
 *   落笔顺序**（抽查 1,203 条，`<path>` 数与 `n_strokes` 全等）。这是最理想的
 *   笔顺数据源。
 * - **摹本轮廓**（篆/金/隶）：一个 `<path>` 是摹本的一笔（闭合轮廓），
 *   顺序也是文件的出现顺序，但笔画数与后世笔画数不一定相等。
 *
 * 两种形态统一到 `Stroke` 结构，动画层据此决定是「按折线书写」还是「整笔显现」。
 */

import type { Point, Rect, SubPath } from "../geometry/path.ts";
import { boundsOf, polylineLength } from "../geometry/path.ts";
import { principalAngle } from "../geometry/sample.ts";
import type { Glyph } from "../glyph.ts";

/** 一笔。 */
export interface Stroke {
  /** 笔序（从 0 起）。 */
  index: number;
  /** 在 `glyph.paths` 中的下标。 */
  pathIndex: number;
  /** 骨架笔（甲骨）还是轮廓笔（摹本）。 */
  kind: "skeleton" | "outline";
  /** 骨架笔为折线点列；轮廓笔为空。 */
  points: Point[];
  /** 轮廓笔的全部子路径。 */
  subpaths: SubPath[];
  /** 长度（骨架笔为折线长；轮廓笔为周长近似）。 */
  length: number;
  /** 外接矩形。 */
  bounds: Rect;
  /** 主方向（弧度，PCA 第一主成分）。 */
  angle: number;
  /** 骨架笔的描边宽度。 */
  strokeWidth: number;
}

/** 把字形切成笔画序列。 */
export function splitStrokes(glyph: Glyph): Stroke[] {
  const strokes: Stroke[] = [];
  glyph.paths.forEach((p, pathIndex) => {
    const isSkeleton = !p.filled;
    const points: Point[] = isSkeleton ? (p.subpaths[0] ?? []) : [];
    const perimeter = p.subpaths.reduce((sum, sp, i) => {
      let len = polylineLength(sp);
      // 闭合轮廓要补上「闭合那条边」。
      //
      // 解析层按 SVG 规范不重复首点（末端由 `Z` 隐含），于是点列里没有最后一段，
      // 直接量周长会**少一条边**——实测 80×80 的方框量出 240 而不是 320。
      if (p.closed?.[i] && sp.length >= 2) {
        const a = sp[0];
        const b = sp[sp.length - 1];
        len += Math.hypot(b.x - a.x, b.y - a.y);
      }
      return sum + len;
    }, 0);
    strokes.push({
      index: strokes.length,
      pathIndex,
      kind: isSkeleton ? "skeleton" : "outline",
      points,
      subpaths: p.subpaths,
      length: isSkeleton ? polylineLength(points) : perimeter,
      bounds: boundsOf(p.subpaths),
      angle: principalAngle(p.subpaths.flat()),
      strokeWidth: p.strokeWidth,
    });
  });
  return strokes;
}

/** 笔画数。 */
export function strokeCount(glyph: Glyph): number {
  return glyph.paths.length;
}

/**
 * 笔顺序列（笔的下标）。
 *
 * 现有数据里 `<path>` 的出现顺序即落笔顺序，直接取用；若下游数据带有显式
 * 笔顺字段，可用 `order` 覆盖。
 *
 * `order` 必须是**合法排列**：长度对、且每一项都是 `[0, n)` 里的整数、互不重复。
 * 不合法就**回退**到恒等排列——早先只校验长度，于是 `order=[5,5,5]` 这种
 * 越界值会让 `strokesInOrder` 返回 `[undefined, undefined, undefined]`，
 * 下游任何一次 `stroke.length` 都会炸。
 */
export function strokeOrder(glyph: Glyph, order?: number[]): number[] {
  const n = glyph.paths.length;
  if (order && order.length === n && isPermutation(order, n)) return order.slice();
  return glyph.paths.map((_, i) => i);
}

/** `arr` 是否是 `0..n-1` 的一个排列。 */
function isPermutation(arr: number[], n: number): boolean {
  const seen = new Set<number>();
  for (const v of arr) {
    if (!Number.isInteger(v) || v < 0 || v >= n) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === n;
}

/** 按笔顺重排笔画。 */
export function strokesInOrder(glyph: Glyph, order?: number[]): Stroke[] {
  const strokes = splitStrokes(glyph);
  const seq = strokeOrder(glyph, order);
  return seq.map((pathIndex) => strokes[pathIndex]);
}
