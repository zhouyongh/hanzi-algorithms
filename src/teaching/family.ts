/**
 * E7 声族聚合：把共用同一个声符的形声字聚成一族。
 *
 * 「江、汀、泞、杠」——声旁都是「工」；「河、苛、柯」——声旁都是「可」。
 * 教学应用里这叫「声族」，用来讲「形声字以形表义、以声表音」。
 *
 * 难点在于**怎么认出哪个部分是声符**。这里不靠外部字典，而是靠形状：
 * 同一个声符在不同字里写法会有出入，但整体轮廓相近。所以做法是——
 *
 * 1. 从每个字里取出**非部首的那一部分**（形声分析里的声符侧）；
 * 2. 把它归一化成一张 16×16 的位图**形状描述子**；
 * 3. 用描述子的汉明距离聚类：距离小于阈值的归为一族。
 *
 * 局限要说明白：这是**按形聚类**，不是按读音聚类。真正的声族要看韵书/方言。
 * 但对教学来说，「这几个字长得像一家」正是要教的东西。
 */

import type { Glyph } from "../glyph.ts";
import { isStrokeGlyph } from "../glyph.ts";
import { boundsOf } from "../geometry/path.ts";
import { fitToBox } from "../geometry/transform.ts";
import { countInk, rasterizeGlyph, type Mask } from "../raster/mask.ts";

/** 描述子边长（16×16 = 256 位）。 */
export const DESCRIPTOR_SIZE = 16;

/** 形状描述子（256 位，用 Uint8Array 存，每字节 8 位）。 */
export type Descriptor = Uint8Array;

/**
 * 取字形里某几个路径组成的部件，归一化成形状描述子。
 *
 * @param glyph       字形
 * @param pathIndices 部件包含的路径下标
 * @param size        描述子边长
 */
export function componentDescriptor(
  glyph: Glyph,
  pathIndices: number[],
  size = DESCRIPTOR_SIZE,
): Descriptor {
  const desc = new Uint8Array((size * size) / 8);
  if (pathIndices.length === 0) return desc;

  const subpaths = glyph.paths
    .filter((_, i) => pathIndices.includes(i))
    .flatMap((p) => p.subpaths);
  if (subpaths.length === 0) return desc;

  // **在部件自己的包围盒里光栅化**，不要用整字的画布。
  //
  // 早先用的是 `viewBox: glyph.viewBox` + 64×64 画布：部件只占整字的三成，
  // 就只剩十几个像素，再缩到 16×16 满是量化噪声——同一个声符写得大小位置
  // 略不同，描述子就差很多，族自然散了（实测瑾/璚/瑦/璀 共用「堇」声符，
  // 在所有阈值下都被拆到不同的族里）。
  //
  // 改成按部件自己的框光栅化：分辨率只跟部件有关，描述子就真的只看形状。
  const box = boundsOf(subpaths);
  const boxW = Math.max(1e-6, box.width);
  const boxH = Math.max(1e-6, box.height);
  const scale = (size * 4) / Math.max(boxW, boxH);
  const part = rasterizeGlyph(subpaths, {
    width: Math.max(1, Math.round(boxW * scale)),
    height: Math.max(1, Math.round(boxH * scale)),
    viewBox: box,
    strokes: isStrokeGlyph(glyph)
      ? glyph.paths
          .filter((_, i) => pathIndices.includes(i))
          .map((p) => ({ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }))
      : undefined,
  });

  // 部件要单独归一化（不能沿用整字的框）。
  // 注意：不能拿「用户单位的包围盒」判空——单独一条横线在用户单位里高度是 0，
  // 但它确实有墨。判空要看光栅化之后的结果。
  const cropped = cropToInk(part);
  if (countInk(cropped.mask) === 0) return desc;
  const matrix = fitToBox(
    { x: 0, y: 0, width: cropped.mask.width, height: cropped.mask.height },
    { x: 0, y: 0, width: size, height: size },
    true,
  );
  const normalized = resampleMask(cropped.mask, matrix, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!normalized[y * size + x]) continue;
      const bit = y * size + x;
      desc[bit >> 3] |= 1 << (bit & 7);
    }
  }
  return desc;
}

/** 裁到墨迹外接框。 */
function cropToInk(mask: Mask): { mask: Mask; offsetX: number; offsetY: number } {
  const b = boundsOfMask(mask);
  if (!b) return { mask, offsetX: 0, offsetY: 0 };
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const out = rasterizeGlyph([], { width: w, height: h, viewBox: { x: 0, y: 0, width: 1, height: 1 } });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (mask.data[(y + b.y0) * mask.width + (x + b.x0)]) out.data[y * w + x] = 1;
    }
  }
  return { mask: out, offsetX: b.x0, offsetY: b.y0 };
}

/** 掩膜的墨迹外接框。 */
function boundsOfMask(mask: Mask): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.data[y * mask.width + x]) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x + 1 > x1) x1 = x + 1;
      if (y + 1 > y1) y1 = y + 1;
    }
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

/** 按仿射矩阵重采样掩膜。 */
function resampleMask(mask: Mask, matrix: ReturnType<typeof fitToBox>, size: number): Uint8Array {
  const out = new Uint8Array(size * size);
  // 源坐标系就是掩膜自己的像素单位（fitToBox 的源框也是像素单位）
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.data[y * mask.width + x]) continue;
      const ux = x + 0.5;
      const uy = y + 0.5;
      const tx = matrix.a * ux + matrix.c * uy + matrix.e;
      const ty = matrix.b * ux + matrix.d * uy + matrix.f;
      const px = Math.floor(tx);
      const py = Math.floor(ty);
      if (px >= 0 && py >= 0 && px < size && py < size) out[py * size + px] = 1;
    }
  }
  return out;
}

/** 两个描述子的汉明距离（不同位的个数）。 */
export function descriptorDistance(a: Descriptor, b: Descriptor): number {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = a[i] ^ b[i];
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** 一个声族成员。 */
export interface FamilyMember {
  /** 现代字。 */
  char: string;
  /** 语义部首（形符）。 */
  semantic: string;
  /** 声符所在侧。 */
  side: string;
}

/** 一个声族。 */
export interface PhoneticFamily {
  /** 声族的代表字（成员里最靠前的）。 */
  representative: string;
  /** 成员。 */
  members: FamilyMember[];
  /** 成员数。 */
  size: number;
  /** 族内两两的最大距离（越小越紧）。 */
  spread: number;
}

/** 参与聚类的条目。 */
export interface FamilyInput {
  /** 现代字。 */
  char: string;
  /** 语义部首。 */
  semantic: string;
  /** 声符所在侧。 */
  side: string;
  /** 声符部件的形状描述子。 */
  descriptor: Descriptor;
}

/**
 * 按声符形状聚类。
 *
 * @param inputs 参与聚类的条目
 * @param maxDistance 汉明距离上限（默认 24 / 256 位，即约 9% 的位不同）
 *
 * 两条关键设计：
 * 1. **要和族里每个成员都像**，不能只跟代表比。贪心地只比代表会「串链」——
 *    A 像 B、B 像 C 但 A 不像 C，最后全并进一族。实测不这么约束时最大的一族
 *    有 156 个成员，混进了玉部、艹部、足部、訁部毫不相干的字。
 * 2. 距离用**描述子位数**衡量：256 位里差 24 位≈ 9% 的形状不同。
 *
 * 阈值是量出来的（1500 字样本，`tools/diag_family_sweep.ts`）：
 * 40 → 最大族 58 笔、族里混了 8 种语义部（串链）；
 * 24 → 最大族 8 笔、4 种语义部；20 → 最大族 12 笔、1 种语义部（最干净）。
 * 取 24：再紧会把真族拆散，再松就串链。
 */
export function buildPhoneticFamilies(
  inputs: FamilyInput[],
  maxDistance = 24,
): PhoneticFamily[] {
  const families: PhoneticFamily[] = [];
  const descOf = new Map<string, Descriptor>();
  for (const i of inputs) descOf.set(i.char, i.descriptor);

  for (const item of inputs) {
    let placed = false;
    for (const fam of families) {
      // 必须与族里**每一个**成员都够像
      const tooFar = fam.members.some((m) => {
        const d = descOf.get(m.char);
        return d ? descriptorDistance(item.descriptor, d) > maxDistance : false;
      });
      if (tooFar) continue;
      fam.members.push({ char: item.char, semantic: item.semantic, side: item.side });
      fam.size = fam.members.length;
      placed = true;
      break;
    }
    if (!placed) {
      families.push({
        representative: item.char,
        members: [{ char: item.char, semantic: item.semantic, side: item.side }],
        size: 1,
        spread: 0,
      });
    }
  }

  // 算每族的离散度
  for (const fam of families) {
    let spread = 0;
    for (const m of fam.members) {
      const src = descOf.get(m.char);
      if (!src) continue;
      for (const other of fam.members) {
        const o = descOf.get(other.char);
        if (!o) continue;
        spread = Math.max(spread, descriptorDistance(src, o));
      }
    }
    fam.spread = spread;
  }

  return families.sort((a, b) => b.size - a.size || a.representative.localeCompare(b.representative));
}

/** 从字形与路径下标算描述子的便捷封装（供数据生成器用）。 */
export function descriptorOf(glyph: Glyph, pathIndices: number[]): Descriptor {
  return componentDescriptor(glyph, pathIndices);
}

/** 掩膜的墨量（辅助）。 */
export function inkOf(mask: Mask): number {
  return countInk(mask);
}
