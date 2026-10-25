/** 量一量：E6 的形似度换成「与位置无关的形状描述子」会是什么样。 */
import { readFileSync } from "node:fs";
import { GlyphStore } from "./lib/store.ts";
import { parseGlyphSvg } from "../src/glyph.ts";
import { inkViewBox } from "../src/glyph.ts";
import { rasterizeGlyph, countInk, type Mask } from "../src/raster/mask.ts";
import { describeMask, descriptorDistance } from "../src/structure/descriptor.ts";
import { compareGlyphs } from "../src/teaching/compare.ts";

const store = new GlyphStore();
const seal = store.index("seal");
const RES = 96;

function maskOf(glyph: ReturnType<typeof parseGlyphSvg>, pathIndex: number): Mask {
  const p = glyph.paths[pathIndex];
  return rasterizeGlyph(p.subpaths, {
    width: RES, height: RES, viewBox: inkViewBox(glyph),
  });
}

/** 描述子距离 → 相似度（0–1）。 */
function descSim(a: ReturnType<typeof describeMask>, b: ReturnType<typeof describeMask>): number {
  const d = descriptorDistance(a, b);
  return Math.max(0, 1 - d / 256);
}

function descSimilarity(ga: ReturnType<typeof parseGlyphSvg>, gb: ReturnType<typeof parseGlyphSvg>): number {
  const da = ga.paths.map((_, i) => describeMask(maskOf(ga, i)));
  const db = gb.paths.map((_, i) => describeMask(maskOf(gb, i)));
  // 贪心配对：每条 a 找最像的 b
  const used = new Set<number>();
  let total = 0;
  let weight = 0;
  for (let i = 0; i < da.length; i += 1) {
    let best = -1;
    let bestSim = 0;
    db.forEach((x, j) => {
      const s = descSim(da[i], x);
      if (s > bestSim) { bestSim = s; best = j; }
    });
    if (best >= 0) used.add(best);
    total += bestSim;
    weight += 1;
  }
  // 没配上的笔画算 0
  const unmatched = db.length - used.size;
  return (total + unmatched * 0.3) / (weight + unmatched);
}

const PAIRS: Array<[string, string]> = [
  ["日", "曰"], ["未", "末"], ["土", "士"], ["目", "且"], ["汩", "汨"],
  ["人", "大"], ["日", "水"], ["未", "目"], ["木", "本"],
];

console.log("字对      像素IoU   描述子相似度   笔画配对");
for (const [a, b] of PAIRS) {
  const fa = seal.byChar(a)?.file;
  const fb = seal.byChar(b)?.file;
  if (!fa || !fb) { console.log(`${a}/${b} 缺`); continue; }
  const ga = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${fa}`, "utf8"));
  const gb = parseGlyphSvg(readFileSync(`assets/glyphs/seal/${fb}`, "utf8"));
  const cur = compareGlyphs(ga, gb);
  const ds = descSimilarity(ga, gb);
  console.log(
    `${a}/${b}`.padEnd(10) +
    `${(cur.similarity * 100).toFixed(1)}%`.padEnd(11) +
    `${(ds * 100).toFixed(1)}%`.padEnd(15) +
    `${cur.pairs.length} 对`,
  );
}
void countInk;
