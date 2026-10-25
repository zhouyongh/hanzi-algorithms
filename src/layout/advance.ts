/**
 * D3 行款推进。
 *
 * 教学场景里常要「一个字一个字地写出来」：按行款推进，每一步给出下一个
 * 字应该落在哪里。竖排古籍的推进次序是：**列从右往左，列内自上而下**。
 *
 * 这个模块把「推进」抽象成一个纯函数：给定起点与参数，产出推进序列。
 */

/** 推进参数。 */
export interface AdvanceOptions {
  /** 字格边长。 */
  charSize: number;
  /** 字距。 */
  charGap?: number;
  /** 行距（列间距）。 */
  lineGap?: number;
  /** 每列字数。 */
  rowsPerColumn: number;
  /** 起始位置（第一列的列首）。 */
  originX?: number;
  originY?: number;
  /** 竖排时列从右往左。 */
  rightToLeft?: boolean;
}

/** 一步推进的结果。 */
export interface AdvanceStep {
  /** 第几步（从 0 起）。 */
  step: number;
  /** 列号（0 = 第一列）。 */
  column: number;
  /** 行号（0 = 列首）。 */
  row: number;
  /** 字格左上角 x。 */
  x: number;
  /** 字格左上角 y。 */
  y: number;
  /** 是否是某一列的列首（换列）。 */
  columnStart: boolean;
  /** 是否是全文最后一步。 */
  last: boolean;
}

/**
 * 生成推进序列。
 *
 * 步数先归一化：`Infinity` / `NaN` / 负数一律当 0 步（`Infinity` 若直接进循环
 * 会永远跑不完，把内存吃光）；小数向上取整（1.5 字 → 2 步），最后一步带 `last`。
 *
 * @param count 要推进多少步（= 字数）
 */
export function advance(
  count: number,
  options: AdvanceOptions,
): AdvanceStep[] {
  if (!Number.isFinite(count) || count < 1) return [];
  const total = Math.ceil(count);
  const charSize = options.charSize;
  const charGap = options.charGap ?? 0;
  const lineGap = options.lineGap ?? charSize * 0.5;
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const rightToLeft = options.rightToLeft ?? true;
  // 每列字数兜底成 1（与竖排模块一致）；NaN 同样当 1，避免坐标全成 NaN
  const rows = Number.isNaN(options.rowsPerColumn) ? 1 : Math.max(1, options.rowsPerColumn);

  const steps: AdvanceStep[] = [];
  for (let i = 0; i < total; i += 1) {
    const column = Math.floor(i / rows);
    const row = i % rows;
    const dx = rightToLeft ? -column * (charSize + lineGap) : column * (charSize + lineGap);
    steps.push({
      step: i,
      column,
      row,
      x: originX + dx,
      y: originY + row * (charSize + charGap),
      columnStart: row === 0,
      last: i === total - 1,
    });
  }
  return steps;
}

/** 从推进序列里取出某一步（越界、下标非整数都返回 null）。 */
export function stepAt(steps: AdvanceStep[], index: number): AdvanceStep | null {
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) return null;
  return steps[index] ?? null;
}

/**
 * 推进进度（0–1）：已推进的步数占全文的比例。
 *
 * @param steps 已推进的步
 * @param totalSteps 全文的总步数（字数）；**不传就无从表达进度**，
 *   此时只能回答「给定的步都写完了」（非空序列返回 1，空序列返回 0）。
 */
export function advanceProgress(steps: AdvanceStep[], totalSteps?: number): number {
  if (steps.length === 0) return 0;
  if (totalSteps === undefined || !Number.isFinite(totalSteps) || totalSteps <= 0) return 1;
  return Math.min(1, Math.max(0, steps.length / totalSteps));
}
