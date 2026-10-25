/**
 * 构形分解的准确率评测（带人工标注的 IDS）。
 *
 * 标注取这些字公认的 IDS 结构（左右 / 上下 / 左上包围 / 全包围 / 独体），
 * 分组定义见 `tools/lib/labels.ts`。
 *
 * 用来回答三个问题：
 *   1. 现在判得准不准？（分「说文部首 ≠ 整字」的可分解字，这是头号指标）
 *   2. 改阈值、降阈值之后是变好还是变坏？
 *   3. 有多少字根本不在篆书层里（不能静默跳过——早期版本跳掉了 24 个字，
 *      分母是 46 而不是 70，样本还被系统性偏向左右与独体）。
 *
 * 用法：
 *   node tools/eval_structure.ts
 *   node tools/eval_structure.ts --method=template
 *   node tools/eval_structure.ts --sweep
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { LABELED, SELF_RADICAL, SELF_RADICAL_COMPOUND } from "./lib/labels.ts";
import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";
import type { Decomposition } from "../src/structure/decomposition.ts";

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
const seal = store.index("seal");

/** 路径阈值（可从命令行覆盖，用来扫参数）。 */
const thresholdArg = process.argv.find((a) => a.startsWith("--threshold="));
const THRESHOLD = thresholdArg ? Number(thresholdArg.split("=")[1]) : undefined;

/** 光栅取景：`ink` 用墨迹范围，`viewBox` 用 SVG 声明框。 */
const FRAME = (process.argv.find((a) => a.startsWith("--frame="))?.split("=")[1]) ?? "ink";

/** 定位方法：模板匹配 / 笔画类型投票。 */
const METHOD = (process.argv.find((a) => a.startsWith("--method="))?.split("=")[1]) ?? "vote";

/** 尺度搜索的各向异性上限（fx/fy 偏离 1 的最大倍数）。 */
const ANISO = (process.argv.find((a) => a.startsWith("--aniso="))?.split("=")[1]);
const MAX_ANISO = ANISO ? Number(ANISO) : undefined;

/** 尺度搜索区间。 */
const MIN_SCALE = (() => {
  const v = process.argv.find((a) => a.startsWith("--min-scale="))?.split("=")[1];
  return v ? Number(v) : undefined;
})();
const MAX_SCALE = (() => {
  const v = process.argv.find((a) => a.startsWith("--max-scale="))?.split("=")[1];
  return v ? Number(v) : undefined;
})();

/**
 * 投票法的形状距离容差。
 *
 * **不给就用库里的默认值**（`radical.ts` 的 `typeTolerance`）——
 * 评测台要量的是**库的真实默认行为**，自己另设一个默认值就会量偏
 * （早先这里写死 34，库里改成 38 之后评测数字与实际行为对不上）。
 */
const TOL = (() => {
  const v = process.argv.find((a) => a.startsWith("--tolerance="))?.split("=")[1];
  return v ? Number(v) : undefined;
})();

/** 部首偏旁形（从语料归纳而来）。 */
const FORMS_PATH = join(REPO_ROOT, "assets", "index", "radical-forms.json");
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(FORMS_PATH) ? JSON.parse(readFileSync(FORMS_PATH, "utf8")) : {};

/**
 * 跑一个字，返回判定结果或排除原因。
 *
 * 方法：
 * - `template`：只用模板匹配（拿部首的独立形态去匹配合体字）。
 * - `vote`：只用笔画形状投票（拿归纳出的偏旁形去比）。只在有偏旁形的部上可用。
 * - `both`：投票优先，**判不出就回退模板**——投票法覆盖的部只有 148/540，
 *   没有偏旁形的部只能靠模板。
 */
function runOne(char: string, expect: string, threshold?: number, frame = FRAME):
  | { kind: "ok" }
  | { kind: "wrong"; got: string }
  | { kind: "none" }
  | { kind: "excluded"; reason: string } {
  const row = seal.byChar(char);
  if (!row) return { kind: "excluded", reason: "篆书层里查不到这个字" };
  const cp = row.codepoint || row.glyphId;
  const reg = regByCp.get(cp);
  if (!reg) return { kind: "excluded", reason: "没有说文部登记" };
  const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
  if (!radicalRow) return { kind: "excluded", reason: `部首字形缺 ${reg.radicalCp}` };
  const glyph = store.glyph("seal", row.file);
  const radicalGlyph = store.glyph("seal", radicalRow.file);
  if (!glyph || !radicalGlyph) return { kind: "excluded", reason: "字形缺" };

  const forms = FORMS[reg.radicalNo];
  const hasVote = Boolean(forms && forms.types.length > 0);
  const opts: {
    frame: "ink" | "viewBox";
    maxAnisotropy?: number;
    minScale?: number;
    maxScale?: number;
  } = {
    frame: frame as "ink" | "viewBox",
  };
  if (MAX_ANISO !== undefined) opts.maxAnisotropy = MAX_ANISO;
  if (MIN_SCALE !== undefined) opts.minScale = MIN_SCALE;
  if (MAX_SCALE !== undefined) opts.maxScale = MAX_SCALE;

  const byTemplate = (): Decomposition | null => {
    const m = locateRadical(
      glyph,
      radicalGlyph,
      threshold === undefined ? opts : { ...opts, pathThreshold: threshold },
    );
    return m ? decompose(glyph, m, radicalGlyph) : null;
  };
  const byVote = (): Decomposition | null => {
    if (!hasVote || !forms) return null;
    const m = locateRadical(glyph, null, { ...opts, radicalTypes: forms.types, typeTolerance: TOL });
    return m ? decompose(glyph, m, radicalGlyph) : null;
  };

  let dec: Decomposition | null = null;
  if (METHOD === "vote") {
    dec = byVote();
  } else if (METHOD === "both") {
    // 与库里 `resolveStructure` 同一套逻辑：投票优先，判不出回退模板
    dec = byVote() ?? byTemplate();
  } else {
    dec = byTemplate();
  }
  if (!dec) return { kind: "none" };
  if (dec.structure === expect) return { kind: "ok" };
  return { kind: "wrong", got: dec.structure };
}

function evaluate(threshold?: number, frame: string = FRAME) {
  let ok = 0;
  let wrong = 0;
  let none = 0;
  // 注意：Node 原生跑 TS 是「只擦类型」模式，`new Map<string, number>()` 这种
  // 构造函数的类型参数擦不掉（会报语法错），只能写 `new Map()`。
  const confusion = new Map();
  const misses: string[] = [];
  // 评测之外被排除的字：**必须报出来**。
  const excluded: Array<{ char: string; reason: string }> = [];

  for (const [char, expect] of LABELED) {
    const r = runOne(char, expect, threshold, frame);
    if (r.kind === "excluded") { excluded.push({ char, reason: r.reason }); continue; }
    if (r.kind === "none") { none += 1; misses.push(`${char}(判不出)`); continue; }
    if (r.kind === "wrong") {
      wrong += 1;
      misses.push(`${char}: 期望${expect} 实得${r.got}`);
      const key = `${expect}→${r.got}`;
      confusion.set(key, (confusion.get(key) ?? 0) + 1);
      continue;
    }
    ok += 1;
    const key = `${expect}→${expect}`;
    confusion.set(key, (confusion.get(key) ?? 0) + 1);
  }

  // 组 B：说文部首就是整字 —— 平凡正确（算法只能给 ⿻），单列
  let selfOk = 0;
  let selfNone = 0;
  let selfExcluded = 0;
  for (const char of SELF_RADICAL) {
    const r = runOne(char, "⿻", threshold, frame);
    if (r.kind === "excluded") { selfExcluded += 1; continue; }
    if (r.kind === "none") { selfNone += 1; continue; }
    if (r.kind === "ok") selfOk += 1;
  }

  // 组 C：说文部首就是整字但 IDS 是合体 —— 前提不成立，不计入
  const compound: string[] = [];
  for (const [char, expect] of SELF_RADICAL_COMPOUND) {
    const r = runOne(char, expect, threshold, frame);
    if (r.kind === "excluded") { excluded.push({ char, reason: r.reason }); continue; }
    compound.push(`${char} 期望${expect} 实得${r.kind === "wrong" ? r.got : r.kind === "none" ? "判不出" : "⿻"}`);
  }

  return { ok, wrong, none, confusion, misses, excluded, selfOk, selfNone, selfExcluded, compound };
}

/** 扫参数模式：把各个阈值的结果排成一张表。 */
if (process.argv.includes("--sweep")) {
  console.log("取景   阈值   正确率   判错   判不出");
  for (const frame of ["ink", "viewBox"]) {
    for (const t of [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9]) {
      // 用解构而不是 `r.ok` 这种点访问：Node 原生跑 TS 是「只擦类型」模式，
      // `r.ok` 会被解析成「限定名类型」而报语法错。
      const { ok: okN, wrong: wrongN, none: noneN } = evaluate(t, frame);
      const total = okN + wrongN + noneN;
      const rate = ((okN / total) * 100).toFixed(1);
      console.log(`${frame.padEnd(7)} ${t.toFixed(2)}   ${rate}%   ${wrongN}   ${noneN}`);
    }
  }
  process.exit(0);
}

const { ok, wrong, none, confusion, misses, excluded, selfOk, selfNone, selfExcluded, compound } =
  evaluate(THRESHOLD);
const total = ok + wrong + none;
const thrText = THRESHOLD === undefined ? "默认" : String(THRESHOLD);
console.log(`构形分解评测（路径阈值 ${thrText}，取景 ${FRAME}，方法 ${METHOD}）`);
console.log("");
console.log(`【头号指标】可分解字（说文部首 ≠ 整字）：${total} 个`);
console.log(`  正确 ${ok}（${((ok / total) * 100).toFixed(1)}%）`);
console.log(`  判错 ${wrong}（${((wrong / total) * 100).toFixed(1)}%）`);
console.log(`  判不出 ${none}（${((none / total) * 100).toFixed(1)}%）`);
console.log("");
console.log(`【单列】说文部首就是整字：${SELF_RADICAL.length - selfExcluded} 个（平凡正确 ⿻）`);
console.log(`  判出 ⿻ ${selfOk}，判不出 ${selfNone}`);
console.log("");
console.log(`【不计入】说文部首就是整字、但 IDS 是合体（算法前提不成立）：`);
for (const c of compound) console.log(`  ${c}`);
if (excluded.length > 0) {
  console.log("");
  console.log(`【不计入】篆书层里没有可评的字形：${excluded.length} 个`);
  const byReason = new Map();
  for (const e of excluded) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
  for (const [reason, n] of byReason) console.log(`  ${n} 个：${reason}`);
  console.log(`  （${excluded.map((e) => e.char).join(" ")}）`);
}
console.log("");
console.log("混淆（期望→实得）：");
for (const [k, v] of [...confusion.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}  ${v}`);
}
if (process.env.SHOW_MISSES) {
  console.log("\n明细：");
  for (const m of misses) console.log("  " + m);
}
