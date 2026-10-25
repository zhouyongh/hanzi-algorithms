/**
 * 字形 SVG 的统一读取层。
 *
 * 汉字字形在 SVG 里有两种形态，本模块把两者统一成同一个数据结构，
 * 只在 `filled` 上区分：
 *
 * - **填充型**（篆书、金文、隶书、傳抄、楚简）：轮廓是闭合贝塞尔，
 *   `strokeWidth` 无意义，`filled = true`；
 * - **描边型**（甲骨文骨架）：每个 `<path>` 是一条折线，靠 `stroke` +
 *   `stroke-width` 呈现，`filled = false`。
 *
 * 甲骨的「轮廓派生层」是填充型，与骨架同名同 viewBox，用 `layer` 区分。
 */

import type { Point, Rect, SubPath } from "./geometry/path.ts";
import { boundsOf, parsePathDetailed } from "./geometry/path.ts";

/** 一条 `<path>`。 */
export interface GlyphPath {
  /** 展平后的子路径点列。 */
  subpaths: SubPath[];
  /**
   * 每条子路径是否闭合（由 `Z` 闭合）。
   *
   * 点列本身看不出闭合——SVG 的 `Z` 只是「首尾隐含相连」，解析出来的点列首尾不重复。
   * 而「这一笔是不是一圈」很要紧：摹本的一笔是闭合轮廓，
   * 隶变、描红要作用在笔势线上，得先知道这个。
   */
  closed?: boolean[];
  /** 描边宽度；填充型为 0。 */
  strokeWidth: number;
  /** 是否为填充轮廓。 */
  filled: boolean;
  /** 外接矩形（原始坐标系）。 */
  bounds: Rect;
}

/** 一个字形。 */
export interface Glyph {
  /** viewBox（x, y, width, height）。 */
  viewBox: Rect;
  /** 全部 `<path>`，顺序即文件里的出现顺序。 */
  paths: GlyphPath[];
  /** 全部路径的合并外接框。 */
  bounds: Rect;
}

const VIEWBOX_RE = /^\s*([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s*$/;

/**
 * 从 SVG 源码解析字形。
 *
 * 只依赖字符串，不碰 DOM——浏览器与 Node 都能用。
 * 容错点：忽略无法解析的 path（记为跳过），不因单个坏文件整体失败。
 */
export function parseGlyphSvg(svgText: string): Glyph {
  const viewBox = extractViewBox(svgText);
  const paths: GlyphPath[] = [];

  // 逐个 `<path ...>` 标签切分：正则比 DOM 轻，比整树解析容错
  const pathRe = /<path\b([^>]*?)\/?>/gi;
  const dRe = /\bd\s*=\s*"([^"]*)"|\bd\s*=\s*'([^']*)'/i;
  const strokeRe = /\bstroke-width\s*=\s*"?([\d.]+)"?/i;

  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(svgText)) !== null) {
    const attrs = m[1];
    const dm = dRe.exec(attrs);
    if (!dm) continue;
    const d = dm[1] ?? dm[2];
    if (!d) continue;
    let subpaths: SubPath[];
    let closed: boolean[];
    try {
      const parsed = parsePathDetailed(d);
      subpaths = parsed.subpaths;
      closed = parsed.closed;
    } catch {
      continue;
    }
    if (subpaths.length === 0) continue;
    const swMatch = strokeRe.exec(attrs);
    const strokeWidth = swMatch ? Number(swMatch[1]) : 0;
    const filled = strokeWidth === 0;
    paths.push({ subpaths, closed, strokeWidth, filled, bounds: boundsOf(subpaths) });
  }

  const allSubpaths = paths.flatMap((p) => p.subpaths);
  return { viewBox, paths, bounds: boundsOf(allSubpaths) };
}

/** 从 SVG 源码里取 viewBox；取不到就退回 width/height，再取不到就用 0..400。 */
export function extractViewBox(svgText: string): Rect {
  const head = svgText.slice(0, 2000);
  const vb = /viewBox\s*=\s*"([^"]*)"/i.exec(head);
  if (vb) {
    const parsed = VIEWBOX_RE.exec(vb[1]);
    if (parsed) {
      return {
        x: Number(parsed[1]),
        y: Number(parsed[2]),
        width: Number(parsed[3]),
        height: Number(parsed[4]),
      };
    }
  }
  const w = Number(/\bwidth\s*=\s*"([\d.]+)"/i.exec(head)?.[1] ?? 400);
  const h = Number(/\bheight\s*=\s*"([\d.]+)"/i.exec(head)?.[1] ?? 400);
  return { x: 0, y: 0, width: w, height: h };
}

/** 字形的所有点（打平所有子路径）。 */
export function glyphPoints(glyph: Glyph): Point[] {
  return glyph.paths.flatMap((p) => p.subpaths.flat());
}

/**
 * 描边型字形的「有效墨迹」点列。
 *
 * 甲骨骨架是折线，没有面积；做几何比较时需要把它当成有宽度的笔画来算。
 * 这里返回每条笔画的端点与半宽，由光栅化层负责加粗。
 */
export function glyphStrokes(glyph: Glyph): Array<{ points: Point[]; halfWidth: number }> {
  const out: Array<{ points: Point[]; halfWidth: number }> = [];
  for (const p of glyph.paths) {
    if (p.filled) continue;
    const sp = p.subpaths[0];
    if (!sp || sp.length < 2) continue;
    out.push({ points: sp, halfWidth: p.strokeWidth / 2 });
  }
  return out;
}

/**
 * 字形的实际墨迹范围。
 *
 * **为什么需要它**：篆书等上游字形的 SVG 声明 `viewBox="0 0 400 400"`，
 * 但路径坐标会跑到框外（实测「明」的墨迹 x 到 −124、y 到 −171）。
 * 直接按 viewBox 光栅化会把三分之一的字裁掉，形状匹配于是建立在残缺形状上，
 * 部首定位随之失准（实测构形准确率只有 37%）。
 *
 * 所以：光栅化一律用**墨迹范围**，不用声明的 viewBox。
 */
export function inkViewBox(glyph: Glyph, margin = 0): Rect {
  const all = glyph.paths.flatMap((p) => p.subpaths).flat();
  if (all.length === 0) return glyph.viewBox;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of all) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);
  return {
    x: minX - margin * w,
    y: minY - margin * h,
    width: w + 2 * margin * w,
    height: h + 2 * margin * h,
  };
}

/** 判断字形是填充型还是描边型。混合时以「是否存在描边路径」为准。 */
export function isStrokeGlyph(glyph: Glyph): boolean {
  return glyph.paths.some((p) => !p.filled);
}
