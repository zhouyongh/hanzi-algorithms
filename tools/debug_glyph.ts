/**
 * 找出演变链上卡住的具体字形。
 * 逐个书体单独计时，超时的打印出来。
 */
import { parseGlyphSvg } from "../src/glyph.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";

const LAYERS = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];
const char = process.argv[2] ?? "日";

for (const layer of LAYERS) {
  const csv = join(REPO_ROOT, "assets", "glyphs", layer, "index.csv");
  if (!readFileSync(csv, "utf8")) continue;
  const text = readFileSync(csv, "utf8");
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",");
  const ci = header.indexOf("modern_char");
  const fi = header.indexOf("file");
  const row = lines.slice(1).map((l) => l.split(",")).find((c) => c[ci] === char);
  if (!row) { console.log(`${layer}: 无此字`); continue; }
  const file = join(REPO_ROOT, "assets", "glyphs", layer, row[fi]);
  const svg = readFileSync(file, "utf8");
  const g = parseGlyphSvg(svg);
  const vb = g.viewBox;
  let maxX = -Infinity;
  let minX = Infinity;
  let maxY = -Infinity;
  let minY = Infinity;
  for (const p of g.paths) {
    for (const sp of p.subpaths) {
      for (const pt of sp) {
        if (pt.x > maxX) maxX = pt.x;
        if (pt.x < minX) minX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
        if (pt.y < minY) minY = pt.y;
      }
    }
  }
  const scale = 200 / (vb.width || 1);
  console.log(
    `${layer.padEnd(10)} file=${row[fi].padEnd(12)} vb=${vb.width}×${vb.height}` +
    ` 墨迹 x[${minX.toFixed(1)},${maxX.toFixed(1)}] y[${minY.toFixed(1)},${maxY.toFixed(1)}]` +
    ` paths=${g.paths.length} 像素跨度=${((maxX - minX) * scale).toFixed(0)}`,
  );
}
