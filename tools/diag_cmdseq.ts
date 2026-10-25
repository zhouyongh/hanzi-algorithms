/** 探针：把 SVG path 的命令序列与子路径起点打出来，找解析器的偏差。 */
import { readFileSync } from "node:fs";
import { GlyphStore } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";

const store = new GlyphStore();
const seal = store.index("seal");

for (const ch of ["日", "目"]) {
  const row = seal.byChar(ch);
  if (!row) continue;
  const raw = readFileSync(`assets/glyphs/seal/${row.file}`, "utf8");
  const d = / d="([^"]+)"/.exec(raw)?.[1] ?? "";
  console.log(`=== ${ch} ===`);
  // 打印所有 moveto / closepath 的位置与参数
  const re = /([MmZz])\s*([^MmZz]*)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(d)) !== null) {
    const args = m[2].trim().split(/[\s,]+/).filter(Boolean);
    console.log(`  [${m[1]}] @${m.index}  参数 ${args.slice(0, 2).join(",")}${args.length > 2 ? ` …共${args.length}个` : ""}`);
    idx += 1;
    if (idx > 12) break;
  }
  // 原始文件里 Z 出现了几次
  console.log(`  d 里 Z/z 共 ${(d.match(/[Zz]/g) || []).length} 次，m/M 共 ${(d.match(/[Mm]/g) || []).length} 次`);

  const g = parseGlyphSvg(raw);
  g.paths[0].subpaths.forEach((sp, i) => {
    const f = sp[0];
    const l = sp[sp.length - 1];
    console.log(`  解析子路径${i}: ${sp.length} 点 首(${f.x.toFixed(1)},${f.y.toFixed(1)}) 末(${l.x.toFixed(1)},${l.y.toFixed(1)})`);
  });
}
