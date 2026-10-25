/**
 * 笔画形状描述子。
 *
 * 用途：判断两个字里的某一笔「是不是同一种笔画」。
 *
 * ## 为什么不能直接比像素
 *
 * 篆书等字形是**摹本**——每个字都是手抄的，同一个偏旁在不同字里的写法
 * 并不完全一样（「水」作左偏旁时是三条波浪线，各字的长短曲直都有出入）。
 * 所以偏旁的形状只能「大致相同」，不能要求逐位相同。
 *
 * 描述子：把一笔**按自身外接框**归一化成 12×12 的位图，再记一个长宽比桶。
 * 按自身外接框归一化 → 与它在字里的位置、大小无关，只看形状。
 */

import type { Mask } from "../raster/mask.ts";
import { createMask, resizeMaskSmooth } from "../raster/mask.ts";

/** 描述子位图边长。 */
export const DESC_SIZE = 12;

/** 一个形状描述子：`长宽比桶|位图`。 */
export type Descriptor = string;

/** 描述子的解析结果。 */
interface ParsedDescriptor {
  /** 长宽比桶（数值）。 */
  aspect: number;
  /** 长宽比桶的原始文本。 */
  aspectText: string;
  /** 位图（0/1 串）。 */
  bits: string;
}

/**
 * 解析描述子；畸形的一律返回 null。
 *
 * 畸形有四种：缺 `|` 分隔符、长宽比不是数（或是空串）、位图里有非 0/1 的字符、
 * 分隔符多于一个。描述子会从外部数据（部首偏旁形码本）读进来，
 * 畸形值必须能被挡掉，而不是让整条流水线炸掉。
 */
function parseDescriptor(d: Descriptor): ParsedDescriptor | null {
  const parts = d.split("|");
  if (parts.length !== 2) return null;
  const aspectText = parts[0];
  const bits = parts[1];
  if (!bits || !/^[01]+$/.test(bits)) return null;
  // 空串会被 Number() 当成 0，所以先按文本形态挡一道
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(aspectText)) return null;
  const aspect = Number(aspectText);
  if (!Number.isFinite(aspect)) return null;
  return { aspect, aspectText, bits };
}

/**
 * 计算一条路径的形状描述子。
 *
 * @param mask 该路径在**自身外接框**里归一化后的掩膜
 */
export function describeMask(mask: Mask): Descriptor {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.data[y * mask.width + x]) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return "empty";
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const sub = createMask(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (mask.data[(y + y0) * mask.width + (x + x0)]) sub.data[y * w + x] = 1;
    }
  }
  const norm = resizeMaskSmooth(sub, DESC_SIZE, DESC_SIZE);
  let bits = "";
  for (const b of norm.data) bits += b ? "1" : "0";
  const aspect = Math.round((w / h) * 3) / 3;
  return `${aspect.toFixed(2)}|${bits}`;
}

/**
 * 两个描述子的距离。
 *
 * = 位图不同的位数 + 长宽比差 × 权重。
 * 位图部分最多 DESC_SIZE² = 144。
 *
 * ## 长宽比为什么用**对数比**
 *
 * 长宽比是**比值**，跨度极大（横笔 40、竖笔 0.03），所以差异必须按**比例**算，
 * 不能按**绝对差**算。
 *
 * 早先用的是 `|a1 - a2| × 24`（绝对差）。于是「語」路径 3 的长宽比 7.33
 * 与部首「言」独立形态那一横的 13.33，差 6.0 → **144 分**——
 * 与「位图完全不是一回事」等价，可这两个笔画的位图只差 **9 位**。
 * 一根横画与另一根横画，因为长短比例差一倍就被判成毫不相干。
 *
 * 改成 `|log(a1) - log(a2)| × 权重`：比值差 2 倍记 8.3 分，
 * 差 1000 倍（横 vs 竖）记 86 分——**尺度无关，量纲也对得上位图那 144 位**。
 */
export function descriptorDistance(a: Descriptor, b: Descriptor): number {
  if (a === b) return 0;
  if (a === "empty" || b === "empty") return Infinity;
  const pa = parseDescriptor(a);
  const pb = parseDescriptor(b);
  if (!pa || !pb) return Infinity;

  // 位图：按最长的一侧对齐逐位比，缺位算「不同」。
  //
  // 只比公共前缀是不够的：「1.00|0101」与「1.00|0101」+140 个 0 的公共前缀
  // 完全一致，距离会算成 0 —— 于是两个不同的形状被判成同一个。
  const n = Math.max(pa.bits.length, pb.bits.length);
  let diff = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i < pa.bits.length ? pa.bits[i] : "-";
    const y = i < pb.bits.length ? pb.bits[i] : "-";
    if (x !== y) diff += 1;
  }
  // 长宽比：按**比值**算（对数差），量纲与位图的「差几位」对齐。
  // 长宽比可能量化到 0（极窄的竖笔画），取下限避免 log(0)。
  const aspectDiff = Math.abs(logRatio(pa.aspect) - logRatio(pb.aspect));
  // 格式差异（同值不同写法，如 "1.0" 与 "1.00"）也算不同，
  // 保证「字符串不同 ⇒ 距离 > 0」
  const formatDiff = pa.aspectText === pb.aspectText ? 0 : 0.5;
  return diff + aspectDiff * ASPECT_WEIGHT + formatDiff;
}

/** 长宽比的对数（长宽比可能量化到 0，取下限避免 log(0)）。 */
function logRatio(aspect: number): number {
  return Math.log(Math.max(aspect, 1e-3));
}

/**
 * 长宽比差在总距离里的权重。
 *
 * 取 12 是为了与位图的量纲对齐：比值差 2 倍记 8.3 分（≈ 8 个位），
 * 比值差 1000 倍（横 vs 竖）记 86 分。
 */
const ASPECT_WEIGHT = 12;

/**
 * 一个描述子集合的代表（贪心聚类后的中心）。
 *
 * @param descriptors 一堆描述子
 * @param threshold   归为同类的距离上限
 */
export function clusterDescriptors(descriptors: Descriptor[], threshold: number): Descriptor[] {
  const centers: Descriptor[] = [];
  for (const d of descriptors) {
    // empty 与畸形描述子都不进簇：它们代表不了任何形状
    if (!parseDescriptor(d)) continue;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < centers.length; i += 1) {
      const dist = descriptorDistance(d, centers[i]);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    if (best >= 0 && bestDist <= threshold) {
      // 并入该簇：取位图的多数票（更稳）
      centers[best] = mergeDescriptors(centers[best], d);
    } else {
      centers.push(d);
    }
  }
  return centers;
}

/**
 * 两个描述子取「位图多数票、长宽比取均值」。
 *
 * 位图按**最长的一侧**对齐：短的那一侧缺的位直接沿用长的一侧，
 * 不像旧实现那样只比公共前缀、把多出来的位整段丢掉。
 */
function mergeDescriptors(a: Descriptor, b: Descriptor): Descriptor {
  const pa = parseDescriptor(a);
  const pb = parseDescriptor(b);
  if (!pa || !pb) return pa ? a : b;
  const n = Math.max(pa.bits.length, pb.bits.length);
  let bits = "";
  for (let i = 0; i < n; i += 1) {
    const x = i < pa.bits.length ? pa.bits[i] : undefined;
    const y = i < pb.bits.length ? pb.bits[i] : undefined;
    if (x === undefined) bits += y ?? "0";
    else if (y === undefined) bits += x;
    else bits += x === y ? x : "0";
  }
  const aspect = (pa.aspect + pb.aspect) / 2;
  return `${aspect.toFixed(2)}|${bits}`;
}

/**
 * 描述子与一组参考描述子的最小距离。
 */
export function minDescriptorDistance(d: Descriptor, refs: Descriptor[]): number {
  let best = Infinity;
  for (const r of refs) {
    const dist = descriptorDistance(d, r);
    if (dist < best) best = dist;
  }
  return best;
}
