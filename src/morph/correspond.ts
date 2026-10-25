/**
 * C1 跨书体笔画对应。
 *
 * 「甲骨文的日变成小篆的日」要能连续变形，前提是知道**哪一笔甲骨对应哪一笔篆**。
 * 现有数据里没有这个对应关系，只能算出来。
 *
 * 做法分两步：
 *
 * 1. **归一化**：把两个书体的字形各自按墨迹外接框等比居中到同一张画布上
 *    （不同书体的画布大小、留白完全不同，不对齐就没有可比性）；
 * 2. **配对**：按「墨量重叠」给每一对笔画打分，再做**严格一对一**的匹配——
 *    一个源笔画最多配一个目标笔画，一个目标笔画最多被一个源笔画配。
 *
 * 局限（必须诚实标注）：
 * - 这是**空间重叠**对应，不是语义对应。甲骨的「目」画成眼睛形，篆书的「目」
 *   画成竖目形，两者笔数与位置都不同，对应只在大部件层面成立；
 * - 笔画数不等时**必然有一边多出来**：配不上的源笔画进 `unmatchedFrom`，
 *   配不上的目标笔画进 `unmatchedTo`。形变时靠这两个清单说清
 *   「哪一笔隐藏了、哪一笔浮出来了」，并用「一对多拆分」补齐。
 */

import type { Glyph } from "../glyph.ts";
import { glyphStrokes, isStrokeGlyph } from "../glyph.ts";
import { countInk, cropToInk, rasterizeGlyph, type Mask } from "../raster/mask.ts";
import { applyAll, fitToBox, type Matrix } from "../geometry/transform.ts";
import type { Rect, SubPath } from "../geometry/path.ts";

/** 一条对应关系。 */
export interface StrokeCorrespondence {
  /** 源字形笔画下标。 */
  from: number;
  /** 目标字形笔画下标。 */
  to: number;
  /** 源笔画墨量落在目标笔画上的比例。 */
  overlap: number;
  /** 目标笔画墨量被源笔画覆盖的比例。 */
  coverage: number;
}

/** 对应结果。 */
export interface CorrespondenceResult {
  /** 一对一的对应（按源笔画顺序）。 */
  pairs: StrokeCorrespondence[];
  /** 没有找到对应目标的源笔画。 */
  unmatchedFrom: number[];
  /** 没有被任何源笔画覆盖的目标笔画。 */
  unmatchedTo: number[];
  /** 整体可信度：各条 overlap 的平均值。 */
  confidence: number;
}

/** 对应参数。 */
export interface CorrespondOptions {
  /** 光栅分辨率。 */
  resolution?: number;
  /** 低于此重叠率视为「没有对应」。 */
  minOverlap?: number;
}

/** 归一化后落在画布里的单条路径。 */
interface FramedPath {
  /** 画布坐标系里的子路径。 */
  subpaths: SubPath[];
  /** 描边半宽（已按缩放换算）；填充型为 0。 */
  halfWidth: number;
}

/**
 * 墨迹外接框（字形坐标系）。
 *
 * 描边型（甲骨骨架）本身没有面积，墨迹比折线宽出笔宽的一半，
 * 量外接框时要按笔宽外扩，否则会把笔画的出头切掉。
 *
 * 非有限坐标（NaN / Infinity）直接跳过：让它们污染整个外接框，
 * 归一化就会把整个字形变成 NaN。
 */
function inkBox(glyph: Glyph): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of glyph.paths) {
    const pad = p.filled ? 0 : p.strokeWidth / 2;
    for (const sp of p.subpaths) {
      for (const pt of sp) {
        if (pt.x - pad < minX) minX = pt.x - pad;
        if (pt.x + pad > maxX) maxX = pt.x + pad;
        if (pt.y - pad < minY) minY = pt.y - pad;
        if (pt.y + pad > maxY) maxY = pt.y + pad;
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  if (!Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 画布内的取景框：四周留 4% 余白。
 *
 * 与 `interpolate.ts` 的 `normalizeGlyph` 取同一景——那套归一化已经跑过的字形，
 * 再进本模块时不会被二次挪动。
 */
function frameBox(resolution: number): Rect {
  return {
    x: resolution * 0.04,
    y: resolution * 0.04,
    width: resolution * 0.92,
    height: resolution * 0.92,
  };
}

/**
 * 墨迹外接框 → 画布的等比居中变换。
 *
 * 没有直接用 `fitToBox`：它遇到零尺寸会退回单位阵，字形就留在原坐标系里，
 * 光栅化时可能被画布裁掉。这里改用「较长边定缩放」，零边那一维不动。
 */
function frameMatrix(box: Rect, resolution: number): Matrix {
  const frame = frameBox(resolution);
  // 两边都是 0 时没有可缩放的东西，按 1:1 放回画布中心
  const s =
    box.width > 0 && box.height > 0
      ? Math.min(frame.width / box.width, frame.height / box.height)
      : box.width > 0
        ? frame.width / box.width
        : box.height > 0
          ? frame.height / box.height
          : 1;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    a: s,
    b: 0,
    c: 0,
    d: s,
    e: frame.x + frame.width / 2 - cx * s,
    f: frame.y + frame.height / 2 - cy * s,
  };
}

/**
 * 把字形按墨迹外接框等比居中到画布，返回每条路径在画布里的几何。
 *
 * 为什么不用 `normalizeToFrame`：那个函数在**光栅像素空间**里量外接框，
 * 用的是 SVG 声明的 viewBox——上游字形的墨迹会跑到框外（实测「明」的墨迹
 * x 到 −124），按声明框量会把字裁掉；而且非正方形的 viewBox（甲骨层是
 * 21×19）先被拉成正方形再量外接框，形状会被拉变形。这里改成在
 * **字形坐标系**里量墨迹（含描边笔宽），再等比映射到画布。
 */
function framePaths(glyph: Glyph, resolution: number): FramedPath[] {
  const box = inkBox(glyph);
  const matrix = box ? frameMatrix(box, resolution) : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  // 画布上的笔画要一样粗：描边宽度按缩放系数换算
  const scale = Math.hypot(matrix.a, matrix.b);
  const usable = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return glyph.paths.map((p) => ({
    subpaths: p.subpaths.map((sp) => applyAll(matrix, sp)),
    halfWidth: p.filled ? 0 : (p.strokeWidth / 2) * usable,
  }));
}

/** 逐路径光栅化到统一画布（保留路径边界）。 */
function pathMasks(glyph: Glyph, resolution: number): Mask[] {
  const framed = framePaths(glyph, resolution);
  const skeleton = isStrokeGlyph(glyph);
  const viewBox = { x: 0, y: 0, width: resolution, height: resolution };
  return framed.map((p) => {
    if (skeleton) {
      // 描边型：折线按笔宽加粗成带状区域（与 SVG 的 round 线帽一致）
      return rasterizeGlyph(p.subpaths, {
        width: resolution,
        height: resolution,
        viewBox,
        strokes: [{ points: p.subpaths[0] ?? [], halfWidth: p.halfWidth }],
      });
    }
    return rasterizeGlyph(p.subpaths, {
      width: resolution,
      height: resolution,
      viewBox,
    });
  });
}

/** 两个掩膜的交集像素数。 */
function intersectCount(a: Mask, b: Mask): number {
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
 * 计算两个书体字形之间的笔画对应。
 *
 * 配对是**严格一对一**的：一个源笔画最多配一个目标笔画，一个目标笔画
 * 最多被一个源笔画配。配不上的源笔画进 `unmatchedFrom`，配不上的目标笔画
 * 进 `unmatchedTo`——不这么约束的话，同一条目标轮廓会被当成好几笔的演变结果，
 * 「哪一笔在演变、哪一笔隐藏了」这个结论就是错的。
 *
 * 局限：打分用的是「源笔画的墨量落在目标笔画上的比例」，对**大目标**偏宽松——
 * 一条细笔画整个落进一个大目标里，overlap 同样是 1。目标笔画明显更大时，
 * 这个分数分不出「整条对应」与「只是落在大目标里」。`coverage` 一并返回，
 * 供调用方自己判断。
 */
export function correspondStrokes(
  from: Glyph,
  to: Glyph,
  options: CorrespondOptions = {},
): CorrespondenceResult {
  const resolution = options.resolution ?? 200;
  const minOverlap = options.minOverlap ?? 0.02;

  const fromMasks = pathMasks(from, resolution);
  const toMasks = pathMasks(to, resolution);
  const fromInk = fromMasks.map(countInk);
  const toInk = toMasks.map(countInk);

  // ── 候选对 ────────────────────────────────────────────────
  // 分数 = 源笔画的墨量有多少落在目标笔画上（overlap）。
  const candidates: StrokeCorrespondence[] = [];
  for (let fi = 0; fi < fromMasks.length; fi += 1) {
    if (fromInk[fi] === 0) continue;
    for (let ti = 0; ti < toMasks.length; ti += 1) {
      if (toInk[ti] === 0) continue;
      const inter = intersectCount(fromMasks[fi], toMasks[ti]);
      if (inter === 0) continue;
      const overlap = inter / fromInk[fi];
      if (overlap < minOverlap) continue;
      candidates.push({ from: fi, to: ti, overlap, coverage: inter / toInk[ti] });
    }
  }

  // ── 一对一匹配 ────────────────────────────────────────────
  // 按分数降序**全局贪心**：先把全部候选对排好序，再依次占用还没被占的
  // 源笔画与目标笔画。
  //
  // 为什么不用「源笔画按顺序逐个抢最好的目标」（先到先得）：排在前面的
  // 笔画会抢走本该属于后面某一笔的目标。实测 255 组真实字形对：
  // 先到先得共配 618 对、总相关度 170.5、平均 overlap 0.276；
  // 全局贪心配 640 对、总相关度 220.1、平均 overlap 0.344。
  //
  // 同分时先看 coverage（目标笔画被解释得是否更完整），再按下标升序，
  // 保证同一输入必得同一输出。
  candidates.sort(
    (a, b) => b.overlap - a.overlap || b.coverage - a.coverage || a.from - b.from || a.to - b.to,
  );

  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();
  const pairs: StrokeCorrespondence[] = [];
  for (const c of candidates) {
    if (usedFrom.has(c.from) || usedTo.has(c.to)) continue;
    usedFrom.add(c.from);
    usedTo.add(c.to);
    pairs.push({ from: c.from, to: c.to, overlap: c.overlap, coverage: c.coverage });
  }
  pairs.sort((a, b) => a.from - b.from);
  const unmatchedFrom = fromMasks.map((_, i) => i).filter((i) => !usedFrom.has(i));
  const unmatchedTo = toMasks
    .map((_, i) => i)
    .filter((i) => !usedTo.has(i) && toInk[i] > 0);

  const confidence =
    pairs.length === 0 ? 0 : pairs.reduce((s, p) => s + p.overlap, 0) / pairs.length;

  return { pairs, unmatchedFrom, unmatchedTo, confidence };
}

/**
 * 把两个字形归一化到同一坐标系（墨迹外接框等比居中）。
 *
 * 归一化是跨书体比较的前提：不同书体的画布大小、留白完全不同。
 *
 * 注意：这个函数在**光栅像素空间**里工作（返回的是原始光栅坐标 → 画布的矩阵），
 * 供「已经在像素空间里比形状」的调用方使用；`correspondStrokes` 自己走的是
 * 字形坐标系的归一化（见 `framePaths`），两者取景差 4%。
 */
export function normalizeToFrame(
  glyph: Glyph,
  resolution: number,
): { mask: Mask; matrix: ReturnType<typeof fitToBox> } {
  const all = glyph.paths.flatMap((p) => p.subpaths);
  const raw = rasterizeGlyph(all, {
    width: resolution,
    height: resolution,
    viewBox: glyph.viewBox,
    strokes: isStrokeGlyph(glyph) ? glyphStrokes(glyph) : undefined,
  });
  const { mask: inkMask, offsetX, offsetY } = cropToInk(raw);
  const box = {
    x: 0,
    y: 0,
    width: resolution * 0.92,
    height: resolution * 0.92,
  };
  const matrix = fitToBox(
    { x: offsetX, y: offsetY, width: inkMask.width, height: inkMask.height },
    box,
    true,
  );
  return { mask: inkMask, matrix };
}
