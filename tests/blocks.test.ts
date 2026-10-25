/**
 * A2b 部件分块（几何递归二分）的测试。
 *
 * 为什么单独钉它：构形分解（A2）只回答「部首在整字里的方位」——两分法，
 * 部首 / 其余。但教学上真正要指认的是**块**：「投」是扌 + 几 + 又，
 * 点右上那一块该整块亮起来，而不是亮其中一笔。
 *
 * 分块是纯几何的递归二分，三个参数（分离度 / 交叉偏移 / 递归深度）都能改，
 * 于是「切得对不对」和「切得稳不稳」必须分别钉死：
 * - 对不对 → 正常路径的切法与标签；
 * - 稳不稳 → 退化输入不抛异常 + 块划分的不变量（不漏、不重、确定）。
 *
 * 标签按块相对**整字**的位置给，词表是 {左,右,上,下,中,左上,左下,右上,右下} 九个词。
 * 早先的标签是「相对父块」的方位串接（先切哪一刀决定串接顺序），
 * 于是同一个物理位置会叫「左上」也会叫「上左」，还串出过「下右上」这种没人看得懂的词
 * （实测 400 个篆书字 1393 块里有 47.5% 落在词表外）。现在改成整字相对，词表闭合了。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg, type Glyph, type GlyphPath } from "../src/glyph.ts";
import { boundsOf, type Rect, type SubPath } from "../src/geometry/path.ts";
import { blockOfPath, DEFAULT_BLOCKS, segmentBlocks, type Block } from "../src/structure/blocks.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const SEAL_INDEX = join(ASSETS, "index", "seal.json");
const hasAssets = existsSync(SEAL_INDEX);

/** 造一条路径。 */
function makePath(
  subpaths: SubPath[],
  opts: { strokeWidth?: number; filled?: boolean } = {},
): GlyphPath {
  const strokeWidth = opts.strokeWidth ?? 0;
  return {
    subpaths,
    strokeWidth,
    filled: opts.filled ?? strokeWidth === 0,
    bounds: boundsOf(subpaths),
  };
}

/** 造一个字形。 */
function makeGlyph(
  paths: GlyphPath[],
  viewBox: Rect = { x: 0, y: 0, width: 100, height: 100 },
): Glyph {
  return { viewBox, paths, bounds: boundsOf(paths.flatMap((p) => p.subpaths)) };
}

/**
 * 造一条闭合的方框轮廓。
 *
 * 首点重复一次是有意的：`centroidOf` 靠「首尾是否重合」判断闭合，
 * 不闭合的折线会退化成按弧长取中点，质心就不再是方框中心了。
 */
function box(x0: number, y0: number, x1: number, y1: number): SubPath {
  return [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 },
    { x: x0, y: y1 }, { x: x0, y: y0 },
  ];
}

/** 造一个填充型字形（每条路径一条闭合轮廓）。 */
function outlineGlyph(contours: SubPath[], viewBox?: Rect): Glyph {
  return makeGlyph(contours.map((sp) => makePath([sp])), viewBox);
}

/** 真实字形：读 assets/index 的索引 + assets/glyphs 的 SVG。 */
function loadSeal(char: string): Glyph | null {
  const index = JSON.parse(readFileSync(SEAL_INDEX, "utf8")) as Record<string, string>;
  const file = index[char];
  if (!file) return null;
  const path = join(ASSETS, "glyphs", "seal", file);
  if (!existsSync(path)) return null;
  return parseGlyphSvg(readFileSync(path, "utf8"));
}

/** 块的摘要，形如「左:[0] 右上:[2]」。 */
function summarize(blocks: Block[]): string {
  return blocks.map((b) => `${b.label}:[${b.pathIndices.join(",")}]`).join(" ");
}

describe("A2b segmentBlocks：正常路径", () => {
  it("左右结构 → 「左」「右」两块", () => {
    const glyph = outlineGlyph([box(5, 10, 40, 90), box(60, 10, 95, 90)]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.length).toBe(2);
    expect(blocks.map((b) => b.label)).toEqual(["左", "右"]);
    expect(blocks.map((b) => b.pathIndices)).toEqual([[0], [1]]);
    // 左块的外接框就该只盖住左边那一块墨
    expect(blocks[0].bounds.x).toBeCloseTo(5, 6);
    expect(blocks[0].bounds.x + blocks[0].bounds.width).toBeCloseTo(40, 6);
  });

  it("上下结构 → 「上」「下」两块", () => {
    const glyph = outlineGlyph([box(5, 5, 95, 40), box(5, 60, 95, 90)]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.length).toBe(2);
    expect(blocks.map((b) => b.label)).toEqual(["上", "下"]);
    expect(blocks.map((b) => b.pathIndices)).toEqual([[0], [1]]);
  });

  it("三块结构：左边一块 + 右边上下两块 → 「左」「右上」「右下」", () => {
    // 形状照「投」搭：左边一条长竖，右边上下各一块
    const glyph = outlineGlyph([
      box(5, 5, 35, 95),
      box(55, 55, 95, 95),
      box(55, 5, 95, 45),
    ]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.length).toBe(3);
    expect(blocks.map((b) => b.label)).toEqual(["左", "右上", "右下"]);
    expect(blocks.map((b) => b.pathIndices)).toEqual([[0], [2], [1]]);
  });

  it("标签按切分方式叠加：左组再上下切 → 「左上」「左下」", () => {
    const glyph = outlineGlyph([box(5, 5, 35, 45), box(5, 55, 35, 95), box(55, 5, 95, 95)]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.map((b) => b.label)).toEqual(["左上", "左下", "右"]);
    expect(blocks.map((b) => b.pathIndices)).toEqual([[0], [1], [2]]);
  });

  it("两个轴都切得动时取分离度大的那个（横向占优）", () => {
    // 横向可切：左两笔在 x=20，右一笔在 x=80，纵向分离度 0.56 < 横向 0.75
    const glyph = outlineGlyph([box(10, 10, 30, 30), box(10, 70, 30, 90), box(70, 40, 90, 60)]);
    const blocks = segmentBlocks(glyph);

    // 先横切（左右），左组再纵切 → 「左上」「左下」，右边一整块
    expect(summarize(blocks)).toBe("左上:[0] 左下:[1] 右:[2]");
  });

  it("两个轴都切得动时取分离度大的那个（纵向占优）", () => {
    const glyph = outlineGlyph([box(10, 10, 30, 30), box(70, 10, 90, 30), box(40, 70, 60, 90)]);
    const blocks = segmentBlocks(glyph);

    // 标签按**整字**相对位置给：两个在上、一个在下
    expect(summarize(blocks)).toBe("左上:[0] 右上:[1] 下:[2]");
  });

  it("DEFAULT_BLOCKS 是文档承诺的三项默认值", () => {
    expect(DEFAULT_BLOCKS).toEqual({ separation: 0.18, cross: 0.55, maxDepth: 3 });
  });
});

describe("A2b segmentBlocks：边界", () => {
  it("单笔字形只有一块，标签「中」", () => {
    const glyph = outlineGlyph([box(10, 10, 90, 90)]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.length).toBe(1);
    expect(blocks[0].label).toBe("中");
    expect(blocks[0].pathIndices).toEqual([0]);
  });

  it("空字形（paths: []）→ 空数组", () => {
    expect(segmentBlocks(makeGlyph([]))).toEqual([]);
  });

  it("两笔字形 → 两块（左右或上下取决于排布）", () => {
    const lr = segmentBlocks(outlineGlyph([box(10, 10, 40, 40), box(60, 10, 90, 40)]));
    expect(lr.map((b) => b.label)).toEqual(["左", "右"]);

    const tb = segmentBlocks(outlineGlyph([box(10, 10, 40, 40), box(10, 60, 40, 90)]));
    expect(tb.map((b) => b.label)).toEqual(["上", "下"]);
  });

  it("maxDepth=0 → 不再往下切，整字一块", () => {
    const glyph = outlineGlyph([
      box(5, 5, 45, 45), box(55, 5, 95, 45), box(5, 55, 45, 95), box(55, 55, 95, 95),
    ]);
    const blocks = segmentBlocks(glyph, { maxDepth: 0 });

    expect(blocks.length).toBe(1);
    expect(blocks[0].label).toBe("中");
    expect(blocks[0].pathIndices).toEqual([0, 1, 2, 3]);
  });

  it("maxDepth=1 → 只切一刀，左右各一块", () => {
    const glyph = outlineGlyph([
      box(5, 5, 45, 45), box(55, 5, 95, 45), box(5, 55, 45, 95), box(55, 55, 95, 95),
    ]);
    const blocks = segmentBlocks(glyph, { maxDepth: 1 });

    expect(blocks.map((b) => b.label)).toEqual(["左", "右"]);
    expect(blocks.map((b) => b.pathIndices)).toEqual([[0, 2], [1, 3]]);
  });

  it("maxDepth=2 → 切到四个角块", () => {
    const glyph = outlineGlyph([
      box(5, 5, 45, 45), box(55, 5, 95, 45), box(5, 55, 45, 95), box(55, 55, 95, 95),
    ]);
    const blocks = segmentBlocks(glyph, { maxDepth: 2 });

    expect(blocks.map((b) => b.label)).toEqual(["左上", "左下", "右上", "右下"]);
  });

  it("separation 调大到 0.9 → 切不动，退回整字一块", () => {
    const glyph = outlineGlyph([box(5, 10, 40, 90), box(60, 10, 95, 90)]);
    const blocks = segmentBlocks(glyph, { separation: 0.9 });

    expect(blocks.length).toBe(1);
    expect(blocks[0].label).toBe("中");
  });

  it("options 只覆盖本次调用，不改动全局 DEFAULT_BLOCKS", () => {
    const glyph = outlineGlyph([box(5, 10, 40, 90), box(60, 10, 95, 90)]);
    segmentBlocks(glyph, { maxDepth: 0, separation: 0.9 });

    expect(DEFAULT_BLOCKS).toEqual({ separation: 0.18, cross: 0.55, maxDepth: 3 });
    expect(segmentBlocks(glyph).length).toBe(2);
  });
});

describe("A2b segmentBlocks：退化输入不抛异常", () => {
  it("全零宽高 viewBox → 不抛异常", () => {
    const glyph = outlineGlyph([box(5, 5, 40, 40)], { x: 0, y: 0, width: 0, height: 0 });
    expect(() => segmentBlocks(glyph)).not.toThrow();
    expect(segmentBlocks(glyph).length).toBe(1);
  });

  it("NaN 坐标 → 不抛异常（切不动，整字一块）", () => {
    const glyph = makeGlyph([
      makePath([[{ x: Number.NaN, y: Number.NaN }, { x: Number.NaN, y: Number.NaN }]]),
    ]);
    expect(() => segmentBlocks(glyph)).not.toThrow();
    const blocks = segmentBlocks(glyph);
    expect(blocks.length).toBe(1);
    expect(blocks[0].pathIndices).toEqual([0]);
  });

  it("Infinity 坐标 → 不抛异常", () => {
    const glyph = makeGlyph([
      makePath([[{ x: Number.POSITIVE_INFINITY, y: 0 }, { x: 0, y: Number.POSITIVE_INFINITY }]]),
    ]);
    expect(() => segmentBlocks(glyph)).not.toThrow();
    expect(segmentBlocks(glyph).length).toBe(1);
  });

  it("负坐标 → 外接框照算，不抛异常", () => {
    const glyph = outlineGlyph([box(-50, -30, -10, -30)]);
    const blocks = segmentBlocks(glyph);

    expect(blocks.length).toBe(1);
    expect(blocks[0].bounds).toEqual({ x: -50, y: -30, width: 40, height: 0 });
  });

  it("超大坐标 → 不抛异常", () => {
    const glyph = makeGlyph([
      makePath([[{ x: -1e12, y: 1e12 }, { x: 1e12, y: -1e12 }]]),
    ]);
    expect(() => segmentBlocks(glyph)).not.toThrow();
    expect(segmentBlocks(glyph).length).toBe(1);
  });

  it("子路径只有 1 个点 → 不抛异常", () => {
    const glyph = makeGlyph([makePath([[{ x: 3, y: 4 }]])]);
    expect(() => segmentBlocks(glyph)).not.toThrow();
    expect(segmentBlocks(glyph).length).toBe(1);
    expect(segmentBlocks(glyph)[0].bounds).toEqual({ x: 3, y: 4, width: 0, height: 0 });
  });

  it("空 subpaths → 不抛异常（当一条没有墨的路径处理）", () => {
    const glyph = makeGlyph([makePath([])]);
    expect(() => segmentBlocks(glyph)).not.toThrow();
    expect(segmentBlocks(glyph).length).toBe(1);
    expect(segmentBlocks(glyph)[0].pathIndices).toEqual([0]);
  });

  it("空 paths → 空数组，不抛异常", () => {
    expect(() => segmentBlocks(makeGlyph([]))).not.toThrow();
    expect(segmentBlocks(makeGlyph([]))).toEqual([]);
  });
});

describe("A2b 分块不变量", () => {
  /** 一批字形：覆盖各种排布与各种退化输入。 */
  const cases: Array<{ name: string; glyph: Glyph }> = [
    { name: "单笔", glyph: outlineGlyph([box(10, 10, 90, 90)]) },
    { name: "左右", glyph: outlineGlyph([box(5, 10, 40, 90), box(60, 10, 95, 90)]) },
    {
      name: "三块",
      glyph: outlineGlyph([box(5, 5, 35, 95), box(55, 55, 95, 95), box(55, 5, 95, 45)]),
    },
    {
      name: "四象限",
      glyph: outlineGlyph([
        box(5, 5, 45, 45), box(55, 5, 95, 45), box(5, 55, 45, 95), box(55, 55, 95, 95),
      ]),
    },
    { name: "空", glyph: makeGlyph([]) },
    { name: "单点", glyph: makeGlyph([makePath([[{ x: 3, y: 4 }]])]) },
    { name: "空 subpaths", glyph: makeGlyph([makePath([])]) },
    {
      name: "NaN",
      glyph: makeGlyph([makePath([[{ x: Number.NaN, y: 1 }, { x: 2, y: Number.NaN }]])]),
    },
  ];

  it("块两两不重叠，并集等于全部路径下标（不漏不重）", () => {
    for (const { name, glyph } of cases) {
      const blocks = segmentBlocks(glyph);
      const owner = new Map<number, string>();

      for (const b of blocks) {
        for (const i of b.pathIndices) {
          expect(owner.has(i), `${name}：路径 ${i} 同时落进「${owner.get(i)}」与「${b.label}」`).toBe(false);
          owner.set(i, b.label);
        }
      }
      expect([...owner.keys()].sort((x, y) => x - y), `${name}：路径下标没被分完`).toEqual(
        glyph.paths.map((_, i) => i),
      );
    }
  });

  it("每块 pathIndices 升序且不重复", () => {
    for (const { name, glyph } of cases) {
      for (const b of segmentBlocks(glyph)) {
        const sorted = [...b.pathIndices].sort((x, y) => x - y);
        expect(b.pathIndices, `${name}：pathIndices 非升序`).toEqual(sorted);
        expect(new Set(b.pathIndices).size, `${name}：pathIndices 有重复`).toBe(b.pathIndices.length);
      }
    }
  });

  it("确定性：同一输入跑两次结果完全相同", () => {
    for (const { name, glyph } of cases) {
      const a = segmentBlocks(glyph);
      const b = segmentBlocks(glyph);
      expect(JSON.stringify(a), `${name}：两次运行结果不同`).toBe(JSON.stringify(b));
    }
  });

  it("blockOfPath 对块内每条路径都返回该块的标签；不存在的路径返回 null", () => {
    for (const { name, glyph } of cases) {
      const blocks = segmentBlocks(glyph);
      for (const b of blocks) {
        for (const i of b.pathIndices) {
          expect(blockOfPath(blocks, i), `${name}：路径 ${i} 的标签对不上`).toBe(b.label);
        }
      }
      expect(blockOfPath(blocks, glyph.paths.length), `${name}：越界路径应为 null`).toBeNull();
      expect(blockOfPath(blocks, -1)).toBeNull();
    }
  });

  it("每块的外接框正好是它那些路径的墨迹范围", () => {
    for (const { name, glyph } of cases) {
      for (const b of segmentBlocks(glyph)) {
        const subs = b.pathIndices.flatMap((i) => glyph.paths[i]?.subpaths ?? []);
        expect(b.bounds, `${name}：块的外接框与路径墨迹不符`).toEqual(boundsOf(subs));
      }
    }
  });

  it("每块的质心落在自己的外接框内", () => {
    for (const { name, glyph } of cases) {
      for (const b of segmentBlocks(glyph)) {
        // 退化字形的质心可能是 NaN（墨量算不出来），那种情况跳过
        if (!Number.isFinite(b.centroid.x) || !Number.isFinite(b.centroid.y)) continue;
        expect(b.centroid.x, `${name}：质心越出外接框`).toBeGreaterThanOrEqual(b.bounds.x - 1e-6);
        expect(b.centroid.x).toBeLessThanOrEqual(b.bounds.x + b.bounds.width + 1e-6);
        expect(b.centroid.y).toBeGreaterThanOrEqual(b.bounds.y - 1e-6);
        expect(b.centroid.y).toBeLessThanOrEqual(b.bounds.y + b.bounds.height + 1e-6);
      }
    }
  });
});

describe.skipIf(!hasAssets)("A2b 真实字形（篆书）", () => {
  it("「投」切成三块：左 / 右上 / 右下", () => {
    const glyph = loadSeal("投");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    const blocks = segmentBlocks(glyph);
    // 篆书「投」= 扌 + 殳（几 + 又）：
    // 路径 0 是左边一整列（扌），路径 2 在右上（几），路径 1 在右下（又）。
    // 这正是演示页要的「点右上那一块整块亮起来」。
    expect(summarize(blocks)).toBe("左:[0] 右上:[2] 右下:[1]");
  });

  it("「明」切成两块：左 / 右", () => {
    const glyph = loadSeal("明");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    // 篆书「明」= 目 + 月：目在左（路径 0），月在右，被摹本拆成了两笔（路径 1、2）
    expect(summarize(segmentBlocks(glyph))).toBe("左:[0] 右:[1,2]");
  });

  it("「好」切成两块：左 / 右", () => {
    const glyph = loadSeal("好");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    // 篆书「好」= 女 + 子：女在左（路径 0），子在右（路径 1）
    expect(summarize(segmentBlocks(glyph))).toBe("左:[0] 右:[1]");
  });

  it("「想」切成三块：左上 / 右上 / 下", () => {
    const glyph = loadSeal("想");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    // 篆书「想」= 相 + 心：上面「相」左右各一块（路径 1 是木、路径 2 是目），
    // 下面「心」一整块（路径 0）。
    // 标签按整字相对位置给：木在左上、目在右上、心在下。
    expect(summarize(segmentBlocks(glyph))).toBe("左上:[1] 右上:[2] 下:[0]");
  });

  it("「語」切成四块：左上 / 左 / 右上 / 右下", () => {
    const glyph = loadSeal("語");
    expect(glyph).toBeTruthy();
    if (!glyph) return;

    // 篆书「語」= 言 + 吾：
    // 路径 3 是言字顶上那一横（整字最上偏左），路径 0 是言的其余部分（左列），
    // 路径 1 是吾上的口（右上），路径 2 是吾下的五（右下）。
    // 四个标签都落在九词表内。
    expect(summarize(segmentBlocks(glyph))).toBe("左上:[3] 左:[0] 右上:[1] 右下:[2]");
  });

  it("真实字形上不变量依然成立（抽样 200 个篆书字）", () => {
    const index = JSON.parse(readFileSync(SEAL_INDEX, "utf8")) as Record<string, string>;
    const chars = Object.keys(index).slice(0, 200);
    expect(chars.length).toBeGreaterThan(0);

    for (const char of chars) {
      const glyph = loadSeal(char);
      if (!glyph) continue;
      const blocks = segmentBlocks(glyph);

      const owner = new Map<number, string>();
      for (const b of blocks) {
        for (const i of b.pathIndices) {
          expect(owner.has(i), `「${char}」路径 ${i} 落进多块`).toBe(false);
          owner.set(i, b.label);
          expect(blockOfPath(blocks, i)).toBe(b.label);
        }
      }
      expect([...owner.keys()].sort((x, y) => x - y), `「${char}」路径没被分完`).toEqual(
        glyph.paths.map((_, i) => i),
      );
    }
  });
});
