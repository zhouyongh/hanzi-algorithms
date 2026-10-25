/**
 * E4 形声分析：从构形分解推出「哪个是形符、哪个是声符」。
 *
 * 汉字里形声字占七成以上。教学应用常问「这个字读音跟哪部分有关」——
 * 答案就是声符。判据是汉字学的常规规则：
 *
 * - **左右结构**（⿰）：左形右声居多（江、汀、河），但也有反的（都、者）；
 * - **上下结构**（⿱）：上形下声居多（花、苹），也有反的（界限）；
 * - **形符**就是语义部首，也就是我们能定位出来的那个说文部；
 * - **声符**是另一部分，它的读音跟整字读音同源。
 *
 * 本模块给出**带置信度的判断**，不装作确定：形符的位置符合常规时置信度高，
 * 反常时降级，置信度低时明说「存疑」。
 */

import type { StructureCode } from "../structure/decomposition.ts";
import type { Decomposition } from "../structure/decomposition.ts";
import type { RadicalMatch } from "../structure/radical.ts";

/** 形声分析结果。 */
export interface PhoneticAnalysis {
  /** 是否判为形声字。 */
  isPhonoSemantic: boolean;
  /** 形符（语义部首）一侧。 */
  semantic: { side: "left" | "right" | "top" | "bottom" | "enclosing" | "whole"; pathIndices: number[] };
  /** 声符一侧。 */
  phonetic: { side: "left" | "right" | "top" | "bottom" | "enclosing" | "whole"; pathIndices: number[] };
  /** 置信度 [0, 1]。 */
  confidence: number;
  /** 判断依据（中文说明，便于直接展示给学生）。 */
  basis: string;
}

/**
 * 形声分析。
 *
 * @param decomposition 构形分解结果
 * @param match         部首定位结果（给出形符的路径与置信度）
 * @param options       参数
 */
export function analyzePhonetic(
  decomposition: Decomposition,
  match: RadicalMatch | null,
  options: { radicalChar?: string; phoneticChar?: string } = {},
): PhoneticAnalysis {
  const radical = decomposition.radicalPathIndices;
  const remainder = decomposition.remainderPathIndices;
  const structure = decomposition.structure;

  // 部首就是整字 → 独体字，不是形声结构
  if (remainder.length === 0) {
    return {
      isPhonoSemantic: false,
      semantic: { side: "whole", pathIndices: radical },
      phonetic: { side: "whole", pathIndices: [] },
      confidence: 0.2,
      basis: "部首即整字，属独体字或合体字，不作形声分析。",
    };
  }

  const sideOf = (): PhoneticAnalysis["semantic"]["side"] => {
    // 优先用几何判出来的部首方位；没有（老调用方）才从结构符反推。
    if (decomposition.radicalSide) return decomposition.radicalSide;
    if (structure === "⿰") return "left";
    if (structure === "⿲") return "right";
    if (structure === "⿱") return "top";
    if (structure === "⿳") return "top";
    if (structure === "⿵" || structure === "⿶" || structure === "⿷" || structure === "⿸" || structure === "⿹") {
      return "enclosing";
    }
    return "whole";
  };

  const radicalSide = sideOf();
  // 常规与否看**部首在哪一侧**，不看结构符：部首在下（⿷，如「想」= ⿱相心）
  // 同样是反常格局，跟部首在左（⿰）性质不同。
  const isConventional = radicalSide === "left" || radicalSide === "top" || radicalSide === "enclosing";
  const score = match?.score ?? 0.4;

  // 形符所在侧：部首在常规位置 → 形符就在那侧；反常 → 形符在另一侧
  const semanticSide = radicalSide;
  const phoneticSide: PhoneticAnalysis["phonetic"]["side"] =
    semanticSide === "left" ? "right"
      : semanticSide === "right" ? "left"
        : semanticSide === "top" ? "bottom"
          : semanticSide === "bottom" ? "top"
            : "enclosing";

  const confidence = Math.max(0, Math.min(1, score * (isConventional ? 0.9 : 0.55)));

  const semanticName = options.radicalChar ? `「${options.radicalChar}」` : "语义部首";
  const phoneticName = options.phoneticChar ? `「${options.phoneticChar}」` : "另一构件";

  return {
    isPhonoSemantic: true,
    semantic: { side: semanticSide, pathIndices: radical },
    phonetic: { side: phoneticSide, pathIndices: remainder },
    confidence,
    basis: isConventional
      ? `${structure} 属常见形声格局：${semanticName}为形符，${phoneticName}为声符，读音从声符来。`
      : `${structure} 的形声格局与常见情形相反（形符在${sideText(semanticSide)}），` +
        `仍按字形判定：${semanticName}为形符，${phoneticName}为声符，但置信度较低。`,
  };
}

/** 方位的中文说法。 */
function sideText(side: string): string {
  switch (side) {
    case "left": return "左";
    case "right": return "右";
    case "top": return "上";
    case "bottom": return "下";
    case "enclosing": return "外围";
    default: return "整体";
  }
}

/**
 * 形声字比例统计（给定一张字表）。
 *
 * 教学应用里常用来佐证「形声字占七成以上」这个说法。
 */
export interface PhonoSemanticStats {
  /** 参与统计的字数。 */
  total: number;
  /** 判为形声字的字数。 */
  phonoSemantic: number;
  /** 比例 [0, 1]。 */
  ratio: number;
  /** 常规格局的占比。 */
  conventionalRatio: number;
}

/** 统计形声字比例。 */
export function phonoSemanticStats(
  analyses: Array<{ isPhonoSemantic: boolean; confidence: number; basis: string }>,
): PhonoSemanticStats {
  const total = analyses.length;
  const phono = analyses.filter((a) => a.isPhonoSemantic);
  const conventional = phono.filter((a) => !a.basis.includes("相反"));
  return {
    total,
    phonoSemantic: phono.length,
    ratio: total > 0 ? phono.length / total : 0,
    conventionalRatio: phono.length > 0 ? conventional.length / phono.length : 0,
  };
}

export type { StructureCode };
