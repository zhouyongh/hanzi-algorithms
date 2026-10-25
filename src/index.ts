/**
 * hanzi-algorithms —— 汉字结构计算库。
 *
 * 这个库解决的是这样一类问题：**给你一个汉字的字形，算出它的结构**。
 *
 * - 点一下小篆，知道哪几笔属于这个部首（A1 部首定位）
 * - 知道一个字怎么拆、怎么写（A2 构形分解、A3 笔画切分）
 * - 让一个甲骨文的字连续变成小篆、隶书（C1 形变插值、C2 隶变变换）
 * - 把一段文字排成古籍竖排的版式（D1 竖排、D2 古籍版式、D3 行款推进）
 * - 给学生判描红、按部首查字、看形声构形（E1 描红底本、E2 描红评分、
 *   E3 字表检索、E4 形声分析、E5 笔画统计）
 *
 * 库本身**不含字形**：字形来自兄弟仓库 `hanzi-glyphs-svg`，本库只提供算法。
 * 所有算法都是纯函数：输入字形 SVG，输出结构化的结果。
 */

export * from "./geometry/index.ts";
export * from "./raster/index.ts";
export * from "./structure/index.ts";
export * from "./morph/index.ts";
export * from "./layout/index.ts";
export * from "./teaching/index.ts";
export * from "./glyph.ts";
export * from "./data/types.ts";

export const VERSION = "0.1.0";
