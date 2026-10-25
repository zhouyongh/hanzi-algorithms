/**
 * D1 竖排版式与标点悬挂位。
 *
 * CSS 的 `writing-mode: vertical-rl` 能做「字竖着排、列从右往左」，但汉字竖排
 * 特有的细节它不管：
 *
 * - **句读号的位置**：竖排时「。，、；」要移到字格的右上角（点在右上），
 *   而不是横排时的左下角。这是字形排印里最容易被忽略的一条规则。
 * - **成对符号的转向**：括号、引号、破折号在竖排时要旋转 90° 或镜像。
 * - **行列推进的次序**：列从右向左，列内自上而下。
 * - **行首行末禁则**（可选，见 `kinsoku`）：句读点不能排在列首，
 *   开引号不能收在列末。
 *
 * 本模块把这些做成可计算的规则，供任何渲染端（SVG / Canvas / DOM）调用。
 */

/** 竖排版式参数。 */
export interface VerticalLayoutOptions {
  /** 字格边长（像素）。 */
  charSize: number;
  /** 字格之间的额外间距。 */
  charGap?: number;
  /** 列与列之间的间距。 */
  lineGap?: number;
  /** 每列最多多少字；不限则由文本长度决定。 */
  rowsPerColumn?: number;
  /** 版面左上角。 */
  originX?: number;
  originY?: number;
  /**
   * 是否启用行首/行末禁则（避头尾）。
   *
   * 默认**关闭**：关掉时排版结果是「每列固定 N 字」的机械分列，
   * 开了禁则会多出「挤进/推出」的位移——既有调用方（以及本仓库的演示页）
   * 依赖的落位会变，所以默认不动它。
   */
  kinsoku?: boolean;
}

/** 一个字在竖排版面中的位置。 */
export interface VerticalCell {
  /** 字符。 */
  char: string;
  /** 字符在原字符串中的下标。 */
  index: number;
  /** 字格左上角 x。 */
  x: number;
  /** 字格左上角 y。 */
  y: number;
  /** 列号（0 = 最右列）。 */
  column: number;
  /** 行号（0 = 列首）。 */
  row: number;
  /** 该字符是否为需要换位的标点。 */
  punctuation?: boolean;
  /**
   * 该字符在字格里的实际位移（已按行距做过越界保护）。
   *
   * 渲染端直接用它，就不必再自己调 `punctuationShift`——后者拿不到行距，
   * 算不出「点号会不会压到右邻列」。
   */
  shift?: PunctuationShift;
}

/** 需要在竖排时移位的句读点号。 */
const RIGHT_TOP_DOTS = new Set(["。", "，", "、", "；", "：", "·", "．"]);

/** 需要在竖排时旋转 90° 的成对符号。 */
const ROTATED_PAIRS = new Set([
  "（", "）", "〔", "〕", "［", "］", "【", "】", "《", "》", "〈", "〉",
  "「", "」", "『", "』", "—", "―", "～", "…",
  "(", ")",
]);

/**
 * 成对符号里的「开符号」：竖排时顺时针转 90°，闭符号逆时针。
 *
 * 半角括号也算开符号——竖排里半角括号同样要转，不然会横着躺在版心里。
 */
const OPENING_SYMBOLS = new Set(["（", "〔", "［", "【", "《", "〈", "「", "『", "("]);

/**
 * 行首禁则：收尾的符号不能排在列首（竖排的「行首」就是列首）。
 *
 * 省略号、破折号也算收尾符号——它们断在半行上会读不通。
 */
const LINE_START_FORBIDDEN = new Set([
  "。", "，", "、", "；", "：", "·", "．", "？", "！",
  "）", "〕", "］", "】", "》", "〉", "」", "』",
  "…", "—", "―", "～",
]);

/** 行末禁则：开符号不能收在列末（竖排的「行末」就是列末）。 */
const LINE_END_FORBIDDEN = new Set(["（", "〔", "［", "【", "《", "〈", "「", "『", "("]);

/** 标点在字格内的偏移。 */
export interface PunctuationShift {
  dx: number;
  dy: number;
  /** 是否需要旋转 90°。 */
  rotate: boolean;
  /** 旋转方向：1 = 顺时针 90°，-1 = 逆时针 90°。 */
  direction: 1 | -1;
}

/**
 * 标点在竖排字格里的位置调整。
 *
 * **前置条件**：句读点默认右移半个字宽（落到字格右上角），
 * 要不压到右邻列的字格上，调用方须保证 `lineGap ≥ charSize / 2`。
 * 给了 `lineGap` 就能替你把位移收紧（`dx ≤ lineGap`），不给就只能按默认走。
 *
 * @param charSize 字格边长
 * @param lineGap 列间距；给了就按它收紧右移量，避免静默越界
 * @returns 不需要调整时返回 null
 */
export function punctuationShift(
  char: string,
  charSize: number,
  lineGap?: number,
): PunctuationShift | null {
  if (RIGHT_TOP_DOTS.has(char)) {
    const half = charSize * 0.5;
    // 句读点移到字格右上角。点自身的盒子按整个字格算（右边界 = 字格右边界 + dx），
    // 右邻列的字格左边界在 charSize + lineGap 处，所以不越界的条件是 dx ≤ lineGap。
    const dx = lineGap === undefined ? half : Math.min(half, Math.max(0, lineGap));
    return { dx, dy: -half, rotate: false, direction: 1 };
  }
  if (ROTATED_PAIRS.has(char)) {
    const opening = OPENING_SYMBOLS.has(char);
    return { dx: 0, dy: 0, rotate: true, direction: opening ? 1 : -1 };
  }
  return null;
}

/** 判断字符是否需要竖排特殊处理。 */
export function needsVerticalAdjustment(char: string): boolean {
  return RIGHT_TOP_DOTS.has(char) || ROTATED_PAIRS.has(char);
}

/**
 * 每列字数：0 与负数兜底成 1（与 `advance.ts` 的 `Math.max(1, …)` 保持一致），
 * NaN 兜底成「不限」，小数保留（2.5 行一列 → 行号出现半格，是既有行为）。
 */
function resolveRowsPerColumn(requested: number | undefined, fallback: number): number {
  if (requested === undefined || Number.isNaN(requested)) return Math.max(1, fallback);
  return Math.max(1, requested);
}

/** 一个字在版面里的落位（列号 + 行号）。 */
interface Slot {
  index: number;
  column: number;
  row: number;
}

/**
 * 给每个字分配列号与行号。
 *
 * 不开禁则时就是机械分列：每列 `rowsPerColumn` 字，装满换下一列。
 * 行号用「累计行数 − 已换列数 × 每列字数」算，与 `i % rowsPerColumn` 等价，
 * 但小数每列（2.5 行一列）时行号会落在半格上——那是既有行为，不改。
 *
 * 开了禁则（避头尾）用「追い出し」处理，两条规则各挪一个字：
 *
 * - **行首禁则**：要排在列首的是收尾符号 → 把上一列的末字挪到本列列首，
 *   收尾符号跟在它后面（本列因此挤进一个字，上一列末尾空一格）。
 * - **行末禁则**：开符号不能收在列末 → 整列提前一行结束，开符号挪到下一列列首。
 *
 * 两种挪法都保持**阅读次序**：列从右往左、列内自上而下，字的先后不变。
 *
 * 禁则只在每列整数个字时启用——半格行上「列首/列末」没有确定的位置，
 * 硬套只会排出更乱的版面。
 */
function assignSlots(chars: string[], rowsPerColumn: number, kinsoku: boolean): Slot[] {
  const slots: Slot[] = [];
  const useKinsoku = kinsoku && Number.isInteger(rowsPerColumn);
  let column = 0;
  let row = 0;

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (useKinsoku) {
      if (row === 0 && column > 0 && LINE_START_FORBIDDEN.has(char)) {
        // 每列只放一个字时挤不下（行首让位后本列要放两个），规则只能放弃
        const prev = slots[slots.length - 1];
        if (prev && rowsPerColumn >= 2) {
          prev.column = column;
          prev.row = 0;
          row = 1;
        }
      }
      if (row + 1 >= rowsPerColumn && LINE_END_FORBIDDEN.has(char)) {
        column += 1;
        row = 0;
      }
    }
    slots.push({ index: i, column, row });
    row += 1;
    if (row >= rowsPerColumn) {
      column += 1;
      row -= rowsPerColumn;
    }
  }
  return slots;
}

/**
 * 竖排排版。
 *
 * 约定：**列从右往左**（第 0 列在最右），列内自上而下。
 * 返回的字格坐标是「字格左上角」，渲染时按需居中。
 *
 * **前置条件**：行距 `lineGap` 须 ≥ 半字宽，否则句读点右移后会压到右邻列的字格上。
 * 句读点的位移已经按行距收紧（见字格的 `shift` 字段），但收紧只保证「不越界」，
 * 「点落在右上角」这个排印效果仍然要行距够大才成立。
 *
 * 开了 `kinsoku` 之后落位不再与 `advance.ts` 的推进序列逐字对齐
 * （推进模块只认字数、不做禁则），两者不要混用。
 */
export function layoutVertical(
  text: string,
  options: VerticalLayoutOptions,
): VerticalCell[] {
  const charSize = options.charSize;
  const charGap = options.charGap ?? 0;
  const lineGap = options.lineGap ?? charSize * 0.5;
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const pitch = charSize + charGap;
  const chars = Array.from(text);
  const rowsPerColumn = resolveRowsPerColumn(options.rowsPerColumn, chars.length);
  const kinsoku = options.kinsoku ?? false;

  const cells: VerticalCell[] = [];
  for (const slot of assignSlots(chars, rowsPerColumn, kinsoku)) {
    const char = chars[slot.index];
    const shift = punctuationShift(char, charSize, lineGap);
    cells.push({
      char,
      index: slot.index,
      // 列从右往左：第 0 列在最右侧
      x: originX - slot.column * (charSize + lineGap),
      y: originY + slot.row * pitch,
      column: slot.column,
      row: slot.row,
      punctuation: shift ? true : undefined,
      shift: shift ?? undefined,
    });
  }
  return cells;
}

/** 竖排版面的外接尺寸。 */
export function verticalExtent(
  cells: VerticalCell[],
  options: VerticalLayoutOptions,
): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 };
  const charSize = options.charSize;
  const charGap = options.charGap ?? 0;
  const lineGap = options.lineGap ?? charSize * 0.5;
  // 列数按**最大列号**算：字格不一定按列序排好（调用方可以自己重排），
  // 只认最后一个字格的列号会把宽度算小。
  const columns = Math.max(...cells.map((c) => c.column)) + 1;
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  return {
    width: columns * charSize + (columns - 1) * lineGap,
    height: rows * (charSize + charGap) - charGap,
  };
}
