/**
 * hanzi-writer 的**裁剪入口**。
 *
 * hanzi-writer 是汉字笔顺动画的现成底子：真笔顺数据 + 逐笔书写动画 + 描红练习。
 * 它只依赖 `hanzi-writer-data` 的数据格式，不需要别的运行时依赖。
 *
 * 选用理由见 `docs/架构.md` 的「动画底子」一节。
 */

import HanziWriter from "hanzi-writer";

export { HanziWriter };
export type { CharacterJson, StrokeData, CharDataLoaderFn } from "hanzi-writer";
