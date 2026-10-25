/** 统计：有多少字形受「z 之后的相对 m」这个解析 bug 影响。 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, REPO_ROOT } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";

const store = new GlyphStore();

for (const layer of ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"] as const) {
  const dir = join(REPO_ROOT, "assets", "glyphs", layer);
  let total = 0;
  let affected = 0;
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  } catch { continue; }
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    total += 1;
    // 找「z（或 Z）之后紧跟相对 m」的子路径
    const d = / d="([^"]+)"/.exec(raw)?.[1] ?? "";
    const re = /[Zz]\s*(?=[Mm])/g;
    if (re.test(d)) {
      affected += 1;
    }
  }
  console.log(`${layer}：${total} 个字形，其中 ${affected} 个含「z 后接相对 m」（${((affected / total) * 100).toFixed(1)}%）`);
}

// 顺带：解析前后墨迹范围的变化（看几何被挪了多少）
console.log("\n=== 几何被挪动的例子 ===");
const seal = store.index("seal");
for (const ch of ["日", "目", "明", "投", "河", "眼"]) {
  const row = seal.byChar(ch);
  if (!row) continue;
  const g = parseGlyphSvg(readFileSync(join(REPO_ROOT, "assets", "glyphs", "seal", row.file), "utf8"));
  const all = g.paths.flatMap((p) => p.subpaths).flat();
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  console.log(`${ch}  子路径 ${g.paths.reduce((s, p) => s + p.subpaths.length, 0)}  ` +
    `墨迹 x[${Math.min(...xs).toFixed(0)},${Math.max(...xs).toFixed(0)}] ` +
    `y[${Math.min(...ys).toFixed(0)},${Math.max(...ys).toFixed(0)}]`);
}
