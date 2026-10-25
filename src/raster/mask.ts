/**
 * 位图掩膜与光栅化。
 *
 * 部首定位、跨书体对应这类算法都要把字形变成像素才能做形状比较，
 * 而 Node 里没有 canvas，所以这里自研一个扫描线光栅化器：
 *
 * - 填充型轮廓：nonzero winding 规则填充（与 SVG `fill-rule="nonzero"` 一致）；
 * - 描边型骨架：按 `stroke-width` 加粗成圆头圆角连接，与 SVG 描边区域一致。
 *
 * 掩膜用 `Uint8Array`（0/1），坐标原点在左上角，y 向下（与 SVG 相反，
 * 因此从 SVG 坐标转换过来时要翻转 y）。
 */

import type { Point, SubPath } from "../geometry/path.ts";
import { boundsOf } from "../geometry/path.ts";

/** 二值掩膜。 */
export interface Mask {
  data: Uint8Array;
  width: number;
  height: number;
}

/** 创建全 0 掩膜。 */
export function createMask(width: number, height: number): Mask {
  return { data: new Uint8Array(width * height), width, height };
}

/** 读像素。 */
export function getPixel(mask: Mask, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
  return mask.data[y * mask.width + x];
}

/** 写像素。 */
export function setPixel(mask: Mask, x: number, y: number, value: number): void {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
  mask.data[y * mask.width + x] = value;
}

/** 墨迹像素数。 */
export function countInk(mask: Mask): number {
  let n = 0;
  for (let i = 0; i < mask.data.length; i += 1) if (mask.data[i]) n += 1;
  return n;
}

/**
 * 把掩膜按位打包成 base64。
 *
 * 用来存「部首偏旁形」这类小模板：位打包比逐像素 base64 小 8 倍。
 */
export function encodeMaskBase64(mask: Mask): string {
  const bytes = new Uint8Array(Math.ceil(mask.data.length / 8));
  for (let i = 0; i < mask.data.length; i += 1) {
    if (mask.data[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** 解开 base64 位打包的掩膜。 */
export function decodeMaskBase64(data: string, width: number, height: number): Mask {
  const bin = atob(data);
  const mask = createMask(width, height);
  for (let i = 0; i < mask.data.length; i += 1) {
    const byte = bin.charCodeAt(i >> 3) || 0;
    mask.data[i] = (byte >> (i & 7)) & 1;
  }
  return mask;
}

/** 掩膜的墨量占比（0–1），用来判断模板是否退化。 */
export function inkRatio(mask: Mask): number {
  if (mask.data.length === 0) return 0;
  return countInk(mask) / mask.data.length;
}

/** 墨迹外接框（像素坐标）。 */
export function inkBounds(mask: Mask): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (mask.data[y * mask.width + x]) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

/**
 * 掩膜里有没有「封闭的空腔」——被墨迹围住、与画布边缘不连通的背景区域。
 *
 * 用途：判断一个部件是不是**闭合的框**。
 * 「囗」是闭的（有个空腔）→ 作部首时是**全包围**（⿴，如 國 = ⿴囗或）；
 * 「門」「匚」「厂」是开的（空腔漏到底边）→ 是**左上包围**（⿵，如 問 = ⿵門口）。
 * 靠几何位置分不开这两者：框的外接框和整字的外接框一样大。
 */
export function hasEnclosedHole(mask: Mask): boolean {
  const { width: w, height: h } = mask;
  if (w < 3 || h < 3) return false;
  // 反相：背景变成前景
  const inv: Mask = { width: w, height: h, data: new Uint8Array(w * h) };
  for (let i = 0; i < w * h; i += 1) inv.data[i] = mask.data[i] ? 0 : 1;
  const cc = connectedComponents(inv, 4);
  // 碰到画布边缘的背景域 = 外部
  const outside = new Set<number>();
  for (let x = 0; x < w; x += 1) {
    const t = cc.label[x];
    if (t >= 0) outside.add(t);
    const b = cc.label[(h - 1) * w + x];
    if (b >= 0) outside.add(b);
  }
  for (let y = 0; y < h; y += 1) {
    const l = cc.label[y * w];
    if (l >= 0) outside.add(l);
    const r = cc.label[y * w + w - 1];
    if (r >= 0) outside.add(r);
  }
  for (let i = 0; i < cc.ink.length; i += 1) {
    if (!outside.has(i) && cc.ink[i] > 0) return true;
  }
  return false;
}

/** 裁剪出墨迹外接框（含 1 像素余量）。 */
export function cropToInk(mask: Mask): { mask: Mask; offsetX: number; offsetY: number } {
  const b = inkBounds(mask);
  if (!b) return { mask: createMask(mask.width, mask.height), offsetX: 0, offsetY: 0 };
  const pad = 1;
  const x0 = Math.max(0, b.x0 - pad);
  const y0 = Math.max(0, b.y0 - pad);
  const x1 = Math.min(mask.width, b.x1 + 1 + pad);
  const y1 = Math.min(mask.height, b.y1 + 1 + pad);
  const w = x1 - x0;
  const h = y1 - y0;
  const out = createMask(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      out.data[y * w + x] = mask.data[(y + y0) * mask.width + (x + x0)];
    }
  }
  return { mask: out, offsetX: x0, offsetY: y0 };
}

/** 最近邻缩放。 */
export function resizeMask(mask: Mask, width: number, height: number): Mask {
  const out = createMask(width, height);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(mask.height - 1, Math.floor((y * mask.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(mask.width - 1, Math.floor((x * mask.width) / width));
      out.data[y * width + x] = mask.data[sy * mask.width + sx];
    }
  }
  return out;
}

/** 双线性缩放（缩小时对覆盖率友好一点，阈值 0.375）。 */
export function resizeMaskSmooth(mask: Mask, width: number, height: number): Mask {
  const out = createMask(width, height);
  const sx = mask.width / width;
  const sy = mask.height / height;
  for (let y = 0; y < height; y += 1) {
    const fy = (y + 0.5) * sy - 0.5;
    const y0 = Math.max(0, Math.min(mask.height - 1, Math.floor(fy)));
    const y1 = Math.min(mask.height - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < width; x += 1) {
      const fx = (x + 0.5) * sx - 0.5;
      const x0 = Math.max(0, Math.min(mask.width - 1, Math.floor(fx)));
      const x1 = Math.min(mask.width - 1, x0 + 1);
      const wx = fx - x0;
      const v =
        mask.data[y0 * mask.width + x0] * (1 - wx) * (1 - wy) +
        mask.data[y0 * mask.width + x1] * wx * (1 - wy) +
        mask.data[y1 * mask.width + x0] * (1 - wx) * wy +
        mask.data[y1 * mask.width + x1] * wx * wy;
      out.data[y * width + x] = v > 0.375 ? 1 : 0;
    }
  }
  return out;
}

/**
 * 连通域标记。
 *
 * 用途：部首定位时，一个匹配框不能只截取某根笔画的一部分——否则
 * 「小方块嵌在粗笔画里」会冒充「整个部首」。连通域让匹配框与字形的真实
 * 笔画结构对齐。
 *
 * @returns `label` 每个像素的连通域编号（-1 = 背景），`ink` 各域的墨量
 */
export function connectedComponents(mask: Mask, connectivity: 4 | 8 = 8): {
  label: Int32Array;
  ink: number[];
} {
  const { width: w, height: h } = mask;
  const label = new Int32Array(w * h).fill(-1);
  const ink: number[] = [];
  const stack: number[] = [];

  for (let start = 0; start < label.length; start += 1) {
    if (label[start] !== -1 || !mask.data[start]) continue;
    const id = ink.length;
    let count = 0;
    stack.length = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length > 0) {
      const p = stack.pop() as number;
      count += 1;
      const px = p % w;
      const py = (p - px) / w;
      const push = (nx: number, ny: number): void => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const q = ny * w + nx;
        if (label[q] !== -1 || !mask.data[q]) return;
        label[q] = id;
        stack.push(q);
      };
      push(px + 1, py);
      push(px - 1, py);
      push(px, py + 1);
      push(px, py - 1);
      if (connectivity === 8) {
        push(px + 1, py + 1);
        push(px - 1, py - 1);
        push(px + 1, py - 1);
        push(px - 1, py + 1);
      }
    }
    ink.push(count);
  }
  return { label, ink };
}

/**
 * 把子路径光栅化为掩膜（nonzero winding）。
 *
 * 坐标已是画布像素坐标（y 向下）。
 */
export function rasterizePolygons(subpaths: SubPath[], width: number, height: number): Mask {
  const mask = createMask(width, height);

  type Edge = { x0: number; y0: number; x1: number; y1: number };
  const edges: Edge[] = [];
  for (const sp of subpaths) {
    if (sp.length < 2) continue;
    const ring = sp.length > 1 && sp[0].x === sp[sp.length - 1].x && sp[0].y === sp[sp.length - 1].y
      ? sp
      : [...sp, sp[0]];
    for (let i = 1; i < ring.length; i += 1) {
      const a = ring[i - 1];
      const b = ring[i];
      if (a.y === b.y) continue;
      edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    }
  }
  if (edges.length === 0) return mask;

  // 每条边只处理其覆盖的扫描线，避免全画布扫描
  const buckets: Edge[][] = Array.from({ length: height }, () => []);
  for (const e of edges) {
    const top = Math.min(e.y0, e.y1);
    const bot = Math.max(e.y0, e.y1);
    const yStart = Math.max(0, Math.ceil(top - 0.5));
    const yEnd = Math.min(height - 1, Math.floor(bot - 0.5));
    for (let y = yStart; y <= yEnd; y += 1) buckets[y].push(e);
  }

  const xs: number[] = [];
  const dirs: number[] = [];
  for (let y = 0; y < height; y += 1) {
    const yc = y + 0.5;
    xs.length = 0;
    dirs.length = 0;
    for (const e of buckets[y]) {
      const t = (yc - e.y0) / (e.y1 - e.y0);
      xs.push(e.x0 + t * (e.x1 - e.x0));
      dirs.push(e.y1 > e.y0 ? 1 : -1);
    }
    if (xs.length < 2) continue;
    const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    let winding = 0;
    for (let k = 0; k < order.length - 1; k += 1) {
      winding += dirs[order[k]];
      if (winding === 0) continue;
      const xa = xs[order[k]];
      const xb = xs[order[k + 1]];
      const px0 = Math.max(0, Math.ceil(xa - 0.5));
      const px1 = Math.min(width - 1, Math.floor(xb - 0.5));
      for (let x = px0; x <= px1; x += 1) mask.data[y * width + x] = 1;
    }
  }
  return mask;
}

/**
 * 把描边型笔画光栅化为掩膜。
 *
 * 每一笔按 `halfWidth` 加粗成圆头圆角连接的带状区域——与 SVG 的
 * `stroke-linecap="round" stroke-linejoin="round"` 区域一致。
 */
export function rasterizeStrokes(
  strokes: Array<{ points: Point[]; halfWidth: number }>,
  width: number,
  height: number,
): Mask {
  const mask = createMask(width, height);
  for (const { points, halfWidth } of strokes) {
    if (points.length < 2) continue;
    const r = Math.max(0.5, halfWidth);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps;
        const cx = a.x + t * (b.x - a.x);
        const cy = a.y + t * (b.y - a.y);
        const x0 = Math.max(0, Math.floor(cx - r));
        const x1 = Math.min(width - 1, Math.ceil(cx + r));
        const y0 = Math.max(0, Math.floor(cy - r));
        const y1 = Math.min(height - 1, Math.ceil(cy + r));
        const rr = r * r;
        for (let y = y0; y <= y1; y += 1) {
          for (let x = x0; x <= x1; x += 1) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= rr) mask.data[y * width + x] = 1;
          }
        }
      }
    }
  }
  return mask;
}

/**
 * 把字形（填充型或描边型）光栅化到指定画布。
 *
 * `viewBox` 决定坐标映射；`flipY` 为真时把 SVG 的 y 向下翻成图像的 y 向下
 * （两者其实同向，SVG 本身就是 y 向下，所以默认 false，保留开关以备
 * 与笛卡尔坐标的图对照）。
 */
export function rasterizeGlyph(
  subpaths: SubPath[],
  opts: {
    width: number;
    height: number;
    viewBox: { x: number; y: number; width: number; height: number };
    strokes?: Array<{ points: Point[]; halfWidth: number }>;
  },
): Mask {
  const { width, height, viewBox } = opts;
  const sx = width / (viewBox.width || 1);
  const sy = height / (viewBox.height || 1);
  const map = (p: Point): Point => ({
    x: (p.x - viewBox.x) * sx,
    y: (p.y - viewBox.y) * sy,
  });

  if (opts.strokes && opts.strokes.length > 0) {
    const scaled = opts.strokes.map((s) => ({
      points: s.points.map(map),
      halfWidth: s.halfWidth * Math.abs(sx),
    }));
    return rasterizeStrokes(scaled, width, height);
  }
  const polys = subpaths.map((sp) => sp.map(map));
  return rasterizePolygons(polys, width, height);
}

/** 把一组子路径的包围盒换算成画布像素坐标。 */
export function boundsInPixels(
  subpaths: SubPath[],
  viewBox: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const b = boundsOf(subpaths);
  const sx = width / (viewBox.width || 1);
  const sy = height / (viewBox.height || 1);
  return {
    x: (b.x - viewBox.x) * sx,
    y: (b.y - viewBox.y) * sy,
    width: b.width * sx,
    height: b.height * sy,
  };
}
