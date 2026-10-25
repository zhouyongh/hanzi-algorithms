import { describe, expect, it } from "vitest";
import { createMask, countInk, resizeMaskSmooth, cropToInk } from "../src/raster/mask.ts";
import { matchTemplate, TemplateMatcher } from "../src/raster/match.ts";

/** 造一个「L 形」掩膜，尺寸 w×h，占据 (0,0)-(w/2, h/2) 与 (0,0)-(w, h/3)。 */
function makeL(w: number, h: number): ReturnType<typeof createMask> {
  const m = createMask(w, h);
  for (let y = 0; y < h / 2; y += 1) {
    for (let x = 0; x < w / 2; x += 1) m.data[y * w + x] = 1;
  }
  for (let y = 0; y < h / 3; y += 1) {
    for (let x = 0; x < w; x += 1) m.data[y * w + x] = 1;
  }
  return m;
}

describe("TemplateMatcher", () => {
  it("在噪声背景里找回已知位置", () => {
    const w = 120;
    const h = 120;
    const image = createMask(w, h);
    // 背景：随机稀疏点
    for (let i = 0; i < image.data.length; i += 1) {
      image.data[i] = (i * 2654435761) % 97 < 2 ? 1 : 0;
    }
    // 在 (60, 50) 贴一个 L 形模板
    const tpl = makeL(24, 24);
    for (let y = 0; y < tpl.height; y += 1) {
      for (let x = 0; x < tpl.width; x += 1) {
        if (tpl.data[y * tpl.width + x]) image.data[(50 + y) * w + (60 + x)] = 1;
      }
    }

    const matcher = new TemplateMatcher(image);
    const r = matcher.matchScaled(tpl, 1, 1);
    expect(r).not.toBeNull();
    expect(r!.x).toBeCloseTo(60, 0);
    expect(r!.y).toBeCloseTo(50, 0);
    expect(r!.score).toBeGreaterThan(0.9);
  });
});

describe("matchTemplate", () => {
  it("识别被纵向拉长的模板", () => {
    const w = 160;
    const h = 160;
    const image = createMask(w, h);
    // 复合字：左边一个被拉长的竖条，右边一个方块
    for (let y = 20; y < 140; y += 1) {
      for (let x = 30; x < 50; x += 1) image.data[y * w + x] = 1;
    }
    for (let y = 40; y < 100; y += 1) {
      for (let x = 100; x < 140; x += 1) image.data[y * w + x] = 1;
    }
    // 模板：一个正方形（对应右侧方块）
    const tpl = createMask(40, 60);
    for (let y = 0; y < 60; y += 1) {
      for (let x = 0; x < 40; x += 1) tpl.data[y * 40 + x] = 1;
    }
    const r = matchTemplate(image, tpl, { minScale: 0.3, maxScale: 1.1 });
    expect(r).not.toBeNull();
    expect(r!.x).toBeGreaterThan(90);
    expect(r!.x).toBeLessThan(110);
    expect(r!.score).toBeGreaterThan(0.8);
  });

  it("小模板不会因为落在密集区就胜出", () => {
    // 图左下角是密集块，右上角是稀疏的同样大小的小块
    const w = 100;
    const h = 100;
    const image = createMask(w, h);
    for (let y = 50; y < 90; y += 1) {
      for (let x = 10; x < 50; x += 1) image.data[y * w + x] = 1;
    }
    for (let y = 10; y < 20; y += 1) {
      for (let x = 80; x < 90; x += 1) image.data[y * w + x] = 1;
    }
    const tpl = createMask(10, 10);
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) tpl.data[y * 10 + x] = 1;
    }
    const r = matchTemplate(image, tpl, { minScale: 0.9, maxScale: 1.1, coarseStep: 0.1, fineStep: 0.1 });
    expect(r).not.toBeNull();
    // 应当落在右上角那个小块，而不是左下角的大块
    expect(r!.x).toBeGreaterThan(70);
    expect(r!.y).toBeLessThan(30);
  });

  it("空模板返回 null", () => {
    const image = createMask(40, 40);
    const tpl = createMask(40, 40);
    expect(matchTemplate(image, tpl)).toBeNull();
  });
});

describe("cropToInk 后的模板仍能匹配", () => {
  it("模板带白边也不影响定位", () => {
    const tpl = createMask(40, 40);
    for (let y = 10; y < 20; y += 1) {
      for (let x = 10; x < 20; x += 1) tpl.data[y * 40 + x] = 1;
    }
    const cropped = cropToInk(tpl).mask;
    const resized = resizeMaskSmooth(cropped, 20, 20);
    expect(countInk(resized)).toBeGreaterThan(0);
  });
});
