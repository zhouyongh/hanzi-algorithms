/**
 * D 组排版算法的测试：D1 竖排与标点悬挂位、D2 古籍版式、D3 行款推进。
 *
 * 这三个模块都是纯几何计算，没有「标准答案」，只有「算得准不准」。
 * 所以测试盯三类东西：
 *
 * - **不变量**：字框互不重叠、版面尺寸与逐行累加一致、同一输入两次算一样；
 * - **退化输入**：空串、零尺寸、负数、NaN、Infinity——不许抛异常，
 *   要么给出结果，要么明确返回空数组；
 * - **已修缺陷**：曾经用 `it.fails` 标出的 13 个缺陷（S1–S13）都已修好，
 *   相应用例改成了普通 `it`，注释里写明「这条原来是缺陷 Sx，修了什么」，
 *   断言卡的是修好之后的行为（不许改松）。
 *
 * 除缺陷项外，退化输入一律按「当前实际行为」断言——把异常情况钉死，
 * 免得以后有人无意间改了行为却没人发现。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  layoutVertical,
  verticalExtent,
  punctuationShift,
  needsVerticalAdjustment,
} from "../src/layout/vertical.ts";
import type { VerticalCell, VerticalLayoutOptions } from "../src/layout/vertical.ts";
import { layoutClassicPage, placeText } from "../src/layout/page.ts";
import type { ClassicPageOptions } from "../src/layout/page.ts";
import { advance, stepAt, advanceProgress } from "../src/layout/advance.ts";
import type { AdvanceStep } from "../src/layout/advance.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "seal.json"));

/** 竖排基准参数：字宽 20、字距 4、行距 10、每列 2 字。 */
const BASE: VerticalLayoutOptions = {
  charSize: 20,
  charGap: 4,
  lineGap: 10,
  rowsPerColumn: 2,
  originX: 100,
  originY: 50,
};

/** 古籍版式基准参数：半叶 1000×1500、10 行、每行 20 字。 */
const PAGE_BASE: ClassicPageOptions = {
  leafWidth: 1000,
  leafHeight: 1500,
  columns: 10,
  rowsPerColumn: 20,
};

/** 矩形（字格）。 */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 两个矩形是否**正面积**重叠（相接不算重叠）。 */
function overlaps(a: Box, b: Box): boolean {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 1e-9 && h > 1e-9;
}

/** 把竖排字格转成矩形。 */
function cellBox(cell: VerticalCell, size: number): Box {
  return { x: cell.x, y: cell.y, width: size, height: size };
}

/** 断言一组矩形两两不重叠。 */
function expectNoOverlap(boxes: Box[]): void {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(overlaps(boxes[i], boxes[j]), `第 ${i} 与第 ${j} 个字格重叠`).toBe(false);
    }
  }
}

describe("D1 竖排与标点悬挂位", () => {
  describe("layoutVertical", () => {
    it("列从右往左、列内自上而下", () => {
      const cells = layoutVertical("一二三四五", BASE);
      expect(cells.map((c) => c.char)).toEqual(["一", "二", "三", "四", "五"]);
      expect(cells.map((c) => c.column)).toEqual([0, 0, 1, 1, 2]);
      expect(cells.map((c) => c.row)).toEqual([0, 1, 0, 1, 0]);
      // 第 0 列在最右：列号越大 x 越小，步距是「字宽 + 行距」
      expect(cells[0].x).toBe(100);
      expect(cells[2].x).toBe(100 - (20 + 10));
      expect(cells[4].x).toBe(100 - 2 * (20 + 10));
      // 列内步距是「字宽 + 字距」
      expect(cells[1].y).toBe(50 + (20 + 4));
    });

    it("index 与原字符串下标一致（按码点计，不按 UTF-16 码元）", () => {
      // 代理对字符（𠮷）在 JS 里占两个码元，但排版上只算一个字
      const cells = layoutVertical("𠮷天", BASE);
      expect(cells.length).toBe(2);
      expect(cells.map((c) => c.index)).toEqual([0, 1]);
      expect(cells[1].char).toBe("天");
    });

    it("空串返回空数组", () => {
      expect(layoutVertical("", BASE)).toEqual([]);
    });

    it("单字落在起点上", () => {
      const cells = layoutVertical("一", BASE);
      expect(cells.length).toBe(1);
      expect(cells[0].x).toBe(100);
      expect(cells[0].y).toBe(50);
      expect(cells[0].column).toBe(0);
      expect(cells[0].row).toBe(0);
    });

    it("奇数个字：最后一列不满", () => {
      const cells = layoutVertical("一二三", BASE);
      const last = cells[cells.length - 1];
      expect(last.column).toBe(1);
      expect(last.row).toBe(0);
    });

    it("刚好放满：不多不少正好整列", () => {
      const cells = layoutVertical("一二三四", BASE);
      expect(cells.length).toBe(4);
      expect(Math.max(...cells.map((c) => c.column))).toBe(1);
      expect(cells.every((c) => c.row < BASE.rowsPerColumn!)).toBe(true);
    });

    it("不给 rowsPerColumn 时全部排在同一列", () => {
      const cells = layoutVertical("一二三四五", { charSize: 20 });
      expect(new Set(cells.map((c) => c.column)).size).toBe(1);
      expect(cells.map((c) => c.row)).toEqual([0, 1, 2, 3, 4]);
    });

    it("起点偏移只平移整版，不改变间距", () => {
      const a = layoutVertical("一二三", { ...BASE, originX: 0, originY: 0 });
      const b = layoutVertical("一二三", { ...BASE, originX: 500, originY: 200 });
      expect(b[0].x - a[0].x).toBe(500);
      expect(b[0].y - a[0].y).toBe(200);
      expect(b[2].x - b[0].x).toBe(a[2].x - a[0].x);
      expect(b[1].y - b[0].y).toBe(a[1].y - a[0].y);
    });

    it("只给需要竖排处理的字符打标点标记", () => {
      const cells = layoutVertical("字。", BASE);
      expect(cells[0].punctuation).toBeUndefined();
      expect(cells[1].punctuation).toBe(true);
    });

    it("字框互不重叠", () => {
      const cells = layoutVertical("天地玄黄宇宙洪荒日月盈昃", BASE);
      expectNoOverlap(cells.map((c) => cellBox(c, BASE.charSize)));
    });

    it("字距行距都为 0 时字格相接但不重叠", () => {
      const cells = layoutVertical("一二三四", { charSize: 20, charGap: 0, lineGap: 0, rowsPerColumn: 2 });
      const boxes = cells.map((c) => cellBox(c, 20));
      expectNoOverlap(boxes);
      // 相接：右邻字格的左边界正好等于本字格的右边界
      expect(cells[2].x + 20).toBe(cells[0].x);
    });

    it("同一输入跑两次结果完全一样（确定性）", () => {
      const a = layoutVertical("楷书排版，纵列由右而左", BASE);
      const b = layoutVertical("楷书排版，纵列由右而左", BASE);
      expect(a).toEqual(b);
    });

    it("退化尺寸不抛异常", () => {
      expect(() => layoutVertical("一二", { charSize: 0 })).not.toThrow();
      expect(() => layoutVertical("一二", { charSize: -10 })).not.toThrow();
      expect(() => layoutVertical("一二", { charSize: NaN })).not.toThrow();
      expect(() => layoutVertical("一二", { charSize: 1e9 })).not.toThrow();
      // 零字宽：所有字格都塌到起点上，但结构仍然完整
      const zero = layoutVertical("一二", { charSize: 0 });
      expect(zero.length).toBe(2);
      expect(zero[1].x).toBe(0);
      // 负字宽：坐标会跑到起点左边，调用方自己的问题，不许炸
      const neg = layoutVertical("一二", { charSize: -10 });
      expect(neg.length).toBe(2);
      expect(neg[1].y).toBe(-10);
      // NaN 字宽：坐标全变 NaN，但同样不炸
      const nan = layoutVertical("一二", { charSize: NaN });
      expect(nan.length).toBe(2);
      expect(Number.isNaN(nan[0].x)).toBe(true);
    });

    it("非整数 rowsPerColumn 会排出半格行（当前实现如此）", () => {
      // 2.5 行一列 → 行号出现 0.5、1.5，坐标也就落在半格上
      const cells = layoutVertical("一二三四", { charSize: 20, rowsPerColumn: 2.5 });
      expect(cells.map((c) => c.row)).toEqual([0, 1, 2, 0.5]);
      expect(cells[3].y).toBe(10);
    });

    it("rowsPerColumn=0 不该排出 NaN 坐标（缺陷 S3）", () => {
      // 缺陷 S3：修复前列号变 Infinity、行号变 NaN，坐标全是 NaN。
      // 现在兜底成「每列一字」，与 advance.ts 的 Math.max(1, …) 一致。
      const cells = layoutVertical("一二三", { charSize: 20, rowsPerColumn: 0 });
      expect(cells.length).toBe(3);
      expect(cells.map((c) => c.column)).toEqual([0, 1, 2]);
      expect(cells.map((c) => c.row)).toEqual([0, 0, 0]);
      expect(Number.isFinite(cells[0].x)).toBe(true);
      expect(Number.isFinite(cells[0].y)).toBe(true);
      expect(Number.isFinite(cells[0].column)).toBe(true);
      expect(Number.isFinite(cells[0].row)).toBe(true);
    });

    it("rowsPerColumn 为负数或 NaN 时坐标仍要是有限的（缺陷 S3）", () => {
      // 负数：同样兜底成每列一字（不是「列号往回走」）
      const neg = layoutVertical("一二三", { charSize: 20, rowsPerColumn: -2 });
      expect(neg.map((c) => c.column)).toEqual([0, 1, 2]);
      expect(neg.map((c) => c.row)).toEqual([0, 0, 0]);
      expect(Number.isFinite(neg[0].x)).toBe(true);
      // NaN：兜底成「不限」——全部排在同一列，行号连着数
      const nan = layoutVertical("一二三", { charSize: 20, rowsPerColumn: NaN });
      expect(nan.map((c) => c.column)).toEqual([0, 0, 0]);
      expect(nan.map((c) => c.row)).toEqual([0, 1, 2]);
      expect(Number.isFinite(nan[0].y)).toBe(true);
    });

    it("标点落在列首时不会被挪走（禁则默认关闭）", () => {
      // 禁则（避头尾）默认关闭：既有调用方拿到的落位不变，
      // 要禁则得显式开 kinsoku（见下面几条）。
      const cells = layoutVertical("字。", { charSize: 20, rowsPerColumn: 1 });
      expect(cells[1].column).toBe(1);
      expect(cells[1].row).toBe(0);
      expect(cells[1].punctuation).toBe(true);
    });

    it("开了禁则：句读点不排在列首（缺陷 S12，行首禁则）", () => {
      // 缺陷 S12：库里没有行首禁则，句读点排在列首。
      // 开了 kinsoku 后用「追い出し」处理：上一列的末字挪到本列列首，
      // 收尾符号跟在它后面（上一列末尾空一格）。
      const cells = layoutVertical("天地。", { charSize: 20, rowsPerColumn: 2, kinsoku: true });
      expect(cells.map((c) => [c.char, c.column, c.row])).toEqual([
        ["天", 0, 0],
        ["地", 1, 0],
        ["。", 1, 1],
      ]);
    });

    it("开了禁则：开引号不收在列末（缺陷 S12，行末禁则）", () => {
      // 行末禁则：「（」不能收在一列的末尾，整列提前一行结束，
      // 开引号挪到下一列的列首。
      const cells = layoutVertical("天地（", { charSize: 20, rowsPerColumn: 3, kinsoku: true });
      expect(cells.map((c) => [c.char, c.column, c.row])).toEqual([
        ["天", 0, 0],
        ["地", 0, 1],
        ["（", 1, 0],
      ]);
      // 不开禁则时，引号就收在列末（原样保留现状）
      const plain = layoutVertical("天地（", { charSize: 20, rowsPerColumn: 3 });
      expect(plain.map((c) => [c.char, c.column, c.row])).toEqual([
        ["天", 0, 0],
        ["地", 0, 1],
        ["（", 0, 2],
      ]);
    });

    it("开了禁则：阅读次序不变，字格仍不重叠（缺陷 S12）", () => {
      const text = "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。";
      const options: VerticalLayoutOptions = { charSize: 20, charGap: 4, lineGap: 10, rowsPerColumn: 4, kinsoku: true };
      const cells = layoutVertical(text, options);
      // 列从右往左、列内自上而下 → 按 (列, 行) 排序读回来还是原文
      const ordered = [...cells].sort((a, b) => a.column - b.column || a.row - b.row);
      expect(ordered.map((c) => c.char).join("")).toBe(text);
      // 每个字格都还在自己那一列里，行号不越界
      for (const c of cells) {
        expect(c.column).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeLessThan(4);
      }
      expectNoOverlap(cells.map((c) => cellBox(c, options.charSize)));
    });
  });

  describe("punctuationShift / needsVerticalAdjustment", () => {
    it("句读点移到字格右上角", () => {
      const shift = punctuationShift("。", 20);
      expect(shift).not.toBeNull();
      expect(shift!.dx).toBeCloseTo(10, 6);
      expect(shift!.dy).toBeCloseTo(-10, 6);
      expect(shift!.rotate).toBe(false);
    });

    it("各种句读点号的处理一致", () => {
      for (const ch of ["。", "，", "、", "；", "：", "·", "．"]) {
        const shift = punctuationShift(ch, 20);
        expect(shift, `${ch} 应当有位移`).not.toBeNull();
        expect(shift!.dx).toBeCloseTo(10, 6);
        expect(shift!.dy).toBeCloseTo(-10, 6);
      }
    });

    it("成对符号转向：开符号顺时针、闭符号逆时针", () => {
      for (const ch of ["（", "〔", "［", "【", "《", "〈", "「", "『"]) {
        const shift = punctuationShift(ch, 20);
        expect(shift, `${ch} 应当转向`).not.toBeNull();
        expect(shift!.rotate).toBe(true);
        expect(shift!.direction).toBe(1);
      }
      for (const ch of ["）", "〕", "］", "】", "》", "〉", "」", "』"]) {
        const shift = punctuationShift(ch, 20);
        expect(shift, `${ch} 应当转向`).not.toBeNull();
        expect(shift!.rotate).toBe(true);
        expect(shift!.direction).toBe(-1);
      }
    });

    it("破折号、波浪号、省略号也按转向处理", () => {
      for (const ch of ["—", "―", "～", "…"]) {
        const shift = punctuationShift(ch, 20);
        expect(shift, `${ch} 应当转向`).not.toBeNull();
        expect(shift!.rotate).toBe(true);
      }
    });

    it("普通汉字不需要竖排调整", () => {
      expect(punctuationShift("字", 20)).toBeNull();
      expect(needsVerticalAdjustment("字")).toBe(false);
      expect(punctuationShift("", 20)).toBeNull();
      expect(needsVerticalAdjustment("")).toBe(false);
    });

    it("needsVerticalAdjustment 与 punctuationShift 判断一致", () => {
      const sample = ["。", "，", "、", "；", "：", "·", "．", "（", "）", "《", "》", "「", "」", "…", "—", "(", ")", "字", "A", "1", " "];
      for (const ch of sample) {
        expect(needsVerticalAdjustment(ch)).toBe(punctuationShift(ch, 20) !== null);
      }
    });

    it("半角括号也要转向（缺陷 S11）", () => {
      // 缺陷 S11：「开符号」判定里写了 "("，但集合里没有半角括号——
      // 两边不一致（集合说不用处理，转向逻辑却给 "(" 备了案）。
      // 竖排里半角括号同样要转，所以把 "(" ")" 补进集合，让判定与实现对齐。
      const open = punctuationShift("(", 20);
      expect(open).not.toBeNull();
      expect(open!.rotate).toBe(true);
      expect(open!.direction).toBe(1);
      const close = punctuationShift(")", 20);
      expect(close).not.toBeNull();
      expect(close!.rotate).toBe(true);
      expect(close!.direction).toBe(-1);
      expect(needsVerticalAdjustment("(")).toBe(true);
      expect(needsVerticalAdjustment(")")).toBe(true);
    });

    it("退化字宽不抛异常", () => {
      expect(() => punctuationShift("。", 0)).not.toThrow();
      expect(() => punctuationShift("。", -20)).not.toThrow();
      expect(() => punctuationShift("。", NaN)).not.toThrow();
      const zero = punctuationShift("。", 0);
      expect(zero!.dx).toBeCloseTo(0, 10);
      expect(zero!.dy).toBeCloseTo(0, 10);
      const neg = punctuationShift("。", -20);
      expect(neg!.dx).toBeCloseTo(-10, 6);
      const nan = punctuationShift("。", NaN);
      expect(Number.isNaN(nan!.dx)).toBe(true);
    });

    it("句读点右移后不侵入右邻列的字格（默认行距下刚好相切）", () => {
      const size = 20;
      // 行距取默认值（半个字宽）：句读点正好抵住右邻列的字格左边界
      const cells = layoutVertical("字。", { charSize: size, rowsPerColumn: 1 });
      const dot = cells[1];
      const shift = punctuationShift(dot.char, size)!;
      // 字心在字格中心，位移后落在字格右上角
      expect(dot.x + size / 2 + shift.dx).toBeCloseTo(dot.x + size, 6);
      expect(dot.y + size / 2 + shift.dy).toBeCloseTo(dot.y, 6);
      // 句读点字格右边界不越过右邻列（更右一列）的左边界
      const right = cells[0];
      expect(dot.x + size / 2 + shift.dx + size / 2).toBeLessThanOrEqual(right.x + 1e-9);
    });

    it("行距小于半个字宽时句读点会侵入右邻列（不传行距时的已知限制）", () => {
      // 不传行距时，句读点的位移是固定的半个字宽，行距一小就压到邻列的字格上，
      // 这条把约束写死：调用方要么保证行距 ≥ 半个字宽，要么把行距传进来（见下一条）。
      const size = 20;
      const cells = layoutVertical("字。", { charSize: size, lineGap: 0, rowsPerColumn: 1 });
      const dot = cells[1];
      const shift = punctuationShift(dot.char, size)!;
      const right = cells[0];
      expect(dot.x + size / 2 + shift.dx + size / 2).toBeGreaterThan(right.x);
    });

    it("传了行距就把点号收紧，不越界（缺陷 S13）", () => {
      // 缺陷 S13：行距不够时句读点会静默压到右邻列的字格上。
      // 现在 punctuationShift 接受行距，把右移量收到「不越过邻列」为止
      // （点的右边界 = 字格右边界 + dx，邻列左边界 = 字格右边界 + 行距，
      //  所以 dx ≤ 行距 就不越界）；layoutVertical 也把这个收紧后的位移
      // 挂在字格的 shift 上，渲染端直接用就行。
      const size = 20;
      expect(punctuationShift("。", size, 0)!.dx).toBe(0);
      expect(punctuationShift("。", size, size * 0.25)!.dx).toBeCloseTo(size * 0.25, 6);
      // 行距够宽时仍然是「右上角」
      expect(punctuationShift("。", size, size * 0.5)!.dx).toBeCloseTo(size * 0.5, 6);
      // 字格上带的就是收紧后的位移
      const cells = layoutVertical("字。", { charSize: size, lineGap: 0, rowsPerColumn: 1 });
      expect(cells[1].shift!.dx).toBe(0);
      // 收紧后不越界：点的右边界不越过右邻列的字格左边界
      const right = cells[0];
      expect(cells[1].x + size / 2 + cells[1].shift!.dx + size / 2).toBeLessThanOrEqual(right.x + 1e-9);
    });
  });

  describe("verticalExtent", () => {
    it("空字格数组给出零尺寸", () => {
      expect(verticalExtent([], BASE)).toEqual({ width: 0, height: 0 });
    });

    it("单列的尺寸 = 行数 × 字宽 + 行间字距", () => {
      const cells = layoutVertical("一二三", { ...BASE, rowsPerColumn: 5 });
      const extent = verticalExtent(cells, BASE);
      expect(extent.width).toBe(20);
      expect(extent.height).toBe(3 * 20 + 2 * 4);
    });

    it("多列的尺寸 = 列数 × 字宽 + 列间行距", () => {
      const cells = layoutVertical("一二三四五", BASE);
      const extent = verticalExtent(cells, BASE);
      expect(extent.width).toBe(3 * 20 + 2 * 10);
      expect(extent.height).toBe(2 * 20 + 1 * 4);
    });

    it("外接尺寸与字格的实际包围盒一致", () => {
      const cells = layoutVertical("天地玄黄", BASE);
      const extent = verticalExtent(cells, BASE);
      const minX = Math.min(...cells.map((c) => c.x));
      const maxX = Math.max(...cells.map((c) => c.x + BASE.charSize));
      const minY = Math.min(...cells.map((c) => c.y));
      const maxY = Math.max(...cells.map((c) => c.y + BASE.charSize));
      expect(extent.width).toBeCloseTo(maxX - minX, 6);
      expect(extent.height).toBeCloseTo(maxY - minY, 6);
    });

    it("退化参数不抛异常", () => {
      const cells = layoutVertical("一二", BASE);
      expect(() => verticalExtent(cells, { charSize: 0 })).not.toThrow();
      expect(() => verticalExtent(cells, { charSize: NaN })).not.toThrow();
      expect(verticalExtent(cells, { charSize: 0 }).height).toBe(0);
    });

    it("字格乱序时外接尺寸应按最大列号算（缺陷 S10）", () => {
      // 缺陷 S10：修复前宽度只认最后一个字格的列号，字格乱序时会把宽度算小。
      // 这里用 5 个字（3 列），并把末位换成第 0 列的字格——正是踩坑的排法。
      const cells = layoutVertical("一二三四五", BASE);
      const shuffled = [cells[4], cells[3], cells[2], cells[0], cells[1]];
      const extent = verticalExtent(shuffled, BASE);
      expect(extent.width).toBeCloseTo(3 * 20 + 2 * 10, 6);
      expect(extent.height).toBeCloseTo(2 * 20 + 1 * 4, 6);
    });
  });
});

describe("D2 古籍版式", () => {
  describe("layoutClassicPage", () => {
    it("半叶、版框的默认天地头脚", () => {
      const page = layoutClassicPage(PAGE_BASE);
      expect(page.leaf).toEqual({ x: 0, y: 0, width: 1000, height: 1500 });
      expect(page.frame.x).toBeCloseTo(50, 6);
      expect(page.frame.y).toBeCloseTo(120, 6);
      expect(page.frame.width).toBeCloseTo(900, 6);
      expect(page.frame.height).toBeCloseTo(1230, 6);
      // 版框在版心（版面范围）之内
      expect(page.frame.x).toBeGreaterThanOrEqual(page.leaf.x);
      expect(page.frame.y).toBeGreaterThanOrEqual(page.leaf.y);
      expect(page.frame.x + page.frame.width).toBeLessThanOrEqual(page.leaf.width);
      expect(page.frame.y + page.frame.height).toBeLessThanOrEqual(page.leaf.height);
    });

    it("行从右往左排，最右一行贴着版框右边", () => {
      const page = layoutClassicPage(PAGE_BASE);
      expect(page.columns.length).toBe(10);
      expect(page.columns[0].x + page.columns[0].width).toBeCloseTo(page.frame.x + page.frame.width, 6);
      // 列号越大越靠左
      for (let i = 1; i < page.columns.length; i += 1) {
        expect(page.columns[i].x).toBeLessThan(page.columns[i - 1].x);
      }
      // 最左一行贴着版框左边
      const leftmost = page.columns[page.columns.length - 1];
      expect(leftmost.x).toBeGreaterThanOrEqual(page.frame.x - 1e-9);
    });

    it("各行字格互不重叠", () => {
      const page = layoutClassicPage(PAGE_BASE);
      const boxes = page.columns.map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
      expectNoOverlap(boxes);
    });

    it("界行落在两列之间的空隙里，不侵入字格", () => {
      const page = layoutClassicPage(PAGE_BASE);
      expect(page.columnRules.length).toBe(page.columns.length - 1);
      for (let i = 0; i < page.columnRules.length; i += 1) {
        const rule = page.columnRules[i];
        const rightCol = page.columns[i];
        const leftCol = page.columns[i + 1];
        // 界线落在左列的右边界上，整体宽度不超过列间空隙
        expect(rule.x).toBeGreaterThanOrEqual(leftCol.x + leftCol.width - 1e-9);
        expect(rule.x + rule.gap).toBeLessThanOrEqual(rightCol.x + 1e-9);
        expect(rule.y0).toBeCloseTo(page.frame.y, 6);
        expect(rule.y1).toBeCloseTo(page.frame.y + page.frame.height, 6);
      }
    });

    it("版心在书口（左侧）一侧", () => {
      const page = layoutClassicPage(PAGE_BASE);
      expect(page.banxin.x).toBeLessThan(page.frame.x);
      expect(page.banxin.x + page.banxin.width).toBeGreaterThan(page.frame.x - 1e-9);
    });

    it("鱼尾形式决定数量与指向", () => {
      const none = layoutClassicPage({ ...PAGE_BASE, fishtail: "none" });
      expect(none.fishtails.length).toBe(0);
      const single = layoutClassicPage({ ...PAGE_BASE, fishtail: "single" });
      expect(single.fishtails.length).toBe(1);
      expect(single.fishtails[0].direction).toBe("down");
      const double = layoutClassicPage({ ...PAGE_BASE, fishtail: "double" });
      expect(double.fishtails.length).toBe(2);
      expect(double.fishtails.map((f) => f.direction)).toEqual(["down", "up"]);
      // 鱼尾落在版心内
      for (const f of double.fishtails) {
        expect(f.x).toBeCloseTo(double.banxin.x, 6);
        expect(f.y).toBeGreaterThanOrEqual(double.banxin.y - 1e-9);
        expect(f.y + f.height).toBeLessThanOrEqual(double.banxin.y + double.banxin.height + 1e-9);
      }
    });

    it("rowsPerColumn 原样传给落位函数", () => {
      const page = layoutClassicPage({ ...PAGE_BASE, rowsPerColumn: 17 });
      expect(page.rowsPerColumn).toBe(17);
    });

    it("行数为 0 或负数时兜底成一行", () => {
      expect(layoutClassicPage({ ...PAGE_BASE, columns: 0 }).columns.length).toBe(1);
      expect(layoutClassicPage({ ...PAGE_BASE, columns: -3 }).columns.length).toBe(1);
    });

    it("退化尺寸不抛异常", () => {
      expect(() => layoutClassicPage({ ...PAGE_BASE, leafWidth: 0, leafHeight: 0 })).not.toThrow();
      expect(() => layoutClassicPage({ ...PAGE_BASE, leafWidth: NaN })).not.toThrow();
      expect(() => layoutClassicPage({ ...PAGE_BASE, leafWidth: -100 })).not.toThrow();
      expect(() => layoutClassicPage({ ...PAGE_BASE, leafWidth: 1e9 })).not.toThrow();
      const zero = layoutClassicPage({ ...PAGE_BASE, leafWidth: 0, leafHeight: 0 });
      expect(zero.leaf.width).toBe(0);
      const nan = layoutClassicPage({ ...PAGE_BASE, leafWidth: NaN });
      expect(Number.isNaN(nan.frame.width)).toBe(true);
    });

    it("非整数列数应取整（缺陷 S7）", () => {
      // 缺陷 S7：修复前 2.7 列会排出 3 行，最左一行 x=-51.33，整行跑到版框外。
      // 现在列数取整（向下取整，至少 1）。
      const page = layoutClassicPage({ ...PAGE_BASE, columns: 2.7 });
      expect(page.columns.length).toBe(2);
      const leftmost = page.columns[page.columns.length - 1];
      expect(leftmost.x).toBeGreaterThanOrEqual(page.frame.x - 1e-9);
      expect(leftmost.x + leftmost.width).toBeLessThanOrEqual(page.frame.x + page.frame.width + 1e-9);
      // 不能出现半行的坐标
      expect(page.columns.every((c) => Number.isInteger(c.x) && Number.isInteger(c.width))).toBe(true);
    });

    it("版心应当始终落在半叶之内（缺陷 S8）", () => {
      // 缺陷 S8：修复前版心位置/宽度由参数直接算，没有对半叶做约束——
      // 版心中心比例 0 → 版心 y=-225 跑到半叶上边之外；
      // 左边距 0 + 版心宽 200 → 版心 x=-120 跑到半叶左边之外。
      const top = layoutClassicPage({ ...PAGE_BASE, banxinCenter: 0 });
      expect(top.banxin.y).toBeGreaterThanOrEqual(0);
      expect(top.banxin.y + top.banxin.height).toBeLessThanOrEqual(top.leaf.height + 1e-9);
      const wide = layoutClassicPage({ ...PAGE_BASE, marginLeft: 0, banxinWidth: 200 });
      expect(wide.banxin.x).toBeGreaterThanOrEqual(0);
      expect(wide.banxin.x + wide.banxin.width).toBeLessThanOrEqual(wide.leaf.width + 1e-9);
    });

    it("title 参数不该被丢掉（缺陷 S9）", () => {
      // 缺陷 S9：修复前 ClassicPage 里根本没有 title 字段，题名无处安放。
      const page = layoutClassicPage({ ...PAGE_BASE, title: "書名" });
      expect(page.title).toBe("書名");
      // 没给题名时就不该有这一项
      expect(layoutClassicPage(PAGE_BASE).title).toBeUndefined();
    });
  });

  describe("placeText", () => {
    it("列从右往左、列内自上而下落字", () => {
      const page = layoutClassicPage(PAGE_BASE);
      const placed = placeText(page, "天地玄黄", {});
      expect(placed.map((p) => p.char)).toEqual(["天", "地", "玄", "黄"]);
      expect(placed.map((p) => p.column)).toEqual([0, 0, 0, 0]);
      expect(placed.map((p) => p.row)).toEqual([0, 1, 2, 3]);
      expect(placed[0].x).toBeCloseTo(page.columns[0].x + (page.columns[0].width - 52.89) / 2, 6);
    });

    it("每列满 rowsPerColumn 字后换列", () => {
      const page = layoutClassicPage(PAGE_BASE);
      // 30 个字：前 20 个占满第 0 行（最右一行），后 10 个进第 1 行
      const placed = placeText(page, "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕", {});
      expect(placed.length).toBe(30);
      expect(placed.map((p) => p.column)).toEqual([...Array(20).fill(0), ...Array(10).fill(1)]);
      expect(placed[20].x).toBeCloseTo(page.columns[1].x + (page.columns[1].width - 52.89) / 2, 6);
    });

    it("空文本不落字", () => {
      const page = layoutClassicPage(PAGE_BASE);
      expect(placeText(page, "", {})).toEqual([]);
    });

    it("字格互不重叠，且都在版框之内", () => {
      const page = layoutClassicPage(PAGE_BASE);
      const placed = placeText(page, "天地玄黄宇宙洪荒日月盈昃辰宿列张", {});
      const charSize = (page.frame.height / page.rowsPerColumn) * 0.86;
      const boxes = placed.map((p) => ({ x: p.x, y: p.y, width: charSize, height: charSize }));
      expectNoOverlap(boxes);
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(page.frame.x - 1e-6);
        expect(b.y).toBeGreaterThanOrEqual(page.frame.y - 1e-6);
        expect(b.x + b.width).toBeLessThanOrEqual(page.frame.x + page.frame.width + 1e-6);
        expect(b.y + b.height).toBeLessThanOrEqual(page.frame.y + page.frame.height + 1e-6);
      }
    });

    it("字落在所属行的正中", () => {
      const page = layoutClassicPage(PAGE_BASE);
      const placed = placeText(page, "天", {});
      const col = page.columns[0];
      // 水平居中：左右留白相等
      const left = placed[0].x - col.x;
      const right = col.x + col.width - (placed[0].x + 52.89);
      expect(left).toBeCloseTo(right, 6);
    });

    it("文字超出版面容量时只落得下前头的字（静默截断）", () => {
      const page = layoutClassicPage(PAGE_BASE);
      const capacity = page.columns.length * page.rowsPerColumn;
      const placed = placeText(page, "字".repeat(capacity + 50), {});
      expect(placed.length).toBe(capacity);
      expect(placed[placed.length - 1].index).toBe(capacity - 1);
    });

    it("退化参数不抛异常，返回空数组", () => {
      const page = layoutClassicPage({ ...PAGE_BASE, rowsPerColumn: 0 });
      expect(() => placeText(page, "天地玄黄", {})).not.toThrow();
      expect(placeText(page, "天地玄黄", {})).toEqual([]);
      const neg = layoutClassicPage({ ...PAGE_BASE, rowsPerColumn: -5 });
      // 负的行数：第 0 个字算出的列号是 -0（等于 0），后面的字全被丢掉
      expect(placeText(neg, "天地玄黄", {}).length).toBeLessThanOrEqual(1);
      expect(() => placeText(page, "天地玄黄", { charSize: 0 })).not.toThrow();
      expect(() => placeText(page, "天地玄黄", { charSize: NaN })).not.toThrow();
    });

    it("字宽超过行宽时字应改用行宽（缺陷 S4）", () => {
      // 缺陷 S4：修复前默认字宽只按「框高 ÷ 每行字数」算（105.78），比行宽 79.2 还宽，
      // 字心 x=857.51 跑到行左界 870.8 之外，整行字压出版框。
      // 现在字宽同时受行宽约束。
      const page = layoutClassicPage({ ...PAGE_BASE, rowsPerColumn: 10 });
      const placed = placeText(page, "天地玄黄", {});
      const col = page.columns[0];
      // 期望字宽 = 「框高 ÷ 每行字数」与行宽里小的那个
      const expectedSize = Math.min((page.frame.height / page.rowsPerColumn) * 0.86, col.width);
      expect(expectedSize).toBeCloseTo(79.2, 6);
      // 字不能越出本行
      expect(placed[0].x).toBeGreaterThanOrEqual(col.x - 1e-9);
      expect(placed[0].x).toBeCloseTo(col.x + (col.width - expectedSize) / 2, 6);
      expect(placed[0].x + expectedSize).toBeLessThanOrEqual(col.x + col.width + 1e-9);
    });

    it("字距应计入默认字宽，否则末行会顶出版框（缺陷 S5）", () => {
      // 缺陷 S5：修复前默认字宽只按「框高 ÷ 每行字数」算，没给字距留位，
      // 20 个字带 10 的字距 → 末字底边 1367.8，越出版框底边 1350。
      const page = layoutClassicPage(PAGE_BASE);
      const placed = placeText(page, "字".repeat(20), { charGap: 10 });
      const last = placed[placed.length - 1];
      // 行内步距 = 字宽 + 字距 → 反推实际字宽
      const charSize = placed[1].y - placed[0].y - 10;
      expect(charSize).toBeLessThan((page.frame.height / page.rowsPerColumn) * 0.86);
      // 末字底边必须在版框之内
      expect(last.y + charSize).toBeLessThanOrEqual(page.frame.y + page.frame.height + 1e-9);
    });
  });
});

describe("D3 行款推进", () => {
  const BASE_ADVANCE = {
    charSize: 20,
    charGap: 4,
    lineGap: 10,
    rowsPerColumn: 2,
    originX: 100,
    originY: 50,
  };

  it("按行款推进：列从右往左、列内自上而下", () => {
    const steps = advance(5, BASE_ADVANCE);
    expect(steps.length).toBe(5);
    expect(steps.map((s) => s.step)).toEqual([0, 1, 2, 3, 4]);
    expect(steps.map((s) => s.column)).toEqual([0, 0, 1, 1, 2]);
    expect(steps.map((s) => s.row)).toEqual([0, 1, 0, 1, 0]);
    expect(steps[0].x).toBe(100);
    expect(steps[2].x).toBe(100 - (20 + 10));
    expect(steps[1].y).toBe(50 + (20 + 4));
  });

  it("只有每列首行标记 columnStart，只有最后一步标记 last", () => {
    const steps = advance(5, BASE_ADVANCE);
    expect(steps.map((s) => s.columnStart)).toEqual([true, false, true, false, true]);
    expect(steps.map((s) => s.last)).toEqual([false, false, false, false, true]);
  });

  it("推进方向可以反过来（从左往右）", () => {
    const steps = advance(4, { ...BASE_ADVANCE, rightToLeft: false });
    expect(steps[2].x).toBe(100 + (20 + 10));
    expect(steps[0].x).toBe(100);
  });

  it("总高度与逐行累加一致", () => {
    const steps = advance(5, BASE_ADVANCE);
    const rows = Math.max(...steps.map((s) => s.row)) + 1;
    // 逐行累加：行高 × 行数 − 末行后面的字距
    const expected = rows * (20 + 4) - 4;
    const bottom = Math.max(...steps.map((s) => s.y)) + 20;
    expect(bottom - BASE_ADVANCE.originY).toBe(expected);
  });

  it("推进坐标与竖排版面一致", () => {
    const text = "天地玄黄宇宙洪荒";
    const cells = layoutVertical(text, BASE);
    const steps = advance(Array.from(text).length, BASE_ADVANCE);
    for (let i = 0; i < cells.length; i += 1) {
      expect(steps[i].x).toBe(cells[i].x);
      expect(steps[i].y).toBe(cells[i].y);
      expect(steps[i].column).toBe(cells[i].column);
      expect(steps[i].row).toBe(cells[i].row);
    }
  });

  it("同一输入跑两次结果完全一样（确定性）", () => {
    expect(advance(9, BASE_ADVANCE)).toEqual(advance(9, BASE_ADVANCE));
  });

  it("空推进返回空数组", () => {
    expect(advance(0, BASE_ADVANCE)).toEqual([]);
    expect(advance(-3, BASE_ADVANCE)).toEqual([]);
    expect(advance(NaN, BASE_ADVANCE)).toEqual([]);
  });

  it("rowsPerColumn 为 0 或负数时兜底成每列一字", () => {
    const zero = advance(3, { ...BASE_ADVANCE, rowsPerColumn: 0 });
    expect(zero.map((s) => s.column)).toEqual([0, 1, 2]);
    expect(zero.map((s) => s.row)).toEqual([0, 0, 0]);
    const neg = advance(3, { ...BASE_ADVANCE, rowsPerColumn: -2 });
    expect(neg.map((s) => s.column)).toEqual([0, 1, 2]);
  });

  it("退化尺寸不抛异常", () => {
    expect(() => advance(3, { ...BASE_ADVANCE, charSize: 0 })).not.toThrow();
    expect(() => advance(3, { ...BASE_ADVANCE, charSize: NaN })).not.toThrow();
    expect(() => advance(3, { ...BASE_ADVANCE, charSize: -10 })).not.toThrow();
    const nan = advance(3, { ...BASE_ADVANCE, charSize: NaN });
    expect(nan.length).toBe(3);
    expect(Number.isNaN(nan[0].x)).toBe(true);
  });

  it("非整数步数时最后一步也要标记 last", () => {
    // 缺陷（与 S1 同源，步数归一化）：count=1.5 会排出两步，
    // 但修复前没有任何一步 last=true（拿 count-1 去比，比的是 0.5）。
    const steps = advance(1.5, BASE_ADVANCE);
    expect(steps.length).toBe(2);
    expect(steps.map((s) => s.last)).toEqual([false, true]);
  });

  it("advance(Infinity) 不该挂死（缺陷 S1）", () => {
    // 缺陷 S1：修复前 advance(Infinity) 是死循环，永远不返回（吃到超时被杀）。
    // 现在非有限的步数一律当 0 步。
    // 放在子进程里跑：万一回归成死循环，这里是超时掐住，而不是把测试进程带崩。
    const modUrl = new URL("../src/layout/advance.ts", import.meta.url).href;
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { advance } from "${modUrl}";`
          + `console.log(JSON.stringify(advance(Infinity, { charSize: 10, rowsPerColumn: 2 })));`,
      ],
      { timeout: 3000, encoding: "utf8" },
    );
    expect(child.error).toBeUndefined();
    expect(child.stdout.trim()).toBe("[]");
  }, 20000);

  it("非有限的步数一律当 0 步（缺陷 S1）", () => {
    // NaN 与负无穷本来就不会进循环（循环条件为假），一并钉住
    expect(advance(NaN, BASE_ADVANCE)).toEqual([]);
    expect(advance(-Infinity, BASE_ADVANCE)).toEqual([]);
    expect(advance(0, BASE_ADVANCE)).toEqual([]);
    expect(advance(-3, BASE_ADVANCE)).toEqual([]);
  });
});

describe("D3 步取值与进度", () => {
  const steps: AdvanceStep[] = advance(3, { charSize: 20, rowsPerColumn: 2 });

  describe("stepAt", () => {
    it("取得到范围内的步", () => {
      expect(stepAt(steps, 0)).toBe(steps[0]);
      expect(stepAt(steps, 2)).toBe(steps[2]);
    });

    it("越界返回 null", () => {
      expect(stepAt(steps, -1)).toBeNull();
      expect(stepAt(steps, 3)).toBeNull();
      expect(stepAt([], 0)).toBeNull();
    });

    it("非整数下标应返回 null 而不是 undefined（缺陷 S6）", () => {
      // 缺陷 S6：修复前 steps[1.5] 是 undefined，而函数声明的返回类型是
      // AdvanceStep | null，调用方直接取 .x 会 TypeError。
      expect(stepAt(steps, 1.5)).toBeNull();
      expect(stepAt(steps, NaN)).toBeNull();
      expect(stepAt(steps, Infinity)).toBeNull();
      expect(stepAt(steps, -0.5)).toBeNull();
    });
  });

  describe("advanceProgress", () => {
    it("空序列进度为 0", () => {
      expect(advanceProgress([])).toBe(0);
    });

    it("进度 = 已写字数 ÷ 全文字数（缺陷 S2）", () => {
      // 缺陷 S2：修复前恒返回 1（长度为 1 时返回 0），跟「写到第几个字」无关，
      // 也没法表达进度——它没有总数参数。现在总数由调用方给出。
      expect(advanceProgress(steps, 3)).toBeCloseTo(1, 6);
      expect(advanceProgress([steps[0]], 3)).toBeCloseTo(1 / 3, 6);
      expect(advanceProgress([steps[0], steps[1]], 6)).toBeCloseTo(1 / 3, 6);
      expect(advanceProgress(steps, 6)).toBeCloseTo(0.5, 6);
      // 步数超过总数时封顶在 1
      expect(advanceProgress(steps, 1)).toBe(1);
      // 没给总数：只能说「给定的步都写完了」
      expect(advanceProgress(steps)).toBe(1);
      expect(advanceProgress(advance(100, { charSize: 20, rowsPerColumn: 2 }))).toBe(1);
      // 总数非法（0 / 负数 / 非有限）时也按「已完成」处理，不抛异常
      expect(advanceProgress(steps, 0)).toBe(1);
      expect(advanceProgress(steps, -5)).toBe(1);
      expect(advanceProgress(steps, NaN)).toBe(1);
    });
  });
});

describe.skipIf(!hasAssets)("D 组排版在真实字表上", () => {
  /** 从真实字表里取一段文字（不是手编的字串）。 */
  function realText(count: number): string {
    const index = JSON.parse(readFileSync(join(ASSETS, "index", "seal.json"), "utf8")) as Record<string, string>;
    return Object.keys(index).slice(0, count).join("");
  }

  it("真实文字排竖排：字框不重叠、外接尺寸对得上", () => {
    const text = realText(24);
    // 字表里有生僻字（代理对），字符串长度不等于字数，要按码点算
    const charCount = Array.from(text).length;
    expect(charCount).toBe(24);
    const options: VerticalLayoutOptions = { charSize: 32, charGap: 4, lineGap: 16, rowsPerColumn: 6 };
    const cells = layoutVertical(text, options);
    expect(cells.length).toBe(24);
    expectNoOverlap(cells.map((c) => cellBox(c, options.charSize)));
    const extent = verticalExtent(cells, options);
    expect(extent.width).toBeCloseTo(4 * 32 + 3 * 16, 6);
    expect(extent.height).toBeCloseTo(6 * 32 + 5 * 4, 6);
  });

  it("真实文字排古籍版式：字都在版框里", () => {
    const text = realText(40);
    const page = layoutClassicPage(PAGE_BASE);
    const placed = placeText(page, text, {});
    expect(placed.length).toBe(40);
    const charSize = (page.frame.height / page.rowsPerColumn) * 0.86;
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(page.frame.x - 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(page.frame.y - 1e-6);
      expect(p.x + charSize).toBeLessThanOrEqual(page.frame.x + page.frame.width + 1e-6);
      expect(p.y + charSize).toBeLessThanOrEqual(page.frame.y + page.frame.height + 1e-6);
    }
  });

  it("真实文字的推进序列与竖排版面逐字对齐", () => {
    const text = realText(18);
    const options: VerticalLayoutOptions = { charSize: 28, charGap: 2, lineGap: 12, rowsPerColumn: 5 };
    const cells = layoutVertical(text, options);
    const steps = advance(cells.length, {
      charSize: options.charSize,
      charGap: options.charGap,
      lineGap: options.lineGap,
      rowsPerColumn: options.rowsPerColumn!,
    });
    expect(steps.length).toBe(cells.length);
    for (let i = 0; i < cells.length; i += 1) {
      expect(steps[i].x).toBe(cells[i].x);
      expect(steps[i].y).toBe(cells[i].y);
    }
  });
});
