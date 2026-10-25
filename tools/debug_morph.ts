/** 给演变链的每一步计时，找出卡住的地方。 */
import { parseGlyphSvg } from "../src/glyph.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";
import { interpolateGlyphs } from "../src/morph/interpolate.ts";
import { correspondStrokes } from "../src/morph/correspond.ts";

const layers = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"];

function find(layer: string, ch: string) {
  const text = readFileSync(join(REPO_ROOT, "assets", "glyphs", layer, "index.csv"), "utf8");
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",");
  const ci = header.indexOf("modern_char");
  const fi = header.indexOf("file");
  const row = lines.slice(1).map((l) => l.split(",")).find((c) => c[ci] === ch);
  if (!row) return null;
  return parseGlyphSvg(readFileSync(join(REPO_ROOT, "assets", "glyphs", layer, row[fi]), "utf8"));
}

const ch = process.argv[2] ?? "日";
const gs: Array<[string, ReturnType<typeof parseGlyphSvg>]> = [];
for (const l of layers) {
  const g = find(l, ch);
  if (g) gs.push([l, g]);
}
console.log("链:", gs.map((x) => x[0]).join(" -> "));

for (let i = 0; i + 1 < gs.length; i += 1) {
  const a = gs[i];
  const b = gs[i + 1];
  const t0 = Date.now();
  const c = correspondStrokes(a[1], b[1]);
  console.log(`  ${a[0]}→${b[0]} correspond: ${Date.now() - t0}ms  pairs=${c.pairs.length}`);
}

for (let i = 0; i + 1 < gs.length; i += 1) {
  const a = gs[i];
  const b = gs[i + 1];
  const t0 = Date.now();
  interpolateGlyphs(a[1], b[1], 0.5, { samples: 96, resolution: 200 });
  console.log(`  ${a[0]}→${b[0]} interpolate: ${Date.now() - t0}ms`);
}
