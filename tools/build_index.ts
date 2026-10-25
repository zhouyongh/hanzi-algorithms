/**
 * 生成演示用的静态索引。
 *
 * 为什么不在浏览器里现查：字形索引表六层加起来 22 MB，浏览器拉全再筛会卡死；
 * 而演示页只需要「现代字 → 文件名」这一层映射。
 *
 * 产出（都在 `assets/` 下，不入库）：
 * - `assets/index/<layer>.json`  { 现代字: 文件名 }
 * - `assets/index/seal-radicals.json`  { 篆书码位: [说文部次, 部首码位, 部首字] }
 *
 * 用法：
 *   node tools/build_index.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, LAYERS } from "./lib/store.ts";
import { parseCsv } from "./lib/csv.ts";

const ASSETS = join(REPO_ROOT, "assets");

function main(): void {
  const outDir = join(ASSETS, "index");
  mkdirSync(outDir, { recursive: true });

  for (const layer of LAYERS) {
    const csvPath = join(ASSETS, "glyphs", layer, "index.csv");
    if (!existsSync(csvPath)) {
      console.log(`${layer}: 未同步，跳过`);
      continue;
    }
    const table = parseCsv(readFileSync(csvPath, "utf8"));
    const map: Record<string, string> = {};
    let n = 0;
    for (const rec of table.records) {
      const ch = rec.modern_char ?? "";
      const file = rec.file ?? "";
      if (!ch || !file) continue;
      if (!(ch in map)) {
        map[ch] = file;
        n += 1;
      }
    }
    const out = join(outDir, `${layer}.json`);
    writeFileSync(out, JSON.stringify(map), "utf8");
    console.log(`${layer}: ${n} 个现代字 → ${out}（${(JSON.stringify(map).length / 1024).toFixed(0)} KB）`);
  }

  // 篆书的部首登记
  const regPath = join(ASSETS, "glyphs", "seal", "external.csv");
  if (existsSync(regPath)) {
    const table = parseCsv(readFileSync(regPath, "utf8"));
    const map: Record<string, [number, string, string]> = {};
    for (const rec of table.records) {
      const cp = (rec.codepoint ?? "").replace(/^U\+/, "");
      const no = Number(rec.radical_no ?? "0");
      if (!cp || !no) continue;
      map[cp] = [no, (rec.radical_cp ?? "").split(" ")[0], rec.modern_char ?? ""];
    }
    const out = join(outDir, "seal-radicals.json");
    writeFileSync(out, JSON.stringify(map), "utf8");
    console.log(`seal 部首登记：${Object.keys(map).length} 条 → ${out}（${(JSON.stringify(map).length / 1024).toFixed(0)} KB）`);
  }
}

main();
