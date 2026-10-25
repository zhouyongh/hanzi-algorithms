/**
 * 生成算法层的数据集（JSONL）。
 *
 * 产出五张表：
 * - `radicals.jsonl`     说文 540 部：部首编号、部首字、在各书体里的码位
 * - `decomposition.jsonl` 构件分解：现代字 → 结构符 + 构件路径下标
 * - `evolution.jsonl`    演变链：现代字 → 各书体字形 + 逐段笔画对应
 * - `metrics.jsonl`      字形度量：笔画数、外接框、重心、主方向
 * - `families.jsonl`     声族：共用同一声符的形声字聚成一族
 *
 * **这些表不入库**（`data/` 在 `.gitignore` 里）——它们是从字形派生的，
 * 性质与字形相同。仓库里只发布生成器与数据结构定义。
 *
 * 用法：
 *   node tools/build_data.ts
 *   node tools/build_data.ts --out data --limit 500
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveStructure } from "../src/structure/resolve.ts";
import { splitStrokes } from "../src/structure/strokes.ts";
import { analyzePhonetic } from "../src/teaching/phonetic.ts";
import { buildPhoneticFamilies, componentDescriptor } from "../src/teaching/family.ts";
import { correspondStrokes } from "../src/morph/correspond.ts";
import { normalizeGlyph } from "../src/morph/interpolate.ts";
import { boundsOf } from "../src/geometry/path.ts";
import { centroid } from "../src/geometry/sample.ts";
import { GlyphStore, loadSealRegistry, type Layer } from "./lib/store.ts";
import { REPO_ROOT } from "./lib/store.ts";

/**
 * 部首的**偏旁形**（笔画形状描述子），由 `tools/build_radical_forms.ts` 归纳。
 *
 * 有了它才能走**投票法**——实测投票法比模板法准（32.2% vs 23.3%），
 * 但只在归纳出了偏旁形的部上可用（覆盖 148/540 部），
 * 所以最终是「投票优先、判不出回退模板」。
 * 没归纳过就退化成纯模板法。
 */
const FORMS_PATH = join(REPO_ROOT, "assets", "index", "radical-forms.json");
const FORMS: Record<string, { types: string[]; coverage: number; chars: number }> =
  existsSync(FORMS_PATH) ? JSON.parse(readFileSync(FORMS_PATH, "utf8")) : {};

/** 演变链的书体次序（从古到今）。 */
const EVOLUTION_CHAIN: Layer[] = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];

function parseArgs(argv: string[]): { out: string; limit: number; start: number } {
  const out = { out: join(REPO_ROOT, "data"), limit: 0, start: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") out.out = argv[++i] ?? out.out;
    else if (argv[i] === "--limit") out.limit = Number(argv[++i] ?? 0);
    else if (argv[i] === "--start") out.start = Number(argv[++i] ?? 0);
  }
  return out;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const store = new GlyphStore();
  if (!store.has("seal")) {
    console.error("本地没有篆书字形。先跑：node tools/sync_glyphs.ts");
    process.exit(1);
  }
  mkdirSync(args.out, { recursive: true });

  const registry = loadSealRegistry();
  const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
  const seal = store.index("seal");

  // ── 1. 部首表 ──────────────────────────────────────────────────────
  const radicalByNo = new Map<number, { char: string; codepoints: string[]; count: number }>();
  for (const reg of registry) {
    const no = Number(reg.radicalNo);
    if (!Number.isFinite(no)) continue;
    const entry = radicalByNo.get(no) ?? { char: reg.modernChar, codepoints: [], count: 0 };
    entry.codepoints.push(reg.codepoint);
    entry.count += 1;
    radicalByNo.set(no, entry);
  }
  const radicalLines = [...radicalByNo.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([no, e]) =>
      JSON.stringify({
        radicalNo: no,
        system: "shuowen",
        char: e.char,
        codepoint: e.codepoints[0] ?? "",
        glyphPath: `assets/glyphs/seal/${e.codepoints[0] ?? ""}.svg`,
        coverage: e.count,
      }),
    );
  writeFileSync(join(args.out, "radicals.jsonl"), radicalLines.join("\n") + "\n", "utf8");
  console.log(`radicals.jsonl：${radicalLines.length} 条（说文 ${radicalByNo.size} 部）`);

  // ── 2/3/4. 逐字处理 ───────────────────────────────────────────────
  const decompositionLines: string[] = [];
  const evolutionLines: string[] = [];
  const metricLines: string[] = [];
  const familyInputs: Array<{
    char: string; semantic: string; side: string;
    descriptor: Uint8Array;
  }> = [];

  // limit = 0 表示「不限」。
  // 注意：--start 不带 --limit 时，结束下标必须是 undefined（切到末尾），
  // 写成 `start + (limit || undefined)` 会算出 NaN，slice(start, NaN) 切出空数组。
  const end = args.limit > 0
    ? (args.start > 0 ? args.start + args.limit : args.limit)
    : undefined;
  const targets = seal.rows
    .filter((r) => r.modernChar)
    .slice(args.start, end);
  let processed = 0;
  let located = 0;

  for (const row of targets) {
    const sealCp = row.codepoint || row.glyphId;
    const reg = regByCp.get(sealCp);
    const glyph = store.glyph("seal", row.file);
    if (!glyph) continue;

    // 度量
    const strokes = splitStrokes(glyph);
    const norm = normalizeGlyph(glyph, 200).glyph;
    const b = boundsOf(norm.paths.flatMap((p) => p.subpaths));
    const pts = norm.paths.flatMap((p) => p.subpaths.flat());
    const c = centroid(pts);
    metricLines.push(
      JSON.stringify({
        char: row.modernChar,
        script: "seal",
        strokes: strokes.length,
        bounds: {
          x: Number(b.x.toFixed(4)),
          y: Number(b.y.toFixed(4)),
          width: Number(b.width.toFixed(4)),
          height: Number(b.height.toFixed(4)),
        },
        centroid: { x: Number(c.x.toFixed(4)), y: Number(c.y.toFixed(4)) },
        mainAngle: Number((strokes[0]?.angle ?? 0).toFixed(4)),
      }),
    );

    // 构形分解
    if (reg) {
      const radicalCp = reg.radicalCp.split(" ")[0];
      const radicalRow = seal.byCodepoint(radicalCp);
      const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
      if (radicalGlyph) {
        // 投票优先、判不出回退模板（见 src/structure/resolve.ts）
        const forms = FORMS[reg.radicalNo];
        const resolved = resolveStructure(glyph, radicalGlyph, {
          radicalTypes: forms?.types ?? [],
        });
        if (resolved) {
          const m = resolved.match;
          const dec = resolved.decomposition;
          located += 1;
          const radicalChar = seal.byCodepoint(radicalCp)?.modernChar ?? "";
          const analysis = analyzePhonetic(dec, m, { radicalChar });
          decompositionLines.push(
            JSON.stringify({
              char: row.modernChar,
              script: "seal",
              structure: dec.structure,
              method: resolved.method,
              components: [
                { char: radicalChar, pathIndices: dec.radicalPathIndices },
                { char: "", pathIndices: dec.remainderPathIndices },
              ],
              confidence: Number(dec.confidence.toFixed(4)),
              verified: false,
            }),
          );
          // 形声分析结果单独记一份，并攒声族聚类的输入
          //
          // 只收**左右/上下**布局的：这些的「另一半」才是声符。包围结构
          // （⿵⿶⿷）的剩余部分是字芯，不是声符，收进来会把不相干的字聚成一族。
          const sideLayout = dec.structure === "⿰" || dec.structure === "⿲"
            || dec.structure === "⿱" || dec.structure === "⿳";
          if (analysis.isPhonoSemantic && sideLayout && dec.remainderPathIndices.length > 0) {
            familyInputs.push({
              char: row.modernChar,
              semantic: radicalChar,
              side: analysis.phonetic.side,
              descriptor: componentDescriptor(glyph, dec.remainderPathIndices),
            });
          }
        }
      }
    }

    // 演变链：找同字在各书体里的字形，并算相邻两段的笔画对应
    const chain: Layer[] = [];
    const paths: string[] = [];
    const glyphs: Array<ReturnType<typeof store.glyph>> = [];
    for (const layer of EVOLUTION_CHAIN) {
      if (!store.has(layer)) continue;
      const idx = store.index(layer);
      const r = idx.byChar(row.modernChar);
      if (!r) continue;
      const g = store.glyph(layer, r.file);
      if (!g) continue;
      chain.push(layer);
      paths.push(`assets/glyphs/${layer}/${r.file}`);
      glyphs.push(g);
    }
    if (chain.length >= 2) {
      const correspondences: Array<Array<{ from: number; to: number; overlap: number }>> = [];
      let confidenceSum = 0;
      for (let i = 0; i + 1 < glyphs.length; i += 1) {
        const a = glyphs[i];
        const b = glyphs[i + 1];
        if (!a || !b) continue;
        const corr = correspondStrokes(a, b);
        correspondences.push(
          corr.pairs.map((p) => ({
            from: p.from,
            to: p.to,
            overlap: Number(p.overlap.toFixed(4)),
          })),
        );
        confidenceSum += corr.confidence;
      }
      evolutionLines.push(
        JSON.stringify({
          char: row.modernChar,
          chain,
          glyphPaths: paths,
          correspondences,
          confidence: Number((confidenceSum / Math.max(1, correspondences.length)).toFixed(4)),
        }),
      );
    }

    processed += 1;
    if (processed % 50 === 0) process.stdout.write(`  已处理 ${processed}…\n`);
  }

  writeFileSync(join(args.out, "decomposition.jsonl"), decompositionLines.join("\n") + "\n", "utf8");
  writeFileSync(join(args.out, "evolution.jsonl"), evolutionLines.join("\n") + "\n", "utf8");
  writeFileSync(join(args.out, "metrics.jsonl"), metricLines.join("\n") + "\n", "utf8");

  // 声族：按声符形状聚类
  const families = buildPhoneticFamilies(familyInputs);
  const familyLines = families
    .filter((f) => f.size >= 2)
    .map((f) =>
      JSON.stringify({
        representative: f.representative,
        size: f.size,
        spread: f.spread,
        members: f.members.map((m) => ({ char: m.char, semantic: m.semantic, side: m.side })),
      }),
    );
  writeFileSync(join(args.out, "families.jsonl"), familyLines.join("\n") + "\n", "utf8");

  console.log(`处理 ${processed} 个字`);
  console.log(`decomposition.jsonl：${decompositionLines.length} 条（定位成功 ${located}）`);
  console.log(`evolution.jsonl：${evolutionLines.length} 条`);
  console.log(`metrics.jsonl：${metricLines.length} 条`);
  console.log(`families.jsonl：${familyLines.length} 族（参与聚类 ${familyInputs.length} 字，≥2 成员的族 ${familyLines.length}）`);
  console.log(`\n提示：data/ 不在版本库里（派生于字形）。刷新数据重跑本脚本即可。`);
}

main();
