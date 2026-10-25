/**
 * 生成**演示用字形子集**（入库），让演示页开箱即用。
 *
 * ## 为什么要有这个子集
 *
 * 本机的完整字形素材在 `assets/`（约 631 MB、9.5 万个文件，已 gitignore，
 * **不随库发布**）。但演示页要**开箱即用**——别人 clone 下来双击就能看到东西，
 * 不该要求他先同步 631 MB 素材。
 *
 * 所以这里做一份**演示用的子集**：每层十几到二十来个字，随库入库，
 * 演示页直接用这份子集（`demos/glyphs/` + `demos/data/`）。
 *
 * ## 产出（默认在 `demos/` 下）
 *
 * - `demos/glyphs/<层>/<文件>.svg`    —— 字形（上游原件的**逐字节副本**）
 * - `demos/data/index/<层>.json`     —— 现代字 → 文件名（与 `assets/index/*.json` 同格式）
 * - `demos/data/radical-forms.json`  —— 部首的偏旁形码本（从 `assets/index/` 拷来）
 * - `demos/data/seal-radicals.json`  —— 说文 540 部登记（从 `assets/index/` 拷来）
 * - `demos/data/stroke-order/*.json` —— 楷书笔顺（从 `assets/stroke-order/` 拷来）
 * - `demos/data/PROVENANCE.md`       —— 出处与许可说明（**逐层、逐文件**）
 *
 * ## 选字
 *
 * 走一张**固定的优先级表**（`PRIORITY`）：演示页真正用到的字排前面，
 * 后面才是常用部件与基本字。每层按表序取，取到 `--per-layer` 个为止；
 * **某层没有的字就跳过**，不硬编。
 *
 * 篆书层额外收录**说文部首自己的字形**：演示页算部首时要按部首码位
 * 直接取字形（`loadGlyph("seal", radicalCp + ".svg")`），不收的话
 * 部首定位那一步就断在半路。
 *
 * ## 确定性
 *
 * 同样的输入跑两次，产出**完全一样**：选字走固定表、文件逐字节复制、
 * 输出里**不写时间戳**（连生成时间也不写）。这样入库的子集可以用
 * `git diff` 直接审——两次构建的 diff 必须是空的。
 *
 * ## 用法
 *
 * ```
 * node tools/build_demo_glyphs.ts                  # 默认 --out=demos --per-layer=20
 * node tools/build_demo_glyphs.ts --out=demos --per-layer=16
 * ```
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { REPO_ROOT, type Layer } from "./lib/store.ts";
import { parseCsv } from "./lib/csv.ts";

const ASSETS = join(REPO_ROOT, "assets");
const GLYPH_ROOT = join(ASSETS, "glyphs");
const INDEX_ROOT = join(ASSETS, "index");
const STROKE_ROOT = join(ASSETS, "stroke-order");
const PROVENANCE_JSONL = join(GLYPH_ROOT, "provenance.jsonl");

/**
 * markdown 代码围栏。
 *
 * **不要在源码里直接写三个反引号**——`tools/check_backticks.ts` 按行数反引号，
 * 那一行会被当成未闭合的模板字符串而报错。这里用字符码拼出来，跟检查器自己一个路子。
 */
const FENCE = String.fromCharCode(96).repeat(3);

/** 子集目录的标记文件：只用来判断「这个目录是我们生成的，可以安全重建」。 */
const MARKER = ".demo-subset";
/** 标记文件的内容：格式变了就换版本号，老目录会被拒绝重建（避免残留）。 */
const MARKER_BODY =
  "本目录由 tools/build_demo_glyphs.ts 生成（演示用的字形子集）。\n" +
  "重新生成时本目录会被清空重建——这个标记文件就是用来认领这个目录的，\n" +
  "没有它工具会拒绝清空（防止误删别人的数据）。可以安全删除。\n" +
  "build_demo_glyphs v1\n";

/**
 * 选字优先级表。
 *
 * 前 16 个是 `01-radical.html` 的快捷按钮（投…日）——部首定位演示页
 * 一开就点得到；接着是其余演示页的默认字；最后是常用部件与基本字。
 */
const PRIORITY: string[] = [
  // 01-radical.html：快捷按钮 + 默认值「投」
  "投", "明", "天", "日", "指", "持", "控", "想", "好", "如", "河", "眼", "語", "本", "水", "手",
  // 02-stroke / 03-evolution / 04-lishu / 06-lab / 07-trace 的默认字
  "未", "末", "月", "山",
  // 常用部件与基本字
  "木", "目", "火", "田", "人", "大", "马", "鱼", "口", "禾", "女", "子", "言", "心",
  "元", "气", "石", "竹", "虫", "鸟", "门", "车", "力", "又", "土", "王", "玉",
  "曰", "夫", "弓", "戈", "止", "卜", "干", "午", "牛", "羊", "犬", "豕", "象",
  "瓜", "瓦", "用", "白", "立",
];

/** 层的中文名（写 PROVENANCE.md 用）。 */
const LAYER_LABEL: Record<Layer, string> = {
  oracle: "甲骨文",
  bronze: "金文",
  seal: "篆书",
  clerical: "隶书",
  chuanchao: "傳抄古文",
  chu: "楚文字",
};

/**
 * 演示子集收录的层。
 *
 * **傳抄古文与楚简不收**：这两层在上游 `hanzi-glyphs-svg` 里还没公开
 * （只在作者本地的全量分支上），收进来等于把未发布的上游素材提前发布。
 * 等上游把这两层发出来，把它们加回这个数组重跑即可。
 */
const DEMO_LAYERS: readonly Layer[] = ["oracle", "bronze", "seal", "clerical"];

/**
 * 各层在本仓库里的许可立场。
 *
 * 「授权状态待确认」是**本仓库作者的立场**（见本仓 `THIRD_PARTY_NOTICES.md`），
 * 不是上游的声明——上游 `hanzi-glyphs-svg` 的 `provenance.jsonl` 把汉典那几层
 * 记作 CC0 1.0。两个事实都写进 PROVENANCE.md，不替作者下结论。
 */
const REPO_STANCE: Record<Layer, string> = {
  oracle:
    "**CC BY 4.0**——使用须署名作者与数据集，并注明是否作过修改。",
  seal:
    "**CC0 1.0**（汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务，不署名也可以。",
  bronze:
    "**CC0 1.0**（上游 `hanzi-glyphs-svg` 的 `provenance.jsonl` 记为 CC0 1.0，" +
    "依据汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务；本子集按该口径随库发布。",
  clerical:
    "**CC0 1.0**（上游 `hanzi-glyphs-svg` 的 `provenance.jsonl` 记为 CC0 1.0，" +
    "依据汉典《服务条款》第四条归公宣告）——公有领域奉献，不设义务；本子集按该口径随库发布。",
  chuanchao:
    "**未随本子集发布**：上游 `hanzi-glyphs-svg` 目前只在作者本地的全量分支里有这一层，" +
    "尚未公开；本仓库不复制、不发布。",
  chu:
    "**未随本子集发布**：上游 `hanzi-glyphs-svg` 目前只在作者本地的全量分支里有这一层，" +
    "尚未公开；本仓库不复制、不发布。",
};

/** 一条出处记录（只取本工具用到的字段）。 */
interface ProvRecord {
  path: string;
  license: string;
  license_url: string;
  attribution: string;
  source_dataset: string;
  source_url: string;
  source_record_url: string;
  source_path: string;
  modifications: string;
  retrieved_at: string;
  sha256: string;
  period: string;
  source_book: string;
  modern_char: string;
}

/** 读 `provenance.jsonl`，按 `path` 建索引。 */
function loadProvenance(): Map<string, ProvRecord> {
  const map = new Map<string, ProvRecord>();
  if (!existsSync(PROVENANCE_JSONL)) return map;
  const text = readFileSync(PROVENANCE_JSONL, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Partial<ProvRecord> & { path?: string };
    if (!r.path) continue;
    map.set(r.path, {
      path: r.path,
      license: r.license ?? "",
      license_url: r.license_url ?? "",
      attribution: r.attribution ?? "",
      source_dataset: r.source_dataset ?? "",
      source_url: r.source_url ?? "",
      source_record_url: r.source_record_url ?? "",
      source_path: r.source_path ?? "",
      modifications: r.modifications ?? "",
      retrieved_at: r.retrieved_at ?? "",
      sha256: r.sha256 ?? "",
      period: r.period ?? "",
      source_book: r.source_book ?? "",
      modern_char: r.modern_char ?? "",
    });
  }
  return map;
}

/**
 * 取某一层的「现代字 → 文件名」映射。
 *
 * 优先用 `assets/index/<层>.json`（`tools/build_index.ts` 的产物，演示页在用）；
 * 没有就照同一规则从 `index.csv` 现算——**首个实例优先**，与 `build_index.ts` 一致。
 */
function loadLayerIndex(layer: Layer): Record<string, string> {
  const jsonPath = join(INDEX_ROOT, `${layer}.json`);
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, string>;
  }
  const csvPath = join(GLYPH_ROOT, layer, "index.csv");
  if (!existsSync(csvPath)) return {};
  const table = parseCsv(readFileSync(csvPath, "utf8"));
  const map: Record<string, string> = {};
  for (const rec of table.records) {
    const ch = rec.modern_char ?? "";
    const file = rec.file ?? "";
    if (!ch || !file) continue;
    if (!(ch in map)) map[ch] = file;
  }
  return map;
}

/** 一层里要收的字形。 */
interface PickedGlyph {
  /** 现代字。 */
  char: string;
  /** 文件名（如 `3D000.svg`）。 */
  file: string;
  /** 是否是为了「说文部首」额外收进来的。 */
  isRadicalExtra: boolean;
}

/**
 * 按优先级表在一层里选字。
 *
 * 取不到就跳过（不硬编）；`perLayer` 是上限，不是配额。
 */
function pickChars(index: Record<string, string>, perLayer: number): string[] {
  const picked: string[] = [];
  for (const ch of PRIORITY) {
    if (picked.length >= perLayer) break;
    if (ch in index) picked.push(ch);
  }
  return picked;
}

/**
 * 篆书层额外收「说文部首自己的字形」。
 *
 * 演示页算部首时要按部首码位直接取字形（`loadGlyph("seal", radicalCp + ".svg")`），
 * 不收的话部首定位那一步会断在半路。部首的部首也一并收（传递闭包），
 * 深度很浅（实测最多两层）。
 */
function pickSealRadicalExtras(
  pickedChars: string[],
  index: Record<string, string>,
  registry: Record<string, [number, string, string]>,
): PickedGlyph[] {
  const fileToChar = new Map<string, string>();
  for (const [ch, file] of Object.entries(index)) fileToChar.set(file, ch);

  const extras: PickedGlyph[] = [];
  const resolved = new Set<string>();
  const visited = new Set<string>();
  const queue = [...pickedChars];

  while (queue.length > 0) {
    const ch = queue.shift() as string;
    if (visited.has(ch)) continue;
    visited.add(ch);
    const file = index[ch];
    if (!file) continue;
    const reg = registry[file.replace(/\.svg$/, "")];
    if (!reg) continue;
    const radicalCp = reg[1];
    if (!radicalCp) continue;
    const radicalFile = `${radicalCp}.svg`;
    if (resolved.has(radicalFile)) continue;
    resolved.add(radicalFile);
    const radicalChar = fileToChar.get(radicalFile) ?? registry[radicalCp]?.[2] ?? "";
    extras.push({ char: radicalChar, file: radicalFile, isRadicalExtra: true });
    if (radicalChar) queue.push(radicalChar);
  }
  return extras;
}

/** 安全重建子集目录。 */
function prepareOut(outRoot: string): { glyphsDir: string; dataDir: string } {
  const glyphsDir = join(outRoot, "glyphs");
  const dataDir = join(outRoot, "data");

  const existing = [glyphsDir, dataDir].filter((d) => existsSync(d));
  if (existing.length > 0) {
    const marked = existing.every((d) => existsSync(join(d, MARKER)));
    if (!marked) {
      console.error(
        `拒绝重建：${existing.join("、")} 已存在，但不是本工具生成的目录（缺 ${MARKER} 标记）。\n` +
          "换一个 --out=<目录>，或手动清理后再来。",
      );
      process.exit(1);
    }
    for (const d of existing) rmSync(d, { recursive: true, force: true });
  }

  mkdirSync(glyphsDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(glyphsDir, MARKER), MARKER_BODY, "utf8");
  writeFileSync(join(dataDir, MARKER), MARKER_BODY, "utf8");
  return { glyphsDir, dataDir };
}

/** 目录里的总字节数。 */
function dirBytes(dir: string): number {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else total += st.size;
    }
  }
  return total;
}

/** 一层的产出统计。 */
interface LayerResult {
  layer: Layer;
  /** 收进来的字（现代字 → 文件名），保持选字顺序。 */
  entries: Array<{ char: string; file: string; isRadicalExtra: boolean }>;
  /** 字节数。 */
  bytes: number;
  /** 跳过的字（该层没有）。 */
  missing: string[];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 中日韩字符（含全角标点）——用来判断拼接时要不要留空格。 */
const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/;

/** 把源码里折开的几段拼成一行：中文之间不留空格，西文之间留一个。 */
function joinParts(parts: string[]): string {
  let out = "";
  for (const p of parts) {
    if (out.length === 0) {
      out = p;
      continue;
    }
    const a = out[out.length - 1];
    const b = p[0] ?? "";
    out += CJK.test(a) || CJK.test(b) ? "" : " ";
    out += p;
  }
  return out;
}

/** 生成 PROVENANCE.md。 */
function renderProvenance(
  results: LayerResult[],
  provenance: Map<string, ProvRecord>,
  strokeChars: string[],
  strokeMeta: Record<string, unknown>,
): string {
  const lines: string[] = [];
  /** 追加一行。多个参数会**拼成一行**（长句在源码里折行不影响输出）。 */
  const push = (...parts: string[]) => {
    lines.push(parts.length > 0 ? joinParts(parts) : "");
  };

  push("# 演示子集：出处与许可");
  push();
  push(
    "本文件说明 `demos/glyphs/` 与 `demos/data/` 里**每一份材料**从哪来、什么许可、",
    "发布时必须写什么。",
  );
  push();
  push("子集由 `node tools/build_demo_glyphs.ts` 生成，**可复跑、可逐字节核对**。");
  push();
  push(
    "上游是兄弟仓 [`hanzi-glyphs-svg`](https://github.com/zhouyongh/hanzi-glyphs-svg)，",
    "本仓用 `tools/sync_glyphs.ts` 同步到本地 `assets/`（已 gitignore）；",
    "本子集是**从那份同步结果里挑出来的少量字形**，不是重新抓取的。",
  );
  push();

  // —— 一、总览
  push("## 一、总览");
  push();
  push("| 书体 | 字形数 | 其中「部首附带」 | 字节 |");
  push("|---|---:|---:|---:|");
  for (const r of results) {
    const extras = r.entries.filter((e) => e.isRadicalExtra).length;
    push(`| ${LAYER_LABEL[r.layer]}（\`${r.layer}\`） | ${r.entries.length} | ${extras} | ${formatBytes(r.bytes)} |`);
  }
  push();
  push(
    "「部首附带」指**为了演示页能算部首而额外收进来的说文部首字形**——",
    "演示页按部首码位直接取字形（`loadGlyph(\"seal\", radicalCp + \".svg\")`），",
    "不收这一步会断在半路。它们与正文字形同源同许可。",
  );
  push();

  // —— 二、逐层
  push("## 二、逐层出处与许可");
  push();
  for (const r of results) {
    push(`### ${LAYER_LABEL[r.layer]}（\`${r.layer}\`）`);
    push();
    push(`- **来源**：兄弟仓 \`hanzi-glyphs-svg\` 的 \`glyphs/${r.layer}/\` 层`);
    push(`- **本仓的许可立场**：${REPO_STANCE[r.layer]}`);
    push();

    // 按许可分组
    const groups = new Map<string, PickedGlyph[]>();
    for (const e of r.entries) {
      const rec = provenance.get(`glyphs/${r.layer}/${e.file}`);
      const key = rec?.license || "(无出处记录)";
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    }

    for (const [license, entries] of groups) {
      const recs = entries
        .map((e) => provenance.get(`glyphs/${r.layer}/${e.file}`))
        .filter((x): x is ProvRecord => Boolean(x));

      const isPublicDomain = /^CC0/i.test(license);

      push(`#### 许可：${license}`);
      push();
      const datasets = [...new Set(recs.map((x) => x.source_dataset).filter(Boolean))];
      const attrs = [...new Set(recs.map((x) => x.attribution).filter(Boolean))];
      const mods = [...new Set(recs.map((x) => x.modifications).filter(Boolean))];
      const licenseUrls = [...new Set(recs.map((x) => x.license_url).filter(Boolean))];
      const times = recs.map((x) => x.retrieved_at).filter(Boolean).sort();

      if (datasets.length > 0) {
        push(`- **上游数据集**：${datasets.map((d) => `\`${d}\``).join("、")}`);
      }
      if (licenseUrls.length > 0) {
        push(`- **协议全文**：${licenseUrls.map((u) => `<${u}>`).join("、")}`);
      }
      if (times.length > 0) {
        push(`- **上游取回时刻**：${times[0]} ～ ${times[times.length - 1]}（逐文件记录见下表）`);
      }
      push();

      if (attrs.length > 0) {
        push(
          isPublicDomain
            ? "**上游给的署名语**（CC0 1.0 是公有领域奉献，**不设署名义务**；附在这里是为了可追溯）："
            : "**发布时必须署名的文字**（逐字照抄，CC BY 4.0 §3(a)(1)(A)）：",
        );
        push();
        // markdown 代码围栏。**不要直接写三个反引号**——
        // `tools/check_backticks.ts` 会把这一行当成未闭合的模板字符串而报错。
        push(FENCE);
        for (const a of attrs) push(a);
        push(FENCE);
        push();
      }

      push("**改动声明**");
      push();
      push(
        `- *上游（兄弟仓 \`hanzi-glyphs-svg\`）入库时的改动*：${mods.length > 0 ? mods.join("；") : "（上游未记录）"}`,
      );
      push(
        "- *本子集*：**没有作任何修改**——字形是上游文件的逐字节副本，" +
          "本仓只做了「挑选 + 换目录 + 写索引」这一层，不触及字形内容。",
      );
      push();

      const pickedChars = entries.filter((e) => !e.isRadicalExtra).map((e) => e.char);
      const extraChars = entries.filter((e) => e.isRadicalExtra).map((e) => e.char);
      push(`**收录的字（${pickedChars.length} 个）**：${pickedChars.join(" ")}`);
      if (extraChars.length > 0) {
        push();
        push(`**附带的说文部首字形（${extraChars.length} 个）**：${extraChars.join(" ")}`);
      }
      push();
      push("| 现代字 | 文件 | 上游出处 | 上游 sha256 |");
      push("|---|---|---|---|");
      for (const e of entries) {
        const rec = provenance.get(`glyphs/${r.layer}/${e.file}`);
        const upstream = rec
          ? rec.source_url ||
            (rec.source_record_url ? `${rec.source_record_url} （${rec.source_path}）` : "—")
          : "—";
        push(`| ${e.char} | \`${e.file}\` | ${upstream} | \`${rec?.sha256 ?? "—"}\` |`);
      }
      push();
    }
  }

  // —— 三、配套数据
  push("## 三、配套数据（非字形）");
  push();
  push("### 3.1 `data/index/<层>.json` —— 现代字 → 文件名");
  push();
  push(
    "由 `tools/build_index.ts` 的同一规则产出（**首个实例优先**），只是过滤到子集里的那些字。",
    "演示页用它把「现代字」翻成「要取哪个文件」。",
  );
  push();
  push("### 3.2 `data/radical-forms.json` —— 部首的偏旁形码本");
  push();
  push(
    "**派生数据**：由 `tools/build_radical_forms.ts` 从字形归纳出来（笔画形状描述子 + 覆盖度挑代表），",
    "不是上游素材。",
  );
  push();
  push("- **性质与字形相同**——它是从字形算出来的，许可随所用书体层走；");
  push(
    "- **用途**：给部首定位的**投票法**提供候选偏旁形（实测投票法比模板法准，",
    "但只在归纳出了偏旁形的部上可用）。取不到时演示页退回模板法，照常能跑。",
  );
  push();
  push("### 3.3 `data/seal-radicals.json` —— 说文 540 部登记");
  push();
  push(
    "格式：`{ 篆书码位: [说文部次, 部首码位, 部首字] }`，与 `assets/index/seal-radicals.json` 一致。",
  );
  push();
  push(
    "由兄弟仓 `hanzi-glyphs-svg` 的 `glyphs/seal/external.csv` 整理而成（上游指针来自 Unicode",
    "`SealSources.txt`）。**本子集只登记码位与部首身份，不复制上游字形**，",
    "所以它不构成对上游内容的分发；按本仓惯例，随附 Unicode License v3 的声明",
    "（见本仓 `THIRD_PARTY_NOTICES.md`）。",
  );
  push();
  push("### 3.4 `data/stroke-order/` —— 楷书笔顺");
  push();
  push(
    `- **来源**：[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) ` +
      `（版本 ${String(strokeMeta.version ?? "2.0.1")}）`,
  );
  push(`- **许可**：**Arphic Public License**（许可全文随附于本目录的 \`ARPHICPL.TXT\`）`);
  push(`- **上游取回时刻**：${String(strokeMeta.retrieved_at ?? "—")}`);
  push();
  push(
    "**发布时必须随附**：Arphic Public License 的许可全文（本目录已带 `ARPHICPL.TXT`）与出处声明。",
  );
  push();
  push(
    `收录的字（${strokeChars.length} 个）：${strokeChars.join(" ")}`,
  );
  push();
  push(
    "这里的「楷书笔顺」与本仓甲骨/篆/隶的「落笔顺序」**不是同一套笔顺体系**，",
    "界面与文档里都要说清楚，不能混为一谈。",
  );
  push();

  // —— 四、发布清单
  push("## 四、发布这份子集时必须做的五件事");
  push();
  push(
    "1. **甲骨文层按 CC BY 4.0 署名**：把上面「发布时必须署名的文字」整段照抄，" +
      "并注明本子集作过的改动（挑选 + 逐字节复制）。",
  );
  push(
    "2. **金文 / 隶书按 CC0 1.0 随库发布**——上游 `provenance.jsonl` 记的是 CC0 1.0，" +
      "本子集按该口径发布，不设义务；署名不强制，但署上来源更体面。",
  );
  push(
    "3. **傳抄古文 / 楚简两层不随本子集发布**——上游还没公开这两层，本子集也不收；" +
      "等上游发布（作者会另建公共仓）后，在 `tools/build_demo_glyphs.ts` 的 `DEMO_LAYERS` 里加回来重跑。",
  );
  push(
    "4. **笔顺数据随附 Arphic Public License 全文**（`data/stroke-order/ARPHICPL.TXT` 已在目录里）。",
  );
  push(
    "5. **不要给下游附加额外限制**：CC BY 4.0 §2(a)(5)(B) 与 CC0 的「放弃权利」性质都不允许",
    "附加条件（如「仅限非商业」「禁止再分发」）。",
  );
  push();
  push(
    "本子集里的字形**逐字节等于上游**（sha256 见各层表格），与兄弟仓 `provenance.jsonl` 一一对应；",
    "完整出处记录见兄弟仓的 `glyphs/provenance.jsonl`。",
  );
  push();

  return lines.join("\n");
}

/** 命令行参数。 */
function parseArgs(argv: string[]): { out: string; perLayer: number } {
  let out = "demos";
  let perLayer = 20;
  for (const arg of argv) {
    if (arg.startsWith("--out=")) out = arg.slice("--out=".length);
    else if (arg.startsWith("--per-layer=")) {
      const n = Number(arg.slice("--per-layer=".length));
      if (Number.isFinite(n) && n > 0) perLayer = Math.floor(n);
    }
  }
  return { out, perLayer };
}

function main(): void {
  const { out, perLayer } = parseArgs(process.argv.slice(2));
  const outRoot = resolve(REPO_ROOT, out);

  if (!existsSync(GLYPH_ROOT)) {
    console.error(`找不到本地字形素材：${GLYPH_ROOT}`);
    console.error("先跑 `node tools/sync_glyphs.ts`（同步兄弟仓的字形）。");
    process.exit(1);
  }

  const provenance = loadProvenance();
  const sealRegistry = existsSync(join(INDEX_ROOT, "seal-radicals.json"))
    ? (JSON.parse(readFileSync(join(INDEX_ROOT, "seal-radicals.json"), "utf8")) as Record<
        string,
        [number, string, string]
      >)
    : {};

  const { glyphsDir, dataDir } = prepareOut(outRoot);
  const indexDir = join(dataDir, "index");
  mkdirSync(indexDir, { recursive: true });

  const results: LayerResult[] = [];
  const allChars = new Set<string>();

  for (const layer of DEMO_LAYERS) {
    const index = loadLayerIndex(layer);
    if (Object.keys(index).length === 0) {
      console.log(`${layer}: 本地没有这层，跳过`);
      continue;
    }

    const pickedChars = pickChars(index, perLayer);
    const missing = PRIORITY.filter((ch) => !(ch in index));

    const entries: LayerResult["entries"] = pickedChars.map((char) => ({
      char,
      file: index[char],
      isRadicalExtra: false,
    }));

    if (layer === "seal") {
      entries.push(...pickSealRadicalExtras(pickedChars, index, sealRegistry));
    }

    // 复制字形
    const layerDir = join(glyphsDir, layer);
    mkdirSync(layerDir, { recursive: true });
    const kept: LayerResult["entries"] = [];
    const seenFiles = new Set<string>();
    for (const e of entries) {
      // 同一个文件可能被多个字指到（几个字共用同一个说文部首码位），只留一份
      if (seenFiles.has(e.file)) continue;
      const src = join(GLYPH_ROOT, layer, e.file);
      if (!existsSync(src)) {
        console.log(`  ${layer}/${e.file}（${e.char}）：源文件不存在，跳过`);
        continue;
      }
      copyFileSync(src, join(layerDir, e.file));
      seenFiles.add(e.file);
      kept.push(e);
      allChars.add(e.char);
    }

    // 索引：现代字 → 文件名
    const map: Record<string, string> = {};
    for (const e of kept) {
      if (!(e.char in map)) map[e.char] = e.file;
    }
    writeFileSync(join(indexDir, `${layer}.json`), JSON.stringify(map), "utf8");

    const bytes = dirBytes(layerDir);
    results.push({ layer, entries: kept, bytes, missing });
    console.log(
      `${layer}: ${kept.length} 个字（${kept.filter((e) => e.isRadicalExtra).length} 个部首附带）` +
        ` → ${layerDir}（${formatBytes(bytes)}）`,
    );
    if (missing.length > 0) {
      console.log(`  该层没有的字（跳过）：${missing.join(" ")}`);
    }
  }

  // 配套数据
  const radicalFormsSrc = join(INDEX_ROOT, "radical-forms.json");
  if (existsSync(radicalFormsSrc)) {
    copyFileSync(radicalFormsSrc, join(dataDir, "radical-forms.json"));
    console.log(`偏旁形码本 → ${join(dataDir, "radical-forms.json")}`);
  } else {
    console.log("找不到 assets/index/radical-forms.json，跳过（演示页会退回模板法）");
  }

  const sealRadicalsSrc = join(INDEX_ROOT, "seal-radicals.json");
  if (existsSync(sealRadicalsSrc)) {
    copyFileSync(sealRadicalsSrc, join(dataDir, "seal-radicals.json"));
    console.log(`说文部登记 → ${join(dataDir, "seal-radicals.json")}`);
  } else {
    console.log("找不到 assets/index/seal-radicals.json，跳过（部首定位演示页不可用）");
  }

  // 笔顺
  const strokeDir = join(dataDir, "stroke-order");
  mkdirSync(strokeDir, { recursive: true });
  const strokeChars = [...allChars].filter((ch) => existsSync(join(STROKE_ROOT, `${ch}.json`))).sort();
  for (const ch of strokeChars) {
    copyFileSync(join(STROKE_ROOT, `${ch}.json`), join(strokeDir, `${ch}.json`));
  }
  const aplSrc = join(STROKE_ROOT, "ARPHICPL.TXT");
  if (existsSync(aplSrc)) copyFileSync(aplSrc, join(strokeDir, "ARPHICPL.TXT"));
  let strokeMeta: Record<string, unknown> = {};
  const strokeProv = join(STROKE_ROOT, "PROVENANCE.json");
  if (existsSync(strokeProv)) {
    try {
      strokeMeta = JSON.parse(readFileSync(strokeProv, "utf8")) as Record<string, unknown>;
    } catch {
      strokeMeta = {};
    }
  }
  console.log(`笔顺数据：${strokeChars.length} 个字 → ${strokeDir}`);

  // 出处说明
  const provPath = join(dataDir, "PROVENANCE.md");
  writeFileSync(provPath, renderProvenance(results, provenance, strokeChars, strokeMeta), "utf8");
  console.log(`出处与许可 → ${provPath}`);

  const total = dirBytes(glyphsDir) + dirBytes(dataDir);
  console.log(
    `\n子集总大小：${formatBytes(total)}（${glyphsDir} + ${dataDir}）` +
      `\n字形 ${results.reduce((n, r) => n + r.entries.length, 0)} 个` +
      `，笔顺 ${strokeChars.length} 个`,
  );
}

main();
