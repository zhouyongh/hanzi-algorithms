/**
 * 部首定位的实测评估台。
 *
 * 拿本地字形（assets/glyphs/）跑 A1 部首定位，打印每个字的判定结果，
 * 用来人工核验，也用来和 Python 原型对拍。
 *
 * 用法：
 *   node tools/eval_radical.ts                    # 跑内置样例集
 *   node tools/eval_radical.ts 投 指 持 控 想      # 跑指定字
 *   node tools/eval_radical.ts --limit 200        # 跑前 200 个字（批量体检）
 *   node tools/eval_radical.ts --confidence 0.7    # 只看置信度以上的
 */

import { locateRadical } from "../src/structure/radical.ts";
import { decompose } from "../src/structure/decomposition.ts";
import { GlyphStore, loadSealRegistry } from "./lib/store.ts";

const store = new GlyphStore();
const registry = loadSealRegistry();
const regByCp = new Map(registry.map((r) => [r.codepoint, r]));

/** 内置样例集：覆盖手部、日部、水部、心部、女部、言部、目部、木部等。 */
const SAMPLE = ["投", "指", "持", "控", "想", "好", "如", "河", "眼", "語", "明", "本"];

function parseArgs(argv: string[]): { chars: string[]; limit: number; minConfidence: number } {
  const out = { chars: [] as string[], limit: 0, minConfidence: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--limit") out.limit = Number(argv[++i] ?? 0);
    else if (a === "--confidence") out.minConfidence = Number(argv[++i] ?? 0);
    else if (!a.startsWith("-")) out.chars.push(a);
  }
  return out;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!store.has("seal")) {
    console.error("本地没有篆书字形。先跑：node tools/sync_glyphs.ts");
    process.exit(1);
  }

  const seal = store.index("seal");
  let targets: string[] = args.chars;
  if (targets.length === 0 && args.limit > 0) {
    // 批量体检：取前 N 个有说文部首登记的字
    const list: string[] = [];
    for (const row of seal.rows) {
      if (!row.modernChar) continue;
      const sealCp = row.codepoint || row.glyphId;
      const reg = regByCp.get(sealCp);
      if (reg?.radicalCp) list.push(row.modernChar);
      if (list.length >= args.limit) break;
    }
    targets = [...new Set(list)];
  } else if (targets.length === 0) {
    targets = SAMPLE;
  }

  console.log(
    `${"字".padEnd(4)}${"篆码位".padEnd(8)}${"说文部".padEnd(8)}${"命中路径".padEnd(12)}` +
    `${"ncc".padEnd(7)}${"prec".padEnd(7)}${"覆盖".padEnd(7)}${"尺度".padEnd(12)}${"结构"}`,
  );
  console.log("-".repeat(88));

  let hit = 0;
  let miss = 0;
  const t0 = Date.now();

  for (const ch of targets) {
    const row = seal.byChar(ch);
    if (!row) continue;
    const sealCp = row.codepoint || row.glyphId;
    const reg = regByCp.get(sealCp);
    if (!reg) continue;
    const radicalCp = reg.radicalCp.split(" ")[0];
    const radicalRow = seal.byCodepoint(radicalCp);
    if (!radicalRow) continue;

    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = store.glyph("seal", radicalRow.file);
    if (!glyph || !radicalGlyph) continue;

    const m = locateRadical(glyph, radicalGlyph);
    if (!m) {
      miss += 1;
      console.log(`${ch.padEnd(4)}${sealCp.padEnd(8)}第${reg.radicalNo.padEnd(6)}—（未给出结果）`);
      continue;
    }
    const dec = decompose(glyph, m);
    const picked = m.pathIndices.join(",");
    const all = m.perPath.map((p) => `${p.index}:${p.inside.toFixed(2)}`).join(" ");
    // 部首笔画挑不出来时构形说不出来，不硬猜
    const struct = dec ? `${dec.structure} ${dec.meaning}` : "（构形算不出）";
    console.log(
      `${ch.padEnd(4)}${sealCp.padEnd(8)}第${reg.radicalNo.padEnd(6)}` +
      `${picked.padEnd(12)}${m.score.toFixed(3).padEnd(7)}${m.coverage.toFixed(3).padEnd(7)}` +
      `${(m.iou ?? 0).toFixed(2).padEnd(7)}${`${m.fx.toFixed(2)}×${m.fy.toFixed(2)}`.padEnd(12)}` +
      `${struct}  [${all}]`,
    );
    if (m.score >= args.minConfidence) hit += 1;
    else miss += 1;
  }

  const ms = Date.now() - t0;
  console.log("-".repeat(88));
  console.log(`共 ${targets.length} 个字，用时 ${ms} ms（${(ms / Math.max(1, targets.length)).toFixed(0)} ms/字）`);
  if (args.minConfidence > 0) {
    console.log(`置信度 ≥ ${args.minConfidence}：${hit} 个；未达：${miss} 个`);
  }
}

main();
