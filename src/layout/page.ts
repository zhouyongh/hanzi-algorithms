/**
 * D2 古籍版式（半叶版面）参数化生成。
 *
 * 中式古籍的版面不是「把字排成方阵」，而是一套有严格规矩的版式：
 *
 * ```
 *  ┌──────────────────────────────┐
 *  ││ ││ ││ ││ ││ ││ ││ ││ ││ ││ │   ← 界行（双线）
 *  ││ ││ ││ ││ ││ ││ ││ ││ ││ ││ ││
 *  │└┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐┌┐│   ← 鱼尾（版心）
 *  │ ││ ││ ││ ││ ││ ││ ││ ││ ││ ││ │
 *  │└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘└┘│
 *  └──────────────────────────────┘
 * ```
 *
 * 关键元素：版框、界行（行与行之间的双线）、版心（书口一侧的窄栏）、
 * 鱼尾（上/下，指向行间）、天地头脚。
 *
 * 这里的实现是**参数化版面生成**——给定参数生成版式骨架，不含任何具体文本
 * 的排印数据。真正的古籍影印版面（版式因版而异、缺字、避讳）需要另外的
 * 版面数据集，不在本库范围。
 */

import type { Rect } from "../geometry/path.ts";

/** 版式参数。 */
export interface ClassicPageOptions {
  /** 半叶宽度。 */
  leafWidth: number;
  /** 半叶高度。 */
  leafHeight: number;
  /** 每半叶的行数。 */
  columns: number;
  /** 每行字数。 */
  rowsPerColumn: number;
  /** 界行宽度（一条界行占的横向空间，含中间的空隙）。 */
  columnGap?: number;
  /** 上边距（天地头）。 */
  marginTop?: number;
  /** 下边距（地脚）。 */
  marginBottom?: number;
  /** 左侧边距（书口一侧）。 */
  marginLeft?: number;
  /** 右侧边距（切口一侧）。 */
  marginRight?: number;
  /** 鱼尾形式。 */
  fishtail?: "none" | "single" | "double";
  /** 版心宽度（书口侧的窄栏宽度）。 */
  banxinWidth?: number;
  /** 版心在页面上的纵向位置（中心点比例）。 */
  banxinCenter?: number;
  /** 版心高度比例。 */
  banxinHeightRatio?: number;
  /** 版心内的题名文字。 */
  title?: string;
}

/** 版面元素。 */
export interface ClassicPage {
  /** 半叶尺寸。 */
  leaf: Rect;
  /** 版框。 */
  frame: Rect;
  /** 版心（书口侧窄栏）。 */
  banxin: Rect;
  /** 界行：行与行之间的竖双线。 */
  columnRules: Array<{ x: number; y0: number; y1: number; gap: number }>;
  /** 鱼尾。 */
  fishtails: Array<{ x: number; y: number; width: number; height: number; direction: "down" | "up" }>;
  /** 行（列）位置，从右往左编号。 */
  columns: Array<{ index: number; x: number; width: number; y: number; height: number }>;
  /** 每行可放的字数。 */
  rowsPerColumn: number;
  /** 版心内的题名（没给就没有这一项）。 */
  title?: string;
}

/** 把 v 夹到 [lo, hi] 区间内（区间空时取 lo）。 */
function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}

/** 生成半叶版式。 */
export function layoutClassicPage(options: ClassicPageOptions): ClassicPage {
  const leafWidth = options.leafWidth;
  const leafHeight = options.leafHeight;
  // 行数取整：2.7 行没法排（半行既不是行也不是格），多出来的半行还
  // 把最左一行挤出版框；下限 1。
  const columns = Number.isFinite(options.columns) ? Math.max(1, Math.floor(options.columns)) : 1;
  const columnGap = options.columnGap ?? leafWidth * 0.012;
  const marginTop = options.marginTop ?? leafHeight * 0.08;
  const marginBottom = options.marginBottom ?? leafHeight * 0.1;
  const marginLeft = options.marginLeft ?? leafWidth * 0.05;
  const marginRight = options.marginRight ?? leafWidth * 0.05;
  const fishtail = options.fishtail ?? "double";
  const banxinWidth = options.banxinWidth ?? leafWidth * 0.03;
  const banxinCenter = options.banxinCenter ?? 0.5;
  const banxinHeightRatio = options.banxinHeightRatio ?? 0.3;

  const leaf: Rect = { x: 0, y: 0, width: leafWidth, height: leafHeight };
  const frame: Rect = {
    x: marginLeft,
    y: marginTop,
    width: leafWidth - marginLeft - marginRight,
    height: leafHeight - marginTop - marginBottom,
  };

  // 行（列）宽：版框内扣掉界行占位
  const innerWidth = frame.width - (columns - 1) * columnGap;
  const colWidth = innerWidth / columns;

  // 列从右往左
  const colList: ClassicPage["columns"] = [];
  for (let i = 0; i < columns; i += 1) {
    const right = frame.x + frame.width - i * (colWidth + columnGap);
    colList.push({
      index: i,
      x: right - colWidth,
      width: colWidth,
      y: frame.y,
      height: frame.height,
    });
  }

  // 界行：在相邻两列之间
  const columnRules: ClassicPage["columnRules"] = [];
  for (let i = 0; i < columns - 1; i += 1) {
    const right = frame.x + frame.width - (i + 1) * (colWidth + columnGap);
    columnRules.push({
      x: right,
      y0: frame.y,
      y1: frame.y + frame.height,
      gap: columnGap * 0.35,
    });
  }

  // 版心：书口一侧（左）的窄栏。
  // 版心必须落在半叶之内：参数给得越界（版心中心比例 0 → 版心跑到半叶外，
  // 左边距 0 + 版心宽 200 → 版心跑到半叶外）时夹回半叶，不能让它跑到纸上。
  const banxinHeight = leafHeight * banxinHeightRatio;
  const banxinTop = leafHeight * banxinCenter - banxinHeight / 2;
  const banxin: Rect = {
    x: clamp(frame.x - banxinWidth * 0.6, 0, leafWidth - banxinWidth),
    y: clamp(banxinTop, 0, leafHeight - banxinHeight),
    width: banxinWidth,
    height: banxinHeight,
  };

  // 鱼尾：上鱼尾（指向下）置于版心上端，下鱼尾（指向上）置于版心下端
  const fishtails: ClassicPage["fishtails"] = [];
  if (fishtail === "single" || fishtail === "double") {
    fishtails.push({
      x: banxin.x,
      y: banxin.y,
      width: banxin.width,
      height: banxin.height * 0.22,
      direction: "down",
    });
  }
  if (fishtail === "double") {
    fishtails.push({
      x: banxin.x,
      y: banxin.y + banxin.height * 0.78,
      width: banxin.width,
      height: banxin.height * 0.22,
      direction: "up",
    });
  }

  return {
    leaf,
    frame,
    banxin,
    columnRules,
    fishtails,
    columns: colList,
    rowsPerColumn: options.rowsPerColumn,
    // 题名要落到返回值里，否则调用方给的题名无处安放
    title: options.title,
  };
}

/**
 * 把文本按版式逐行逐字落位。
 *
 * 列从右往左，列内自上而下；每列满 `rowsPerColumn` 字后换列。
 *
 * **字宽受两个约束**：默认字宽按「版框高 ÷ 每行字数」给（再给字距留位），
 * 但字不能比行还宽——字宽再被行宽卡一道，否则版式高瘦时字会压到界行上。
 * 调用方显式给的 `charSize` 同样受行宽约束。
 */
export function placeText(
  page: ClassicPage,
  text: string,
  options: { charSize?: number; charGap?: number } = {},
): Array<{ char: string; index: number; x: number; y: number; column: number; row: number }> {
  const chars = Array.from(text);
  const charGap = options.charGap ?? 0;
  const rows = page.rowsPerColumn;
  // 行宽：所有行一样宽，取第一行的
  const colWidth = page.columns.length > 0 ? page.columns[0].width : 0;
  // 默认字宽：版框高扣掉字距占掉的部分（行数 - 1 个字距），再乘排版留白系数
  const defaultSize =
    rows > 0 ? ((page.frame.height - (rows - 1) * charGap) / rows) * 0.86 : 16;
  const charSize = Math.min(options.charSize ?? defaultSize, colWidth);
  const out: Array<{ char: string; index: number; x: number; y: number; column: number; row: number }> = [];

  for (let i = 0; i < chars.length; i += 1) {
    const column = Math.floor(i / page.rowsPerColumn);
    const row = i % page.rowsPerColumn;
    const col = page.columns[column];
    if (!col) break;
    out.push({
      char: chars[i],
      index: i,
      x: col.x + (col.width - charSize) / 2,
      y: col.y + row * (charSize + charGap),
      column,
      row,
    });
  }
  return out;
}
