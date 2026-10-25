/**
 * E7 声族：距离阈值扫描。
 *
 * 描述子算一次存下来，之后换阈值都是秒级。
 * 缓存：`assets/report/family-descriptors.json`
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GlyphStore, loadSealRegistry, REPO_ROOT } from "./lib/store.ts";
import { resolveStructure } from "../src/structure/resolve.ts";
import { componentDescriptor } from "../src/teaching/family.ts";
import { descriptorDistance } from "../src/teaching/family.ts";

const CACHE = join(REPO_ROOT, "assets", "report", "family-descriptors.json");
const N = Number(process.argv[2] ?? 1500);

/** 一个字参与聚类的信息：声符的形状描述子。 */
interface Entry {
  char: string;
  semantic: string;
  desc: Uint8Array;
}

function buildCache(): Entry[] {
  if (existsSync(CACHE)) {
    const raw = JSON.parse(readFileSync(CACHE, "utf8")) as {
      n: number;
      entries: Array<{ char: string; semantic: string; desc: string }>;
    };
    if (raw.entries.length >= N) {
      return raw.entries.slice(0, N).map((e) => ({
        char: e.char,
        semantic: e.semantic,
        desc: new Uint8Array(Buffer.from(e.desc, "base64")),
      }));
    }
  }
  const store = new GlyphStore();
  const registry = loadSealRegistry();
  const regByCp = new Map(registry.map((r) => [r.codepoint, r]));
  const seal = store.index("seal");
  const FORMS: Record<string, { types: string[] }> = (() => {
    const p = join(REPO_ROOT, "assets", "index", "radical-forms.json");
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  })();

  const entries: Entry[] = [];
  for (const row of seal.rows) {
    if (!row.modernChar) continue;
    if (entries.length >= N) break;
    const cp = row.codepoint || row.glyphId;
    const reg = regByCp.get(cp);
    if (!reg) continue;
    const radicalRow = seal.byCodepoint(reg.radicalCp.split(" ")[0]);
    const glyph = store.glyph("seal", row.file);
    const radicalGlyph = radicalRow ? store.glyph("seal", radicalRow.file) : null;
    if (!glyph || !radicalGlyph) continue;
    const forms = FORMS[reg.radicalNo];
    const resolved = resolveStructure(glyph, radicalGlyph, {
      radicalTypes: forms?.types ?? [],
    });
    if (!resolved) continue;
    const d = resolved.decomposition;
    if (d.structure !== "⿰" && d.structure !== "⿲" && d.structure !== "⿱" && d.structure !== "⿳") continue;
    if (d.remainderPathIndices.length === 0) continue;
    entries.push({
      char: row.modernChar,
      semantic: radicalRow?.modernChar ?? "",
      desc: componentDescriptor(glyph, d.remainderPathIndices),
    });
    if (entries.length % 200 === 0) process.stdout.write(`  已算 ${entries.length} 个…\n`);
  }
  mkdirSync(join(REPO_ROOT, "assets", "report"), { recursive: true });
  writeFileSync(CACHE, JSON.stringify({
    n: entries.length,
    entries: entries.map((e) => ({ char: e.char, semantic: e.semantic, desc: Buffer.from(e.desc).toString("base64") })),
  }), "utf8");
  return entries;
}

/** 与 buildPhoneticFamilies 同构的聚类（要求与族里每个成员都够像）。 */
function cluster(entries: Entry[], maxDistance: number): Array<{ members: number[] }> {
  const families: Array<{ members: number[] }> = [];
  for (let i = 0; i < entries.length; i += 1) {
    let placed = false;
    for (const fam of families) {
      const tooFar = fam.members.some((m) => descriptorDistance(entries[i].desc, entries[m].desc) > maxDistance);
      if (tooFar) continue;
      fam.members.push(i);
      placed = true;
      break;
    }
    if (!placed) families.push({ members: [i] });
  }
  return families;
}

const entries = buildCache();
console.log(`\n参与聚类 ${entries.length} 字`);
console.log("阈值   族数   最大族   ≥50成员的族   最大族里的语义部种类");
for (const md of [16, 20, 24, 28, 32, 36, 40]) {
  const fams = cluster(entries, md);
  const sizes = fams.map((f) => f.members.length).sort((a, b) => b - a);
  const biggest = fams.reduce((a, b) => (b.members.length > a.members.length ? b : a), fams[0]);
  const sems = new Set(biggest.members.map((m) => entries[m].semantic));
  console.log(
    `${String(md).padEnd(7)}${String(fams.length).padEnd(8)}${String(sizes[0] ?? 0).padEnd(9)}` +
    `${String(sizes.filter((s) => s >= 50).length).padEnd(15)}${sems.size}`,
  );
}
