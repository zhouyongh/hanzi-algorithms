/** 换阈值时，真正的声族会不会被切碎？ */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";
import { descriptorDistance } from "../src/teaching/family.ts";

interface Entry {
  char: string;
  semantic: string;
  desc: Uint8Array;
}

const CACHE = join(REPO_ROOT, "assets", "report", "family-descriptors.json");
const raw = JSON.parse(readFileSync(CACHE, "utf8")) as {
  entries: Array<{ char: string; semantic: string; desc: string }>;
};
const entries: Entry[] = raw.entries.map((e) => ({
  char: e.char,
  semantic: e.semantic,
  desc: new Uint8Array(Buffer.from(e.desc, "base64")),
}));

function cluster(maxDistance: number): Array<{ members: number[] }> {
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

/**
 * 已知该成族的字（**同一个声符**）。
 *
 * 注意别用「长得像」的字：瑾/瓊/璚/瑦/璀 是一组，但它们的声符分别是
 * 堇/夐/盡/英/崔——五个不同的声符，本来就不该一族。
 * 真正同声符的是下面这些。
 */
const KNOWN: Array<[string, string[]]> = [
  ["堇", ["堇", "瑾", "僅", "謹", "鄞", "覲", "菫", "墐", "馪"]],
  ["艮", ["艮", "恨", "銀", "退", "限", "眼", "艱"]],
  ["監", ["監", "藍", "臨", "艦", "覽"]],
  ["喜", ["喜", "嘻", "熹", "禧", "僖"]],
  ["可", ["可", "河", "苛", "柯", "呵", "訶", "苛"]],
  ["工", ["工", "江", "汀", "紅", "虹", "左"]],
  ["召", ["召", "招", "昭", "詔", "紹", "照"]],
];

for (const md of [16, 20, 24, 28, 32, 36, 40]) {
  const fams = cluster(md);
  const sizes = fams.map((f) => f.members.length).sort((a, b) => b - a);
  const lines: string[] = [];
  for (const [label, chars] of KNOWN) {
    const idxs = chars.map((c) => entries.findIndex((e) => e.char === c)).filter((i) => i >= 0);
    if (idxs.length < 2) continue;
    const sizesOf = idxs.map((i) => {
      const f = fams.find((fam) => fam.members.includes(i));
      return f ? f.members.length : 0;
    });
    const same = sizesOf.every((s) => s === sizesOf[0]);
    lines.push(`${label}：${sizesOf.join("/")}${same ? "" : " ← 拆散了"}`);
  }
  console.log(
    `阈值 ${String(md).padEnd(3)} 族 ${String(fams.length).padEnd(5)} 最大族 ${String(sizes[0] ?? 0).padEnd(4)}` +
    ` ≥50的族 ${String(sizes.filter((s) => s >= 50).length).padEnd(3)}  ${lines.join("  ")}`,
  );
}
void existsSync;
