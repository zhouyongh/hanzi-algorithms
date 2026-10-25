/**
 * 结构判定的高层入口：把「找部首」和「判构形」串起来，
 * 并按实测结果选择用哪条路径。
 *
 * ## 为什么要这一层
 *
 * A1 有两条路径，各有各的毛病（实测数据见 docs/设计取舍与踩坑.md §2.7）：
 *
 * | 方法 | 做法 | 准确率 | 判不出 | 判错 |
 * |---|---|---|---|---|
 * | 模板法 | 拿部首的**独立形态**做模板匹配 | 23.3% | 10.0% | 66.7% |
 * | 投票法 | 拿归纳出的**偏旁形**按笔画形状投票 | 32.2% | 41.1% | 26.7% |
 * | **组合** | 投票优先，判不出回退模板 | **41.1%** | **4.4%** | 54.4% |
 *
 * （分母：90 个「说文部首 ≠ 整字」的可分解标注字。）
 *
 * 两条路径是**互补**的，不是替代关系：
 * - 投票法准，但只在**归纳出了偏旁形**的部上可用（实测覆盖 148/540 部），
 *   没有偏旁形的部它连判都判不出；
 * - 模板法哪都能用，但说文部首的独立形态跟它在合体字里的偏旁形态常常不同
 *   （「水」独立是中间一竖两边四点，作偏旁是三条波浪线），于是常落在错处。
 *
 * 所以：**投票优先，投票说不知道时回退模板**。组合的准确率比任何单用都高，
 * 而且判不出率最低（4.4%）——这正是库里「说不准时返回 null」这条原则想要的。
 */

import type { Glyph } from "../glyph.ts";
import { locateRadical, type RadicalMatch, type RadicalOptions } from "./radical.ts";
import { decompose, type Decomposition } from "./decomposition.ts";

/** 结构判定结果。 */
export interface ResolvedStructure {
  /** 部首定位结果。 */
  match: RadicalMatch;
  /** 构形分解结果。 */
  decomposition: Decomposition;
  /** 实际用上的路径。 */
  method: "vote" | "template";
}

/** 结构判定参数。 */
export interface ResolveOptions extends RadicalOptions {
  /**
   * 部首的**偏旁形**（笔画形状描述子集合）。
   *
   * 给了就走投票法；没给只能走模板法。
   * 这份数据由 `tools/build_radical_forms.ts` 从语料归纳而来（不随库发布）。
   */
  radicalTypes?: string[];
  /** 判为部首笔画的形状距离上限（投票法）。 */
  typeTolerance?: number;
}

/**
 * 判定一个字的部首与构形。
 *
 * @param glyph 复合字形
 * @param radicalGlyph 部首的独立字形（投票法也用得上它来区分 ⿴/⿵）
 * @param options 参数；给了 `radicalTypes` 就先试投票法
 * @returns 判不出来时返回 `null`
 */
export function resolveStructure(
  glyph: Glyph,
  radicalGlyph: Glyph | null,
  options: ResolveOptions = {},
): ResolvedStructure | null {
  const vote = (): ResolvedStructure | null => {
    if (!options.radicalTypes || options.radicalTypes.length === 0) return null;
    const m = locateRadical(glyph, null, {
      ...options,
      radicalTypes: options.radicalTypes,
    });
    if (!m) return null;
    const d = decompose(glyph, m, radicalGlyph ?? undefined);
    if (!d) return null;
    return { match: m, decomposition: d, method: "vote" };
  };

  const template = (): ResolvedStructure | null => {
    if (!radicalGlyph) return null;
    // **必须把 radicalTypes 摘掉**：locateRadical 只要看到 radicalTypes 就走投票分支，
    // 带着它调「模板法」其实还是投票法，回退就白做了。
    const { radicalTypes: _drop, ...templateOpts } = options;
    void _drop;
    const m = locateRadical(glyph, radicalGlyph, templateOpts);
    if (!m) return null;
    const d = decompose(glyph, m, radicalGlyph);
    if (!d) return null;
    return { match: m, decomposition: d, method: "template" };
  };

  return vote() ?? template();
}
