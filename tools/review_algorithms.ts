/**
 * 逐算法过审：把每个算法在**真实字形**上的实际输出打出来，供人判断效果。
 *
 * 这不是评测（评测有 `tools/eval_structure.ts` 那种带标注的准确率），
 * 而是「挨个看一眼这个算法到底吐了什么」——演示页上看归看，
 * 但演示页是逐个交互的，这里一次跑完，能横向对比。
 *
 * 用法：node tools/review_algorithms.ts [A1 A2 ...]
 *       不带参数就全过一遍。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { resolveStructure } from "../src/structure/resolve.ts";
import { splitStrokes } from "../src/structure/strokes.ts";
import { correspondStrokes } from "../src/morph/correspond.ts";
import { interpolateGlyphs } from "../src/morph/interpolate.ts";
import { lishuTransform } from "../src/morph/lishu.ts";
import { layoutVertical, punctuationShift } from "../src/layout/vertical.ts";
import { layoutClassicPage } from "../src/layout/page.ts";
import { advance } from "../src/layout/advance.ts";
import { buildTraceTemplate } from "../src/teaching/trace.ts";
import { evaluateTracing } from "../src/teaching/evaluate.ts";
import { compareGlyphs } from "../src/teaching/compare.ts";
import { analyzePhonetic } from "../src/teaching/phonetic.ts";
import { buildPhoneticFamilies, componentDescriptor } from "../src/teaching/family.ts";
import { strokeStats, checkStrokeOrder } from "../src/teaching/stats.ts";
import { GlyphIndex } from "../src/teaching/search.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import type { Layer } from "./lib/store.ts";

const ASSETS = join(REPO_ROOT, "assets");
// GlyphStore / loadSealRegistry 的根是 assets/glyphs（不是 assets）
const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

const FORMS_PATH = join(ASSETS, "index", "radical-forms.json");
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(FORMS_PATH) ? JSON.parse(readFileSync(FORMS_PATH, "utf8")) : {};

const only = process.argv.slice(2);
const want = (id: string): boolean => only.length === 0 || only.includes(id);

function loadGlyph(layer: Layer, file: string) {
  return store.glyph(layer, file);
}

function head(title: string): void {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
}

// ── A1/A2 部首定位 + 构形 ───────────────────────────────
if (want("A1") || want("A2")) {
  head("A1 部首定位 / A2 构形分解");
  const chars = ["投", "指", "河", "眼", "明", "想", "好", "如", "國", "問", "語", "品"];
  for (const char of chars) {
    const row = seal.byChar(char);
    if (!row) { console.log(`${char}  篆书层里没有`); continue; }
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
    const glyph = loadGlyph("seal", row.file);
    const radicalGlyph = radicalRow ? loadGlyph("seal", radicalRow.file) : null;
    if (!glyph || !radicalGlyph || !reg) { console.log(`${char}  缺字形/登记`); continue; }

    const forms = FORMS[reg.radicalNo];
    const resolved = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
    });
    if (!resolved) {
      const tpl = locateRadical(glyph, radicalGlyph);
      console.log(`${char}  第${reg.radicalNo}部(${radicalRow?.modernChar ?? "?"})  判不出` +
        `  [模板法 ${tpl ? `路径[${tpl.pathIndices}] ncc=${tpl.score.toFixed(2)}` : "也判不出"}]`);
      continue;
    }
    const m = resolved.match;
    const d = resolved.decomposition;
    const radChar = radicalRow?.modernChar ?? "?";
    console.log(
      `${char}  第${reg.radicalNo}部(${radChar})  ` +
      `路径[${m.pathIndices.join(",")}]  ncc=${m.score.toFixed(3)}  ` +
      `覆盖=${(m.coverage * 100).toFixed(0)}%  ` +
      `构形=${d.structure} ${d.meaning}  部首在${d.radicalSide}  ` +
      `走的是${resolved.method === "vote" ? "投票法" : "模板法"}`,
    );
  }
}

// ── A3 笔画切分 ─────────────────────────────────────────
if (want("A3")) {
  head("A3 笔画切分");
  for (const [layer, char] of [["oracle", "天"], ["oracle", "日"], ["seal", "明"], ["seal", "投"], ["bronze", "車"]] as const) {
    const file = store.index(layer).byChar(char)?.file;
    if (!file) { console.log(`${layer}/${char} 没有`); continue; }
    const glyph = loadGlyph(layer, file);
    if (!glyph) continue;
    const strokes = splitStrokes(glyph);
    const total = strokes.reduce((s, x) => s + x.length, 0);
    console.log(`${layer}/${char}  ${strokes.length} 笔  总长 ${total.toFixed(1)}  ` +
      `类型 ${strokes[0]?.kind ?? "—"}  笔画长 [${strokes.map((s) => s.length.toFixed(0)).join(", ")}]`);
  }
}

// ── C1 字形演变 ─────────────────────────────────────────
if (want("C1")) {
  head("C1 跨书体对应与形变");
  const LAYERS: Layer[] = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];
  for (const char of ["日", "月", "山", "水", "目", "木"]) {
    const chain: Array<[Layer, NonNullable<ReturnType<typeof loadGlyph>>]> = [];
    for (const layer of LAYERS) {
      const file = store.index(layer).byChar(char)?.file;
      if (!file) continue;
      const g = loadGlyph(layer, file);
      if (g) chain.push([layer, g]);
    }
    if (chain.length < 2) { console.log(`${char}  只有 ${chain.length} 种书体`); continue; }
    const links = chain.slice(0, -1).map(([, g], i) => {
      const c = correspondStrokes(g, chain[i + 1][1]);
      return `${chain[i][0]}→${chain[i + 1][0]}: ${c.pairs.length}对/${c.confidence.toFixed(2)}`;
    });
    const mid = interpolateGlyphs(chain[0][1], chain[chain.length - 1][1], 0.5, { samples: 96 });
    console.log(`${char}  链 ${chain.map(([l]) => l).join("→")}`);
    console.log(`     ${links.join("  ")}  中间态 ${mid.paths.length} 条路径`);
  }
}

// ── C2 隶变 ─────────────────────────────────────────────
if (want("C2")) {
  head("C2 隶变算法");
  const countPts = (g: { paths: Array<{ subpaths: Array<Array<{ x: number; y: number }>> }> }) =>
    g.paths.reduce((s, p) => s + p.subpaths.reduce((t, sp) => t + sp.length, 0), 0);
  for (const char of ["明", "日", "大", "山", "川"]) {
    const file = seal.byChar(char)?.file;
    if (!file) continue;
    const glyph = loadGlyph("seal", file);
    if (!glyph) continue;
    const out = lishuTransform(glyph, {
      simplifyTolerance: 3, waveTail: true, waveAmplitude: 12,
      levelAndStraight: true, axisSnapAngle: (20 * Math.PI) / 180,
    });
    const a = countPts(glyph);
    const b = countPts(out);
    console.log(`${char}  笔画 ${glyph.paths.length} → ${out.paths.length}  ` +
      `点数 ${a} → ${b}（简化 ${((1 - b / a) * 100).toFixed(0)}%）  ` +
      `墨迹范围 x[${out.bounds.x.toFixed(0)},${(out.bounds.x + out.bounds.width).toFixed(0)}] ` +
      `y[${out.bounds.y.toFixed(0)},${(out.bounds.y + out.bounds.height).toFixed(0)}]`);
  }
}

// ── D1/D2/D3 竖排版式 ────────────────────────────────────
if (want("D1") || want("D2") || want("D3")) {
  head("D1/D2/D3 竖排与古籍版式");
  const text = "天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。";
  const cells = layoutVertical(text, { charSize: 34, charGap: 2, lineGap: 14, rowsPerColumn: 12 });
  const puncts = cells.filter((c) => c.punctuation);
  const cols = (cells[cells.length - 1]?.column ?? 0) + 1;
  const steps = advance(cells.length, { charSize: 34, charGap: 2, lineGap: 14, rowsPerColumn: 12 });
  const shift = punctuationShift("，", 34);
  const page = layoutClassicPage({ leafWidth: 152, leafHeight: 508, columns: 3, rowsPerColumn: 4 });
  console.log(`字 ${cells.length}  列 ${cols}  每列 12  标点 ${puncts.length} 个（${puncts.map((c) => c.char).join("")}）`);
  console.log(`标点悬挂：， → dx=${shift?.dx} dy=${shift?.dy}  （竖排时点号应在右上角：dx>0 且 dy<0）`);
  console.log(`行款推进：${steps.length} 步，列首 ${steps.filter((s) => s.columnStart).length} 次`);
  console.log(`古籍版式：版框 ${page.frame.width.toFixed(0)}×${page.frame.height.toFixed(0)}  ` +
    `界行 ${page.columnRules.length}  鱼尾 ${page.fishtails.length}  ` +
    `版心 ${page.banxin.width.toFixed(0)}×${page.banxin.height.toFixed(0)}`);
  // 列序：最右列是第 0 列
  const col0 = cells.filter((c) => c.column === 0);
  const col1 = cells.filter((c) => c.column === 1);
  console.log(`列序检查：第0列 x=${col0[0]?.x}  第1列 x=${col1[0]?.x}  ` +
    `（列从右往左 → 第0列 x 应当更大）`);
}

// ── E1/E2 描红 ──────────────────────────────────────────
if (want("E1") || want("E2")) {
  head("E1/E2 描红底本与评分");
  const file = store.index("oracle").byChar("天")?.file;
  if (file) {
    const glyph = loadGlyph("oracle", file);
    if (glyph) {
      const tpl = buildTraceTemplate(glyph);
      console.log(`底本：${tpl.strokes.length} 笔  类型 ${tpl.kind}  顺序 [${tpl.order.join(",")}]`);
      const perfect = evaluateTracing(glyph, glyph);
      console.log(`原样描一遍：总分 ${(perfect.score * 100).toFixed(1)}  iou=${perfect.iou.toFixed(3)}  ` +
        `写对 ${perfect.correct}/${perfect.total}  多写 ${perfect.extraStrokes.length} 笔`);
      // 描歪一笔
      const vb = glyph.viewBox;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}">` +
        tpl.strokes.map((s, i) => {
          const jitter = i === 0 ? ` transform="rotate(25 ${s.points[0]?.x ?? 0} ${s.points[0]?.y ?? 0})"` : "";
          return `<path d="M ${s.points.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" L ")}" ` +
            `fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"${jitter}/>`;
        }).join("") + "</svg>";
      const bad = evaluateTracing(glyph, parseGlyphSvg(svg));
      console.log(`描歪第 1 笔：总分 ${(bad.score * 100).toFixed(1)}  iou=${bad.iou.toFixed(3)}  ` +
        `写对 ${bad.correct}/${bad.total}  最差第 ${bad.worstStroke + 1} 笔 ` +
        `（得分 ${bad.strokes[bad.worstStroke]?.score.toFixed(2)}）`);
    }
  }
}

// ── E4 形声分析 ─────────────────────────────────────────
if (want("E4")) {
  head("E4 形声分析");
  for (const char of ["投", "河", "清", "姐", "想", "息", "語", "明"]) {
    const row = seal.byChar(char);
    if (!row) continue;
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    const radicalRow = seal.byCodepoint(reg?.radicalCp.split(" ")[0] ?? "");
    const glyph = loadGlyph("seal", row.file);
    const radicalGlyph = radicalRow ? loadGlyph("seal", radicalRow.file) : null;
    if (!glyph || !radicalGlyph || !reg) continue;
    const forms = FORMS[reg.radicalNo];
    const resolved = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
    });
    if (!resolved) { console.log(`${char}  判不出`); continue; }
    const a = analyzePhonetic(resolved.decomposition, resolved.match, {
      radicalChar: radicalRow?.modernChar ?? "",
    });
    console.log(`${char}  部首「${radicalRow?.modernChar ?? "?"}」  ` +
      `形符在${a.semantic.side}  声符在${a.phonetic.side}  ` +
      `置信 ${a.confidence.toFixed(2)}  ${a.isPhonoSemantic ? "判为形声" : "非形声结构"}`);
  }
}

// ── E5 笔画统计 ─────────────────────────────────────────
if (want("E5")) {
  head("E5 笔画统计");
  for (const [layer, char] of [["oracle", "天"], ["seal", "明"], ["seal", "投"]] as const) {
    const file = store.index(layer).byChar(char)?.file;
    if (!file) continue;
    const glyph = loadGlyph(layer, file);
    if (!glyph) continue;
    const st = strokeStats(glyph);
    const strokes = splitStrokes(glyph);
    const order = checkStrokeOrder(glyph, strokes.map((_, i) => i));
    console.log(`${layer}/${char}  ${st.count} 笔  总长 ${st.totalLength.toFixed(1)}  ` +
      `最长 ${st.longestLength.toFixed(1)}  均长 ${st.meanLength.toFixed(1)}  ` +
      `方向分布 [${st.directionHistogram.join(",")}]  ` +
      `笔顺检查 ${order.ok ? "连贯" : `第 ${order.suspectIndex + 1} 笔可疑：${order.reason}`}`);
  }
}

// ── E6 易混字对比 ───────────────────────────────────────
if (want("E6")) {
  head("E6 易混字对比");
  for (const [a, b] of [["未", "末"], ["日", "曰"], ["土", "士"], ["己", "已"], ["汩", "汨"]] as const) {
    const fa = seal.byChar(a)?.file;
    const fb = seal.byChar(b)?.file;
    if (!fa || !fb) { console.log(`${a}/${b} 缺`); continue; }
    const ga = loadGlyph("seal", fa);
    const gb = loadGlyph("seal", fb);
    if (!ga || !gb) continue;
    const d = compareGlyphs(ga, gb);
    console.log(`${a} vs ${b}  形似 ${(d.similarity * 100).toFixed(1)}%  ` +
      `共有 ${d.pairs.length} 笔  ${a}多${d.onlyA.length}  ${b}多${d.onlyB.length}  ` +
      `—— ${d.summary}`);
  }
}

// ── E7 声族 ─────────────────────────────────────────────
if (want("E7")) {
  head("E7 声族聚合");
  const inputs: Array<{ char: string; semantic: string; side: string; descriptor: Uint8Array }> = [];
  let n = 0;
  for (const row of seal.rows) {
    if (!row.modernChar) continue;
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    if (!reg) continue;
    const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
    const glyph = loadGlyph("seal", row.file);
    const radicalGlyph = radicalRow ? loadGlyph("seal", radicalRow.file) : null;
    if (!glyph || !radicalGlyph) continue;
    const forms = FORMS[reg.radicalNo];
    const resolved = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
    });
    if (!resolved) continue;
    const d = resolved.decomposition;
    if (d.structure !== "⿰" && d.structure !== "⿲" && d.structure !== "⿱" && d.structure !== "⿳") continue;
    if (d.remainderPathIndices.length === 0) continue;
    inputs.push({
      char: row.modernChar,
      semantic: radicalRow?.modernChar ?? "",
      side: "right",
      descriptor: componentDescriptor(glyph, d.remainderPathIndices),
    });
    n += 1;
    if (n >= 600) break;
  }
  const fams = buildPhoneticFamilies(inputs);
  const sizes = fams.map((f) => f.size);
  console.log(`参与聚类 ${inputs.length} 字  族 ${fams.length} 个  ` +
    `最大族 ${Math.max(0, ...sizes)}  中位 ${sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] ?? 0}`);
  for (const f of fams.slice(0, 8)) {
    console.log(`  ${f.size} 笔成员：${f.members.map((m) => m.char).slice(0, 14).join("")}  ` +
      `（语义部 ${[...new Set(f.members.map((m) => m.semantic))].join("、")}）`);
  }
}

// ── E3 字表检索 ─────────────────────────────────────────
if (want("E3")) {
  head("E3 字表检索");
  // 用派生数据里的构形与笔画数建索引
  const entries: Array<{ char: string; script: "seal"; strokes: number; radicalNo?: number; structure?: string }> = [];
  try {
    for (const line of readFileSync(join(REPO_ROOT, "data", "decomposition.jsonl"), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      entries.push({
        char: r.char, script: "seal", strokes: 0,
        radicalNo: undefined, structure: r.structure,
      });
    }
  } catch { /* 没有派生数据就只用最小索引 */ }
  const idx = new GlyphIndex(entries as never);
  console.log(`索引 ${idx.size} 条  部首数 ${idx.radicalNumbers().length}  结构符 ${idx.structures().join("")}`);
  const byStruct = idx.byStructure("⿰");
  console.log(`按结构符 ⿰ 查：${byStruct.length} 条  ${byStruct.slice(0, 20).map((e) => e.char).join("")}`);
  const one = idx.byChar("投");
  console.log(`按字「投」查：${one.length} 条  ${JSON.stringify(one[0] ?? {})}`);
}
