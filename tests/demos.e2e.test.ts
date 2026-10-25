/**
 * 演示页数据流的端到端验证。
 *
 * 演示页做的事无非四步：取索引 → 取字形 → 跑算法 → 生成 SVG path 数据。
 * 这里在 Node 里把同样的四步跑一遍，确认演示页拿到的数据真的能出结果——
 * 比在浏览器里肉眼看更可靠（浏览器的 ES module 缓存与后台标签页限流会干扰观察）。
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGlyphSvg } from "../src/glyph.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";
import { splitStrokes } from "../src/structure/strokes.ts";
import { correspondStrokes, } from "../src/morph/correspond.ts";
import { interpolateGlyphs } from "../src/morph/interpolate.ts";
import { lishuTransform } from "../src/morph/lishu.ts";
import { layoutVertical, punctuationShift } from "../src/layout/vertical.ts";
import { layoutClassicPage } from "../src/layout/page.ts";
import { advance } from "../src/layout/advance.ts";
import { buildTraceTemplate } from "../src/teaching/trace.ts";
import { evaluateTracing } from "../src/teaching/evaluate.ts";
import { compareGlyphs } from "../src/teaching/compare.ts";
import { analyzePhonetic } from "../src/teaching/phonetic.ts";

const ROOT = join(import.meta.dirname, "..");
const ASSETS = join(ROOT, "assets");
const hasAssets = existsSync(join(ASSETS, "index", "seal.json"));

/** 演示页用的索引：{ 现代字: 文件名 }。 */
function loadIndex(layer: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ASSETS, "index", `${layer}.json`), "utf8"));
}

/** 演示页用的部首登记：{ 篆书码位: [部次, 部首码位, 部首字] }。 */
function loadRadicalIndex(): Record<string, [number, string, string]> {
  return JSON.parse(readFileSync(join(ASSETS, "index", "seal-radicals.json"), "utf8"));
}

function loadGlyph(layer: string, file: string) {
  return parseGlyphSvg(readFileSync(join(ASSETS, "glyphs", layer, file), "utf8"));
}

describe("单页浏览页（demos/index.html）", () => {
  const DEMOS = join(ROOT, "demos");

  it("是分 Tab 的单页：Tab 栏 + 面板 + 各算法页内嵌", () => {
    const html = readFileSync(join(DEMOS, "index.html"), "utf8");

    // Tab 栏
    expect(html).toContain('id="tabs"');
    expect(html).toContain('role="tablist"');
    // 面板（面板 id 由 tab id 拼出来；属性是 JS 对象字面量，不是 HTML 属性写法）
    expect(html).toContain('role: "tabpanel"');
    expect(html).toContain('"panel-" + t.id');
    // 每个算法页都作为一个 Tab 内嵌（带 embed=1，演示页据此隐藏自己的导航）
    const frames = [...html.matchAll(/src:\s*"(\.\/[^"]+\.html)"/g)].map((m) => m[1]);
    expect(frames.length).toBe(7);
    for (const f of frames) {
      expect(existsSync(join(DEMOS, f.replace("./", ""))), `${f} 指向的演示页不存在`).toBe(true);
    }
    // 内嵌时带 embed=1
    expect(html).toContain('"?embed=1"');
  });

  it("演示子集只收已公开的书体层（傳抄 / 楚简 上游未发布，不随库发）", () => {
    // 这两层只在作者本地的全量分支上，上游公开仓还没有；子集收进来就等于提前发布。
    expect(existsSync(join(DEMOS, "glyphs", "chu")), "楚简层不该进演示子集").toBe(false);
    expect(existsSync(join(DEMOS, "glyphs", "chuanchao")), "傳抄层不该进演示子集").toBe(false);
    expect(existsSync(join(DEMOS, "data", "index", "chu.json")), "楚简索引不该进演示子集").toBe(false);
    expect(existsSync(join(DEMOS, "data", "index", "chuanchao.json")), "傳抄索引不该进演示子集").toBe(false);

    // 字形目录与索引一一对应（多一份索引却没有字形，演示页会取空）
    const glyphLayers = readdirSync(join(DEMOS, "glyphs"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const indexLayers = readdirSync(join(DEMOS, "data", "index"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(indexLayers).toEqual(glyphLayers);
  });

  it("七个算法一个不少", () => {
    const html = readFileSync(join(DEMOS, "index.html"), "utf8");
    for (const id of ["radical", "stroke", "evolution", "lishu", "vertical", "lab", "trace"]) {
      expect(html, `少了 ${id} 这个 Tab`).toContain(`id: "${id}"`);
    }
  });

  it("演示页支持嵌入模式（隐藏页内导航）", () => {
    const demoJs = readFileSync(join(DEMOS, "lib", "demo.js"), "utf8");
    expect(demoJs).toContain("embed");
    const css = readFileSync(join(DEMOS, "lib", "demo.css"), "utf8");
    expect(css).toContain("body.embed");
  });

  it("演示页的导航指向单页浏览页的对应 Tab", () => {
    const files = [
      ["01-radical.html", "radical"],
      ["02-stroke.html", "stroke"],
      ["03-evolution.html", "evolution"],
      ["04-lishu.html", "lishu"],
      ["05-vertical.html", "vertical"],
      ["06-lab.html", "lab"],
      ["07-trace.html", "trace"],
    ] as const;
    for (const [file, id] of files) {
      const html = readFileSync(join(DEMOS, file), "utf8");
      expect(html, `${file} 的导航应指向 #${id}`).toContain(`./index.html#${id}`);
    }
  });
});

describe.skipIf(!hasAssets)("演示页数据流", () => {
  it("01 部首定位：取索引 → 取字形 → 定位 → 高亮", () => {
    const index = loadIndex("seal");
    const radicals = loadRadicalIndex();
    const file = index["投"];
    expect(file).toBeTruthy();
    const cp = file.replace(/\.svg$/, "");
    const reg = radicals[cp];
    expect(reg).toBeTruthy();
    expect(reg[0]).toBe(441);

    const glyph = loadGlyph("seal", file);
    const radicalGlyph = loadGlyph("seal", `${reg[1]}.svg`);
    const match = locateRadical(glyph, radicalGlyph);
    expect(match).toBeTruthy();
    expect(match!.pathIndices).toEqual([0]);
    expect(decompose(glyph, match!, radicalGlyph).structure).toBe("⿰");
  });

  it("02 笔画动画：甲骨骨架逐笔分离，顺序即笔顺", () => {
    const index = loadIndex("oracle");
    const file = index["天"];
    expect(file).toBeTruthy();
    const glyph = loadGlyph("oracle", file);
    const strokes = splitStrokes(glyph);
    expect(strokes.length).toBeGreaterThan(1);
    expect(strokes.every((s) => s.kind === "skeleton")).toBe(true);
    // 每条笔画都是折线（有多个点），能直接做书写动画
    expect(strokes.every((s) => s.points.length >= 2)).toBe(true);
  });

  it("03 字形演变：甲骨→金文→篆→隶→傳抄→楚简 逐段可对应", () => {
    const layers = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];
    const chain: Array<[string, ReturnType<typeof loadGlyph>]> = [];
    for (const layer of layers) {
      const index = loadIndex(layer);
      const file = index["日"];
      if (!file) continue;
      chain.push([layer, loadGlyph(layer, file)]);
    }
    expect(chain.length).toBeGreaterThanOrEqual(4);

    for (let i = 0; i + 1 < chain.length; i += 1) {
      const corr = correspondStrokes(chain[i][1], chain[i + 1][1]);
      expect(corr.pairs.length).toBeGreaterThan(0);
    }
    // 首尾插值必须得到合法（非空）字形
    const mid = interpolateGlyphs(chain[0][1], chain[chain.length - 1][1], 0.5, { samples: 64 });
    expect(mid.paths.length).toBeGreaterThan(0);
    expect(mid.paths.every((p) => (p.subpaths[0]?.length ?? 0) >= 2)).toBe(true);
    // 配对上的笔画插值后应当是足够密的轮廓
    expect(mid.paths.some((p) => (p.subpaths[0]?.length ?? 0) > 8)).toBe(true);
  });

  it("04 隶变算法：输出仍是合法路径", () => {
    const index = loadIndex("seal");
    const glyph = loadGlyph("seal", index["明"]);
    const out = lishuTransform(glyph, { simplifyTolerance: 8, waveTail: true, waveAmplitude: 12 });
    expect(out.paths.length).toBe(glyph.paths.length);
    expect(out.paths.every((p) => p.subpaths[0]?.length >= 2)).toBe(true);
  });

  it("05 竖排版式：字格落位 + 标点悬挂 + 古籍版式", () => {
    const cells = layoutVertical("天地玄黄，宇宙洪荒。日月", {
      charSize: 34, charGap: 2, lineGap: 14, rowsPerColumn: 4,
    });
    expect(cells.length).toBe(12);
    // 列从右往左：第 0 列的 x 应当大于第 1 列
    expect(cells[0].x).toBeGreaterThan(cells[4].x);
    expect(cells[0].column).toBe(0);
    expect(cells[4].column).toBe(1);
    // 标点要移到右上角
    const comma = cells.find((c) => c.char === "，");
    expect(comma?.punctuation).toBe(true);
    const shift = punctuationShift("，", 34);
    expect(shift).toBeTruthy();
    expect(shift!.dx).toBeGreaterThan(0);
    expect(shift!.dy).toBeLessThan(0);

    const page = layoutClassicPage({
      leafWidth: 152, leafHeight: 508, columns: 3, rowsPerColumn: 4,
    });
    expect(page.columns.length).toBe(3);
    expect(page.columnRules.length).toBe(2);
    expect(page.fishtails.length).toBe(2);

    const steps = advance(12, { charSize: 34, rowsPerColumn: 4 });
    expect(steps.length).toBe(12);
    expect(steps[0].columnStart).toBe(true);
    expect(steps[4].columnStart).toBe(true);
    expect(steps[4].column).toBe(1);
  });

  it("06 教学实验室：五种算法都能出结果", () => {
    const index = loadIndex("seal");
    const radicals = loadRadicalIndex();
    const file = index["明"];
    const cp = file.replace(/\.svg$/, "");
    const reg = radicals[cp];
    const glyph = loadGlyph("seal", file);
    const radicalGlyph = loadGlyph("seal", `${reg[1]}.svg`);
    const match = locateRadical(glyph, radicalGlyph);
    expect(match).toBeTruthy();
    expect(decompose(glyph, match!, radicalGlyph).structure).toBeTruthy();
    expect(splitStrokes(glyph).length).toBeGreaterThan(0);
    expect(lishuTransform(glyph).paths.length).toBeGreaterThan(0);
    expect(layoutVertical("明", { charSize: 34 }).length).toBe(1);
  });

  it("07 描红练习：底本 → 学生笔迹 → 评分", () => {
    const index = loadIndex("oracle");
    const glyph = loadGlyph("oracle", index["天"]);

    // 底本
    const tpl = buildTraceTemplate(glyph);
    expect(tpl.kind).toBe("skeleton");
    expect(tpl.strokes.length).toBe(6);
    expect(tpl.order).toEqual([0, 1, 2, 3, 4, 5]);

    // 学生原样描一遍 → 满分
    const perfect = evaluateTracing(glyph, glyph);
    expect(perfect.iou).toBeGreaterThan(0.9);
    expect(perfect.correct).toBe(perfect.total);

    // 描歪一笔 → 那一笔分数掉下来
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${glyph.viewBox.x} ${glyph.viewBox.y} ${glyph.viewBox.width} ${glyph.viewBox.height}">`
      + `<path d="M 6 4 L 21 4" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 14 4 L 14 19 L 10 21 L 6 32" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 14 19 L 17 22 L 17 33" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 14 11 L 4 19" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 14 11 L 24 18" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 9 11 L 9 26" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 5 9 L 5 22" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `<path d="M 5 15 L 8 21" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>`
      + `</svg>`;
    const attempt = parseGlyphSvg(svg);
    const scored = evaluateTracing(glyph, attempt);
    expect(scored.total).toBe(6);
    expect(scored.strokes.length).toBe(6);
    expect(scored.worstStroke).toBeGreaterThanOrEqual(0);
  });
});
