/**
 * C1 跨书体形变插值的测试。
 *
 * 重点守三件事：
 * 1. **端点要对**——t=0 应当是源字形，t=1 应当是目标字形。
 *    早先「没配上的笔画」的淡入淡出方向写反了（目标的该随 t 长大却写成收缩，
 *    源的该随 t 消失却写成放大 1.6 倍），结果 t=1 都不是目标字形。
 * 2. **描边型与填充型要能互插**——甲骨骨架是折线、摹本是闭合轮廓，
 *    不统一的话中间态就是一坨实心块。
 * 3. 中间态必须是**合法路径**，不能塌掉。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GlyphStore } from "../tools/lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import { interpolateGlyphs, normalizeGlyph, strokeToContour } from "../src/morph/interpolate.ts";
import { countInk, rasterizeGlyph } from "../src/raster/mask.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "glyphs", "seal", "index.csv"));

/** 一个字形在给定分辨率下的墨量。 */
function inkOf(glyph: ReturnType<typeof parseGlyphSvg>, resolution = 200): number {
  const mask = rasterizeGlyph(glyph.paths.flatMap((p) => p.subpaths), {
    width: resolution,
    height: resolution,
    viewBox: glyph.viewBox,
  });
  return countInk(mask);
}

describe("strokeToContour", () => {
  it("把折线变成闭合的带状轮廓", () => {
    const c = strokeToContour([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1);
    // 左右两侧各一个点，加起来 4 个
    expect(c.length).toBe(4);
    // 带宽 = 2 × halfWidth
    expect(Math.abs(c[0].y - c[2].y)).toBeCloseTo(2, 6);
  });

  it("点不足两个时返回空", () => {
    expect(strokeToContour([{ x: 0, y: 0 }], 1)).toEqual([]);
  });
});

describe.skipIf(!hasAssets)("C1 形变插值", () => {
  const store = new GlyphStore();

  function glyphOf(layer: "oracle" | "bronze" | "seal" | "clerical" | "chuanchao" | "chu", char: string) {
    const file = store.index(layer).byChar(char)?.file;
    if (!file) return null;
    const g = store.glyph(layer, file);
    return g ? parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8")) : null;
  }

  it("t=0 是源字形、t=1 是目标字形", () => {
    const from = glyphOf("oracle", "日");
    const to = glyphOf("chu", "日");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    const srcInk = inkOf(from);
    const dstInk = inkOf(to);
    const at0 = inkOf(interpolateGlyphs(from, to, 0, { samples: 96 }));
    const at1 = inkOf(interpolateGlyphs(from, to, 1, { samples: 96 }));

    // 归一化会改变画布比例，墨量不可能完全相等，但不该差一个量级
    expect(at0).toBeGreaterThan(srcInk * 0.25);
    expect(at0).toBeLessThan(srcInk * 4);
    expect(at1).toBeGreaterThan(dstInk * 0.25);
    expect(at1).toBeLessThan(dstInk * 4);
  });

  it("中间态是合法路径，不会糊成一坨", () => {
    const from = glyphOf("oracle", "日");
    const to = glyphOf("chu", "日");
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    if (!from || !to) return;

    const mid = interpolateGlyphs(from, to, 0.5, { samples: 96 });
    expect(mid.paths.length).toBeGreaterThan(0);
    expect(mid.paths.every((p) => p.subpaths[0]?.length >= 2)).toBe(true);
    // 中间态的墨量不该远大于两端——糊成实心块就是这个特征
    const midInk = inkOf(mid);
    const maxEnd = Math.max(inkOf(from), inkOf(to));
    expect(midInk).toBeLessThan(maxEnd * 1.5);
  });

  it("归一化把描边型折线转成闭合带", () => {
    const from = glyphOf("oracle", "日");
    expect(from).toBeTruthy();
    if (!from) return;
    const norm = normalizeGlyph(from, 200).glyph;
    // 折线（2 个点）变成带（左右两侧各一列，至少 4 个点）
    for (const p of norm.paths) {
      for (const sp of p.subpaths) {
        expect(sp.length).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
