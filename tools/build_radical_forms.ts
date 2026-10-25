/**
 * 从语料里自动归纳「部首偏旁形」——按**笔画类型投票**。
 *
 * ## 为什么需要它
 *
 * 部首字的**独立形态**和在合体字里的**偏旁形态**常常不一样：
 * 「水」独立是中间一竖两边四点，作左偏旁时是三条竖波浪线（氵）。
 * 而且篆书是**摹本**——同一个偏旁在不同字里的写法并不完全一样。
 * 所以拿独立形态当模板去匹配合体字，匹配必然落在错的地方
 * （实测「河」的部首定位偏到字的中部，构形准确率只有 37%）。
 *
 * ## 怎么归纳
 *
 * 同一个说文部下的所有字，**共有**的那几笔就是部首的偏旁形——
 * 声符、其余构件每个字都不一样，不会反复出现。
 *
 * 1. 每个字的每条路径算一个**与位置无关**的形状描述子
 *    （按自身外接框归一化的 12×12 位图 + 长宽比桶）；
 * 2. 把该部所有描述子按相似度聚类；
 * 3. 统计每个簇出现在**多少个不同的字**里；
 * 4. 出现率过半的簇 = 部首的偏旁笔画类型。
 *
 * 运行时不需要再匹配模板：把目标字的每条路径的描述子跟部首类型比一下，
 * 像就是部首笔画。**摹本的出入由描述子的容差吸收。**
 *
 * 产出 `assets/index/radical-forms.json`（本地文件，不入库）：
 *   { "部次": { "types": ["长宽比|位图", …], "coverage": 0.82, "chars": 37 } }
 *
 * 用法：node tools/build_radical_forms.ts [--min-chars 6] [--coverage 0.5] [--cluster 26]
 *       [--out=<路径>]   ← 写到别处（做参数扫描时不覆盖正在用的那份）
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { inkViewBox } from "../src/glyph.ts";
import { countInk, rasterizeGlyph } from "../src/raster/mask.ts";
import {
  describeMask, descriptorDistance, type Descriptor,
} from "../src/structure/descriptor.ts";

const WORK_SIZE = 64;

function arg(name: string, dflt: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : dflt;
}

const MIN_CHARS = arg("min-chars", 6);
const COVERAGE = arg("coverage", 0.5);
const CLUSTER = arg("cluster", 26);
/**
 * 每个部最多收几个代表。
 *
 * 码本现在**路径级与子路径级混收**（部首在字里的粒度不统一），
 * 名额给到 8 才够放下一个占两条路径的部首。
 */
const MAX_TYPES = arg("max-types", 6);
/**
 * 部首自身笔画的名额上限。
 *
 * 它们是**补充**，不是主角——独立形态在「水」这类部上恰恰是不可靠的那个，
 * 给多了会把声符也拉进来。
 */
const MAX_RADICAL_TYPES = arg("max-radical-types", 4);

function main(): void {
  const store = new GlyphStore();
  const registry = loadSealRegistry();
  const seal = store.index("seal");

  // 键 = 部首码位，值 = 复合字码位
  const byRadical = new Map<string, string[]>();
  const radicalNoOf = new Map<string, string>();
  for (const reg of registry) {
    const radicalCp = reg.radicalCp.split(" ")[0];
    if (!radicalCp || !reg.codepoint) continue;
    const list = byRadical.get(radicalCp) ?? [];
    list.push(reg.codepoint);
    byRadical.set(radicalCp, list);
    radicalNoOf.set(radicalCp, reg.radicalNo);
  }

  const out: Record<string, { types: string[]; coverage: number; chars: number }> = {};
  let done = 0;
  let skipped = 0;

  for (const [radicalCp, cps] of byRadical) {
    if (cps.length < MIN_CHARS) { skipped += 1; continue; }

    // 每个字：每条路径的描述子（路径级）**与每条子路径的描述子**（子路径级）
    //
    // 为什么只收路径级：部首在字里的**粒度不统一**——「語」的「言」横跨路径 0 与路径 3，
    // 而别的字里「言」是一条路径里的若干子路径。子路径级也收的话，
    // 候选描述子会翻几倍，而覆盖判据是 O(候选 × 字 × 笔画)，
    // **实测构建从 106 秒涨到约 30 分钟**——不可接受。
    // 「言」顶上那一横的问题改用另一条路解决：把**部首自身字形**的笔画收进来（见下）。
    const perChar = new Map<string, Descriptor[]>();
    for (const cp of cps) {
      const row = seal.byCodepoint(cp);
      if (!row) continue;
      const glyph = store.glyph("seal", row.file);
      if (!glyph) continue;
      const vb = inkViewBox(glyph);
      const descs: Descriptor[] = [];
      for (const p of glyph.paths) {
        const pm = rasterizeGlyph(p.subpaths, { width: WORK_SIZE, height: WORK_SIZE, viewBox: vb });
        if (countInk(pm) === 0) continue;
        descs.push(describeMask(pm));
      }
      if (descs.length > 0) perChar.set(cp, descs);
    }
    if (perChar.size < MIN_CHARS) { skipped += 1; continue; }

    // ── 部首自身的笔画：也收进码本 ──────────────────────────────
    //
    // 「言」顶上那一横在语料里很少单独成路径，覆盖度上不去，
    // 于是它在码本里缺席——「語」的部首定位就漏掉了那一横。
    //
    // 但**部首自己长什么样是硬事实**：说文部的独立字形里就画着那一横。
    // 所以把部首独立字形的路径描述子也收进来（每个部只多几个候选，
    // 不影响构建耗时）。
    //
    // 放在覆盖度挑选**之后**追加：语料里的「共有写法」优先，
    // 部首自身的笔画只作补充——不能让独立形态喧宾夺主
    // （「水」独立是中间一竖两边四点，作偏旁是三条波浪线，
    // 独立形态在这里恰恰是**不可靠**的那个）。
    const radicalDescs: Descriptor[] = [];
    {
      const radicalRow = seal.byCodepoint(radicalCp);
      const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
      if (radicalGlyph) {
        const vb = inkViewBox(radicalGlyph);
        for (const p of radicalGlyph.paths) {
          const pm = rasterizeGlyph(p.subpaths, { width: WORK_SIZE, height: WORK_SIZE, viewBox: vb });
          if (countInk(pm) === 0) continue;
          radicalDescs.push(describeMask(pm));
        }
      }
    }

    // ── 关键：不用贪心聚类，用「覆盖度」挑代表 ──────────────────
    //
    // 贪心聚类有链式碎片化的问题：摹本的笔画形状彼此接近但不完全相同，
    // 「A 像 B、B 像 C、A 不太像 C」时会被拆成两簇，于是「部首笔画」
    // 永远攒不到过半的覆盖率（实测水部因此被整部跳过）。
    //
    // 改成：对每个描述子算它「能覆盖多少个字」——一个字里只要有一笔与它
    // 距离在容差内就算被覆盖。覆盖过半的描述子就是部首笔画。
    // 再把彼此接近的合并，只留一个代表。
    const allDescs = [...new Set([...perChar.values()].flat())];
    const covered = new Map<string, number>();
    for (const d of allDescs) {
      let n = 0;
      for (const descs of perChar.values()) {
        let hit = false;
        for (const other of descs) {
          if (descriptorDistance(d, other) <= CLUSTER) { hit = true; break; }
        }
        if (hit) n += 1;
      }
      covered.set(d, n);
    }

    // 覆盖度从高到低挑代表，彼此接近的只留一个
    const sorted = [...covered.entries()].sort((a, b) => b[1] - a[1]);
    const radicalTypes: Descriptor[] = [];
    let bestCoverage = 0;
    for (const [d, n] of sorted) {
      if (n / perChar.size < COVERAGE) continue;
      if (radicalTypes.some((t) => descriptorDistance(d, t) <= CLUSTER)) continue;
      radicalTypes.push(d);
      bestCoverage = Math.max(bestCoverage, n / perChar.size);
      if (radicalTypes.length >= MAX_TYPES) break;
    }
    // 部首自身的笔画补进来（补充位，不喧宾夺主）
    for (const d of radicalDescs) {
      if (radicalTypes.length >= MAX_TYPES + MAX_RADICAL_TYPES) break;
      if (radicalTypes.some((t) => descriptorDistance(d, t) <= CLUSTER)) continue;
      radicalTypes.push(d);
    }
    if (radicalTypes.length === 0) { skipped += 1; continue; }

    const radicalNo = radicalNoOf.get(radicalCp) ?? "";
    out[radicalNo] = {
      types: radicalTypes,
      coverage: Number(bestCoverage.toFixed(3)),
      chars: perChar.size,
    };
    done += 1;
    if (done % 50 === 0) process.stdout.write(`  已归纳 ${done} 部…\n`);
  }

  const dir = join(REPO_ROOT, "assets", "index");
  mkdirSync(dir, { recursive: true });
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const path = outArg ? outArg.split("=")[1] : join(dir, "radical-forms.json");
  writeFileSync(path, JSON.stringify(out), "utf8");
  const kb = (JSON.stringify(out).length / 1024).toFixed(0);
  console.log(`部首偏旁形：${done} 部（跳过 ${skipped} 部）→ ${path}（${kb} KB）`);
}

main();
