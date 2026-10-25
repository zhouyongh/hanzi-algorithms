/** 探针：篆书层「日」「目」这类字的子路径与绕向——洞是不是被填掉了。 */
import { readFileSync } from "node:fs";
import { GlyphStore } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";

const s = new GlyphStore();
const seal = s.index("seal");

/** 多边形的有向面积（正=逆时针，负=顺时针）。 */
function signedArea(pts: Array<{ x: number; y: number }>): number {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

for (const ch of ["日", "目", "曰", "明", "投"]) {
  const row = seal.byChar(ch);
  if (!row) continue;
  const g = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${row.file}`, "utf8"));
  console.log(`=== ${ch}（${row.file}）路径 ${g.paths.length} ===`);
  g.paths.forEach((p, i) => {
    const areas = p.subpaths.map((sp) => signedArea(sp).toFixed(0));
    console.log(`  路径${i}：${p.subpaths.length} 个子路径  有向面积 [${areas.join(", ")}]`);
  });
}
