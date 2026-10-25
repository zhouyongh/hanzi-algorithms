/**
 * 从兄弟仓库 `hanzi-glyphs-svg` 的 git 对象里取出字形，落到本仓库的本地
 * `assets/glyphs/`。
 *
 * 为什么用 `git archive` 而不是 worktree：worktree 会把整个仓库 checkout 出来
 *（含 9.5 万个文件），慢且占空间；`git archive` 只导出需要的子树。
 *
 * 为什么自己解 tar：Node 没有内置 tar 库，而 git archive 产出的是标准 ustar，
 * 解析它只要几十行，不值得为这件事引一个依赖。
 *
 * **这些字形不进版本库**（`assets/` 已被 `.gitignore` 排除）——本仓库只发布
 * 算法与代码。字形的授权状态由仓库作者另行确认。
 *
 * 用法：
 *   node tools/sync_glyphs.ts --list
 *   node tools/sync_glyphs.ts
 *   node tools/sync_glyphs.ts --layers seal,oracle --branch main
 */

import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

/** 已知书体层。 */
export const LAYERS = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"] as const;
export type Layer = (typeof LAYERS)[number];

/** 层的中文名。 */
export const LAYER_NAMES: Record<Layer, string> = {
  oracle: "甲骨文",
  bronze: "金文",
  seal: "篆书",
  clerical: "隶书",
  chuanchao: "傳抄古文",
  chu: "楚简",
};

interface Options {
  source: string;
  branch: string;
  layers: Layer[];
  out: string;
  list: boolean;
  keepArchive: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    source: resolve(REPO, "..", "hanzi-glyphs-svg"),
    branch: "backup/full-20261025",
    layers: [...LAYERS],
    out: resolve(REPO, "assets", "glyphs"),
    list: false,
    keepArchive: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") opts.source = resolve(argv[++i] ?? "");
    else if (arg === "--branch") opts.branch = argv[++i] ?? opts.branch;
    else if (arg === "--out") opts.out = resolve(argv[++i] ?? opts.out);
    else if (arg === "--list") opts.list = true;
    else if (arg === "--keep-archive") opts.keepArchive = true;
    else if (arg === "--layers") {
      const raw = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      opts.layers = raw.filter((s): s is Layer => (LAYERS as readonly string[]).includes(s));
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "用法：node tools/sync_glyphs.ts [选项]",
          "  --source <dir>    源仓路径（默认 ../hanzi-glyphs-svg）",
          "  --branch <ref>    取字形的分支（默认 backup/full-20261025）",
          "  --layers a,b      只取这些层（默认全部）",
          "  --out <dir>       目标目录（默认 assets/glyphs）",
          "  --list            只列出各层可用的条目数",
          "  --keep-archive    保留导出的 tar 文件（调试用）",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  return opts;
}

/** 跑一个 git 命令并返回 stdout（Buffer）。 */
function git(args: string[], cwd: string, maxBuffer = 1 << 30): Promise<Buffer> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let size = 0;
    child.stdout.on("data", (c: Buffer) => {
      size += c.length;
      if (size > maxBuffer) {
        child.kill();
        rejectPromise(new Error("git 输出过大"));
        return;
      }
      chunks.push(c);
    });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => { stderr += c.toString(); });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(Buffer.concat(chunks));
      else rejectPromise(new Error(`git ${args.join(" ")} 失败（${code}）：${stderr.trim()}`));
    });
  });
}

/** 解析 ustar 头的十进制数字字段。 */
function readOctal(buf: Buffer, offset: number, length: number): number {
  const raw = buf.subarray(offset, offset + length).toString("ascii").replace(/\0.*$/, "").trim();
  if (!raw) return 0;
  return parseInt(raw, 8);
}

/** 读取 ustar 的路径字段（含 prefix）。 */
function readName(buf: Buffer, offset: number): string {
  const name = buf.subarray(offset, offset + 100).toString("utf8").replace(/\0.*$/, "");
  const prefix = buf.subarray(offset + 345, offset + 500).toString("utf8").replace(/\0.*$/, "");
  return prefix ? `${prefix}/${name}` : name;
}

/**
 * 解开 ustar tar 包，把匹配前缀的文件写到目标目录。
 *
 * @returns 写出的文件数
 */
export function extractTar(tar: Buffer, targetDir: string, prefixFilter: string[]): number {
  let offset = 0;
  let written = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    // 连续两个空块 = 结束
    if (header.every((b) => b === 0)) break;
    const size = readOctal(header, 124, 12);
    const typeFlag = String.fromCharCode(header[156]);
    const name = readName(header, 0);
    offset += 512;
    const data = tar.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    if (typeFlag !== "0" && typeFlag !== "\0") continue;
    if (!prefixFilter.some((p) => name.startsWith(p))) continue;

    const rel = name.replace(/^glyphs\//, "");
    const dest = join(targetDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, data);
    written += 1;
  }
  return written;
}

/** 数一数某层在归档里有多少个 SVG。 */
function countSvgs(tar: Buffer, prefix: string): number {
  let offset = 0;
  let n = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const size = readOctal(header, 124, 12);
    const typeFlag = String.fromCharCode(header[156]);
    const name = readName(header, 0);
    offset += 512 + Math.ceil(size / 512) * 512;
    if ((typeFlag === "0" || typeFlag === "\0") && name.startsWith(prefix) && name.endsWith(".svg")) n += 1;
  }
  return n;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!existsSync(opts.source)) {
    console.error(`源仓不存在：${opts.source}`);
    console.error("用 --source 指定 hanzi-glyphs-svg 的位置。");
    process.exit(1);
  }

  const paths = opts.layers.map((l) => `glyphs/${l}`);
  // 登记表与说明文件一并带出（不同分支里形态不同，逐个探测是否存在）
  const candidates = [...paths, "glyphs/provenance", "glyphs/provenance.jsonl", "glyphs/seal/external.csv"];

  // 只保留目标分支上真实存在的路径——`git archive` 遇到不存在的 pathspec 会直接失败
  const listing = await git(["ls-tree", "-r", "--name-only", opts.branch, "--", ...candidates], opts.source)
    .then((b) => b.toString("utf8").split("\n").filter(Boolean))
    .catch(() => [] as string[]);
  const present = new Set(listing);
  const wanted = candidates.filter((p) =>
    present.has(p) || [...present].some((f) => f.startsWith(`${p}/`)),
  );
  if (wanted.length === 0) {
    console.error(`分支 ${opts.branch} 上没有找到任何字形路径。`);
    process.exit(1);
  }

  let tar: Buffer;
  try {
    tar = await git(["archive", "--format=tar", opts.branch, "--", ...wanted], opts.source);
  } catch (err) {
    console.error(String(err));
    console.error(`分支 ${opts.branch} 不存在或没有字形。`);
    process.exit(1);
  }

  if (opts.list) {
    console.log(`分支 ${opts.branch}（源仓 ${opts.source}）`);
    for (const layer of opts.layers) {
      const n = countSvgs(tar, `glyphs/${layer}/`);
      console.log(`  ${layer.padEnd(10)} ${LAYER_NAMES[layer].padEnd(6)} ${String(n).padStart(7)} 个字形`);
    }
    return;
  }

  if (existsSync(opts.out)) rmSync(opts.out, { recursive: true, force: true });
  mkdirSync(opts.out, { recursive: true });

  const written = extractTar(tar, opts.out, wanted.map((p) => `${p}/`).concat(["glyphs/provenance.jsonl"]));

  console.log(`已同步 ${written} 个文件 → ${opts.out}`);
  for (const layer of opts.layers) {
    const n = countSvgs(tar, `glyphs/${layer}/`);
    console.log(`  ${layer.padEnd(10)} ${LAYER_NAMES[layer].padEnd(6)} ${String(n).padStart(7)} 个字形`);
  }
  console.log("提示：assets/ 不在版本库里，刷新素材只需重跑本脚本。");
  void createWriteStream;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
