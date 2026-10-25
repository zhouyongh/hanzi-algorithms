/**
 * 同步**现代字笔顺数据**到本地 `assets/stroke-order/`。
 *
 * ## 为什么需要这个数据
 *
 * 本仓的字形层给的是**字形轮廓**，不是**笔顺**。甲骨骨架例外——它一条 path 就是一笔，
 * 文件顺序即落笔顺序。但篆/金/隶/楚的摹本是闭合轮廓，顺序只是文件顺序，
 * 与笔顺无关；现代字（楷/宋/黑）更是只有填充轮廓，根本没有笔画的概念。
 *
 * 所以「一笔从头到尾」的书写动画需要一份**真笔顺数据**。
 * 这里用的是 `hanzi-writer-data`——由 Arphic Technology 的字库抽取，
 * 按 **Arphic Public License** 发布。
 *
 * ## 处置
 *
 * - 数据**只同步到本地 `assets/`**（已 gitignore），**不入库、不发布**——
 *   与本仓「字形不随库发布」的规矩一致；
 * - 许可原文（`ARPHICPL.TXT`）与出处记录（`PROVENANCE.json`）一并落到本地，
 *   方便复核；
 * - 代码侧（hanzi-writer 本体，MIT）由 `tools/build_vendor.ts` vendor 进 `demos/lib/vendor/`。
 *
 * ## 用法
 *
 * ```
 * node tools/sync_stroke_order.ts                # 全量（约 9000 字）
 * node tools/sync_stroke_order.ts --chars=天,日,明   # 只同步这几个字
 * ```
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";

const SRC = join(REPO_ROOT, "node_modules", "hanzi-writer-data");
const DEST = join(REPO_ROOT, "assets", "stroke-order");

function parseArgs(argv: string[]): { chars: string[] | null } {
  const out: { chars: string[] | null } = { chars: null };
  for (const arg of argv) {
    if (arg.startsWith("--chars=")) {
      out.chars = arg.slice("--chars=".length).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
}

function main(): void {
  const { chars } = parseArgs(process.argv.slice(2));

  if (!existsSync(SRC)) {
    console.error(`找不到上游数据：${SRC}`);
    console.error("先跑 `npm install`（hanzi-writer-data 是 devDependency）。");
    process.exit(1);
  }

  mkdirSync(DEST, { recursive: true });

  const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
  const picked = chars ? files.filter((f) => chars.includes(f.replace(/\.json$/, ""))) : files;

  let n = 0;
  for (const f of picked) {
    copyFileSync(join(SRC, f), join(DEST, f));
    n += 1;
  }

  // 许可原文随数据一起放（Arphic Public License 要求随附声明）
  const apl = join(SRC, "ARPHICPL.TXT");
  if (existsSync(apl)) copyFileSync(apl, join(DEST, "ARPHICPL.TXT"));

  // 出处记录：这个目录里的东西从哪来、什么许可、什么时候取的
  const provenance = {
    source: "hanzi-writer-data",
    version: readVersion(),
    upstream: "https://github.com/chanind/hanzi-writer-data",
    license: "Arphic Public License (ARPHICPL.TXT)",
    license_file: "ARPHICPL.TXT",
    retrieved_at: new Date().toISOString(),
    characters: n,
    note:
      "笔顺数据只同步到本地 assets/（已 gitignore），不随库发布。" +
      "由 Arphic Technology 的字库抽取，非本仓原创。",
  };
  writeFileSync(join(DEST, "PROVENANCE.json"), JSON.stringify(provenance, null, 2) + "\n", "utf8");

  console.log(`已同步 ${n} 个字的笔顺数据 → ${DEST}`);
  console.log(`许可与出处 → ${join(DEST, "ARPHICPL.TXT")} / ${join(DEST, "PROVENANCE.json")}`);
}

function readVersion(): string {
  const pkg = join(SRC, "package.json");
  if (!existsSync(pkg)) return "unknown";
  try {
    const parsed = JSON.parse(readFileSync(pkg, "utf8")) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

main();
