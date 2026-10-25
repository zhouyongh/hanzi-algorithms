/**
 * E1 描红底本。
 *
 * 描红是把字形压成浅色轮廓让人照着描。要做成库，输出就得是**渲染无关的描述**
 * 而不是 DOM——下游可能用 SVG、Canvas、PDF，任何一种都能画。
 *
 * 两种字形形态各有一套做法：
 * - **描边型**（甲骨骨架）：笔画本身是折线，底本就是同一条折线加粗成浅色带；
 * - **填充型**（摹本轮廓）：笔画本身是闭合轮廓，底本就是同一条轮廓填浅色。
 *
 * 另外给出**笔顺**：甲骨骨架的文件顺序即落笔顺序，可以直接拿来驱动书写动画。
 */

import type { Glyph } from "../glyph.ts";
import { glyphStrokes, isStrokeGlyph } from "../glyph.ts";
import type { Point, SubPath } from "../geometry/path.ts";

/** 描红底本里的一笔。 */
export interface TraceStroke {
  /** 描边型（沿折线加粗）或填充型（填闭合轮廓）。 */
  kind: "stroke" | "fill";
  /** 描边型的笔宽（用户单位）；填充型为 0。 */
  width: number;
  /** 描边型的折线点列；填充型为空。 */
  points: Point[];
  /** 填充型的闭合轮廓（描边型也有，用于回退绘制）。 */
  subpaths: SubPath[];
  /** 笔序（从 0 起）。 */
  order: number;
}

/** 描红底本。 */
export interface TraceTemplate {
  /** 逐笔的底本。 */
  strokes: TraceStroke[];
  /** 笔序（`<path>` 下标序列）。 */
  order: number[];
  /** 字形是描边型还是填充型。 */
  kind: "skeleton" | "outline";
}

/** 描红底本参数。 */
export interface TraceOptions {
  /** 描边型底本的笔宽倍率（相对原笔宽）。 */
  widthScale?: number;
  /** 描边型底本的绝对笔宽（用户单位）；给了就优先用它。 */
  width?: number;
}

/**
 * 生成描红底本。
 *
 * @param glyph 字形
 * @param options 参数
 */
export function buildTraceTemplate(glyph: Glyph, options: TraceOptions = {}): TraceTemplate {
  const widthScale = options.widthScale ?? 1.6;
  const skeleton = isStrokeGlyph(glyph);

  if (skeleton) {
    const strokes = glyphStrokes(glyph);
    return {
      kind: "skeleton",
      order: strokes.map((_, i) => i),
      strokes: strokes.map((s, i) => ({
        kind: "stroke" as const,
        width: options.width ?? Math.max(s.halfWidth * 2 * widthScale, 1),
        points: s.points,
        subpaths: [],
        order: i,
      })),
    };
  }

  return {
    kind: "outline",
    order: glyph.paths.map((_, i) => i),
    strokes: glyph.paths.map((p, i) => ({
      kind: "fill" as const,
      width: 0,
      points: [],
      subpaths: p.subpaths,
      order: i,
    })),
  };
}

/**
 * 描红底本的 SVG 片段（给 SVG 渲染端直接用）。
 *
 * @param template 底本
 * @param color    底本颜色
 */
export function traceTemplateToSvg(template: TraceTemplate, color = "#eae4d6"): string {
  return template.strokes
    .map((s) => {
      const d = s.kind === "stroke"
        ? `M ${s.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}`
        : s.subpaths
            .map((sp) => `M ${sp.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")} Z`)
            .join(" ");
      if (s.kind === "stroke") {
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${s.width.toFixed(2)}" ` +
          `stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      return `<path d="${d}" fill="${color}" fill-rule="nonzero"/>`;
    })
    .join("\n");
}
