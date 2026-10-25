/** 针对性检查：E2 描红评分能不能区分对错，E6 形似度是不是匹配太严。 */
import { GlyphStore } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import { evaluateTracing } from "../src/teaching/evaluate.ts";
import { buildTraceTemplate } from "../src/teaching/trace.ts";
import { compareGlyphs } from "../src/teaching/compare.ts";
import { splitStrokes } from "../src/structure/strokes.ts";

const store = new GlyphStore();
const seal = store.index("seal");

console.log("── E2：描红评分能不能区分对错 ──");
const oracle = store.index("oracle");
const tian = store.glyph("oracle", oracle.byChar("天")!.file)!;
const tpl = buildTraceTemplate(tian);

function svgOf(strokes: Array<Array<{ x: number; y: number }>>, vb: { x: number; y: number; width: number; height: number }, width: number): string {
  const paths = strokes.map((s) =>
    `<path d="M ${s.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}" ` +
    `fill="none" stroke="#111" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}">${paths.join("")}</svg>`;
}

const vb = tian.viewBox;
const strokeW = vb.width * 0.04;
const orig = tpl.strokes.map((s) => s.points);
console.log(`  范字各笔的点数：${orig.map((s) => s.length).join(", ")}`);

function report(label: string, strokes: Array<Array<{ x: number; y: number }>>): void {
  const r = evaluateTracing(tian, parseGlyphSvg(svgOf(strokes, vb, strokeW)), { resolution: 160 });
  console.log(`  ${label}：总分 ${(r.score * 100).toFixed(1)}  iou=${r.iou.toFixed(3)}  ` +
    `写对 ${r.correct}/${r.total}  最差第 ${r.worstStroke + 1} 笔（${r.strokes[r.worstStroke]?.score.toFixed(2)}）  ` +
    `多写 ${r.extraStrokes.length} 笔`);
}

report("原样描", orig);
// 找一条点数最多的笔画，截掉它的一半
let longest = 0;
orig.forEach((s, i) => { if (s.length > orig[longest].length) longest = i; });
console.log(`  最长的一笔是第 ${longest + 1} 笔（${orig[longest].length} 点）`);
const half = Math.max(2, Math.floor(orig[longest].length / 2));
const shortened = orig.map((s, i) => (i === longest ? s.slice(0, half) : s));
report(`第${longest + 1}笔只描 ${half}/${orig[longest].length} 点`, shortened);
// 把第 1 笔整体挪开 1/4 画布
const moved = orig.map((s, i) => (i === 0 ? s.map((p) => ({ x: p.x + vb.width * 0.3, y: p.y })) : s));
report("第1笔挪开 30% 画布", moved);
// 笔序颠倒
report("笔序颠倒", orig.slice().reverse());
// 只描 3 笔
report("只描前 3 笔", orig.slice(0, 3));

console.log("");
console.log("── E6：易混字对比是不是匹配太严 ──");
for (const [a, b] of [["日", "曰"], ["未", "末"], ["土", "士"], ["目", "且"], ["汩", "汨"]] as const) {
  const fa = seal.byChar(a)?.file;
  const fb = seal.byChar(b)?.file;
  if (!fa || !fb) { console.log(`  ${a}/${b} 缺`); continue; }
  const ga = store.glyph("seal", fa)!;
  const gb = store.glyph("seal", fb)!;
  const sa = splitStrokes(ga);
  const sb = splitStrokes(gb);
  const d = compareGlyphs(ga, gb);
  console.log(`  ${a}(${sa.length}笔) vs ${b}(${sb.length}笔)  形似 ${(d.similarity * 100).toFixed(1)}%  ` +
    `共有 ${d.pairs.length} 笔  ${a}多${d.onlyA.length} ${b}多${d.onlyB.length}`);
  console.log(`      ${d.summary}`);
}
