/**
 * E6 易混字对比、E7 声族聚合的测试。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg } from "../src/glyph.ts";
import { compareGlyphs } from "../src/teaching/compare.ts";
import {
  buildPhoneticFamilies, componentDescriptor, descriptorDistance,
} from "../src/teaching/family.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "seal.json"));

function loadIndex(layer: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"));
}
function loadGlyph(layer: string, file: string) {
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8"));
}

/** 造一个描边型字形。 */
function synth(strokes: Array<Array<[number, number]>>) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + strokes.map((pts) => {
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
      return `<path d="${d}" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>`;
    }).join("")
    + "</svg>";
  return parseGlyphSvg(svg);
}

describe("E6 易混字对比", () => {
  it("完全相同的两个字：形似度满分，无独有笔画", () => {
    const a = synth([[[10, 20], [90, 20]], [[50, 20], [50, 90]]]);
    const d = compareGlyphs(a, a);
    expect(d.similarity).toBeGreaterThan(0.95);
    expect(d.onlyA).toEqual([]);
    expect(d.onlyB).toEqual([]);
    expect(d.pairs.length).toBe(2);
  });

  it("只差一笔：能指出多出来的那一笔", () => {
    const a = synth([[[10, 20], [90, 20]], [[50, 20], [50, 90]]]);
    const b = synth([[[10, 20], [90, 20]], [[50, 20], [50, 90]], [[20, 60], [80, 60]]]);
    const d = compareGlyphs(a, b);
    expect(d.pairs.length).toBe(2);
    expect(d.onlyA).toEqual([]);
    expect(d.onlyB.length).toBe(1);
    expect(d.onlyB[0]).toBe(2);
    expect(d.summary).toContain("后者另有 1 笔");
  });

  it("结构完全不同的两个字：没有配上的笔画", () => {
    const a = synth([[[10, 10], [90, 10]]]);
    const b = synth([[[10, 80], [90, 80]], [[20, 20], [80, 40]]]);
    const d = compareGlyphs(a, b);
    expect(d.pairs.length).toBe(0);
    expect(d.onlyA.length).toBe(1);
    expect(d.onlyB.length).toBe(2);
  });
});

describe("E7 声族聚合", () => {
  it("同一个形状描述子：距离为 0", () => {
    const g = synth([[[10, 10], [90, 10]], [[50, 10], [50, 90]]]);
    const d1 = componentDescriptor(g, [1]);
    const d2 = componentDescriptor(g, [1]);
    expect(descriptorDistance(d1, d2)).toBe(0);
  });

  it("形状相近的部件聚成一族，形状不同的分开", () => {
    // 两个字的「右半边」形状相近 → 同一族
    const g1 = synth([[[10, 20], [30, 20]], [[60, 20], [90, 20]], [[75, 20], [75, 90]]]);
    const g2 = synth([[[10, 20], [30, 20]], [[58, 22], [90, 22]], [[74, 22], [74, 88]]]);
    // 第三个字的右半边明显不同 → 另一族
    const g3 = synth([[[10, 20], [30, 20]], [[55, 70], [90, 70]]]);

    const inputs = [
      { char: "甲", semantic: "扌", side: "right", descriptor: componentDescriptor(g1, [1, 2]) },
      { char: "乙", semantic: "扌", side: "right", descriptor: componentDescriptor(g2, [1, 2]) },
      { char: "丙", semantic: "扌", side: "right", descriptor: componentDescriptor(g3, [1]) },
    ];
    const families = buildPhoneticFamilies(inputs, 40);
    const withTwo = families.find((f) => f.size === 2);
    expect(withTwo).toBeTruthy();
    expect(withTwo!.members.map((m) => m.char).sort()).toEqual(["乙", "甲"]);
    expect(families.length).toBe(2);
  });

  it("阈值收紧就分得开", () => {
    // 一横一竖：描述子差得远
    const g1 = synth([[[10, 20], [90, 20]]]);
    const g2 = synth([[[50, 10], [50, 90]]]);
    const inputs = [
      { char: "甲", semantic: "扌", side: "right", descriptor: componentDescriptor(g1, [0]) },
      { char: "乙", semantic: "扌", side: "right", descriptor: componentDescriptor(g2, [0]) },
    ];
    expect(buildPhoneticFamilies(inputs, 0).length).toBe(2);
    expect(buildPhoneticFamilies(inputs, 60).length).toBe(1);
  });

  it("单独一条横线也能算出描述子（用户单位里高度为 0）", () => {
    const g = synth([[[10, 20], [90, 20]]]);
    const d = componentDescriptor(g, [0]);
    let bits = 0;
    for (const byte of d) {
      for (let i = 0; i < 8; i += 1) if ((byte >> i) & 1) bits += 1;
    }
    expect(bits).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasAssets)("E6/E7 在真实字形上", () => {
  it("「未」与「末」形似度很高但笔画不同", () => {
    const index = loadIndex("seal");
    const a = loadGlyph("seal", index["未"]);
    const b = loadGlyph("seal", index["末"]);
    const d = compareGlyphs(a, b);
    expect(d.similarity).toBeGreaterThan(0.3);
    expect(d.pairs.length).toBeGreaterThan(0);
    expect(d.summary.length).toBeGreaterThan(0);
  });

  it("「木」与「林」的公共部件能被描述子认出来", () => {
    const index = loadIndex("seal");
    const mu = loadGlyph("seal", index["木"]);
    const lin = loadGlyph("seal", index["林"]);
    // 木 整体 vs 林 的第一部分
    const dMu = componentDescriptor(mu, mu.paths.map((_, i) => i));
    const dLin = componentDescriptor(lin, [0]);
    expect(descriptorDistance(dMu, dLin)).toBeLessThan(256);
  });
});
