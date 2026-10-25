/**
 * 本地字形仓（只读）。
 *
 * 字形来自兄弟仓库 `hanzi-glyphs-svg`，由 `tools/sync_glyphs.ts` 同步到本地
 * `assets/glyphs/`。**这些文件不在版本库里**，本模块只在本机跑批处理时使用。
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGlyphSvg, type Glyph } from "../../src/glyph.ts";
import { parseCsv } from "./csv.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(HERE, "..", "..");
export const ASSETS_ROOT = resolve(REPO_ROOT, "assets", "glyphs");

/** 书体层。 */
export const LAYERS = ["oracle", "bronze", "seal", "clerical", "chuanchao", "chu"] as const;
export type Layer = (typeof LAYERS)[number];

/** 一条字形索引记录。 */
export interface GlyphRow {
  /** 层的条目键：甲骨/金文/隶书等是条目号，篆书是篆书区块码位。 */
  glyphId: string;
  /** 篆书区块码位（篆书层专有；其它层为空）。 */
  codepoint: string;
  modernChar: string;
  unicode: string;
  period: string;
  sourceBook: string;
  sourceNumber: string;
  file: string;
  sha256: string;
  [k: string]: string;
}

/** 某一层的字形索引。 */
export class LayerIndex {
  readonly rows: GlyphRow[] = [];
  readonly layer: Layer;
  private readonly codepointIndex = new Map<string, GlyphRow>();
  private readonly charIndex = new Map<string, GlyphRow[]>();
  private readonly idIndex = new Map<string, GlyphRow>();

  constructor(layer: Layer) {
    this.layer = layer;
    const csvPath = join(ASSETS_ROOT, layer, "index.csv");
    if (!existsSync(csvPath)) return;
    const table = parseCsv(readFileSync(csvPath, "utf8"));
    for (const rec of table.records) {
      const row: GlyphRow = {
        glyphId: rec.glyph_id ?? "",
        codepoint: (rec.codepoint ?? "").replace(/^U\+/, ""),
        modernChar: rec.modern_char ?? "",
        unicode: rec.unicode ?? "",
        period: rec.period ?? "",
        sourceBook: rec.source_book ?? "",
        sourceNumber: rec.source_number ?? "",
        file: rec.file ?? "",
        sha256: rec.sha256 ?? "",
      };
      this.rows.push(row);
      const key = row.glyphId || row.codepoint;
      if (key) this.idIndex.set(key, row);
      if (row.codepoint) {
        if (!this.codepointIndex.has(row.codepoint)) this.codepointIndex.set(row.codepoint, row);
      }
      if (row.unicode) {
        const cp = row.unicode.toUpperCase().replace(/^U\+/, "").padStart(4, "0");
        if (!this.codepointIndex.has(cp)) this.codepointIndex.set(cp, row);
      }
      if (row.modernChar) {
        const list = this.charIndex.get(row.modernChar) ?? [];
        list.push(row);
        this.charIndex.set(row.modernChar, list);
      }
    }
  }

  /** 按码位取记录。 */
  byCodepoint(cp: string): GlyphRow | undefined {
    return this.codepointIndex.get(cp.toUpperCase().replace(/^U\+/, "").padStart(4, "0"));
  }

  /** 按条目键取记录（条目号或篆书码位）。 */
  byGlyphId(id: string): GlyphRow | undefined {
    return this.idIndex.get(id) ?? this.idIndex.get(id.toUpperCase());
  }

  /** 按现代字取记录（可能多个，取第一个）。 */
  byChar(char: string): GlyphRow | undefined {
    return this.charIndex.get(char)?.[0];
  }

  /** 按现代字取全部记录。 */
  allByChar(char: string): GlyphRow[] {
    return this.charIndex.get(char) ?? [];
  }
}

/** 字形仓：索引 + SVG 读取。 */
export class GlyphStore {
  readonly root: string;
  private readonly indexes = new Map<Layer, LayerIndex>();
  private readonly cache = new Map<string, Glyph>();

  /** 字形缓存上限。超过就按先进先出淘汰。 */
  private readonly cacheLimit: number;

  constructor(root = ASSETS_ROOT, cacheLimit = 256) {
    this.root = root;
    this.cacheLimit = cacheLimit;
  }

  /** 某层的索引（惰性加载）。 */
  index(layer: Layer): LayerIndex {
    let idx = this.indexes.get(layer);
    if (!idx) {
      idx = new LayerIndex(layer);
      this.indexes.set(layer, idx);
    }
    return idx;
  }

  /** 字形文件路径。 */
  filePath(layer: Layer, file: string): string {
    return join(this.root, layer, file);
  }

  /** 读一个字形（带缓存）。 */
  glyph(layer: Layer, file: string): Glyph | null {
    const key = `${layer}/${file}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const p = this.filePath(layer, file);
    if (!existsSync(p)) return null;
    const g = parseGlyphSvg(readFileSync(p, "utf8"));
    // 缓存要有上限：全量跑数据时字形数以万计，无上限缓存会把内存吃光
    // （实测跑到 2 千字时 RSS 已到 2.9 GB，机器被挤得连浏览器都卡住）。
    this.cache.set(key, g);
    if (this.cache.size > this.cacheLimit) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return g;
  }

  /** 某层是否已同步。 */
  has(layer: Layer): boolean {
    return existsSync(join(this.root, layer, "index.csv"));
  }

  /** 已同步的层。 */
  availableLayers(): Layer[] {
    return LAYERS.filter((l) => this.has(l));
  }

  /** 统计某层的字形文件数。 */
  countFiles(layer: Layer): number {
    const dir = join(this.root, layer);
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter((f) => f.endsWith(".svg")).length;
  }
}

/** 篆书全量码位登记表（说文部首信息）。 */
export interface SealRegistryRow {
  codepoint: string;
  unicode: string;
  modernChar: string;
  radicalNo: string;
  radicalCp: string;
  ccz: string;
  dyc: string;
  qjz: string;
  thx: string;
  upstreamPath: string;
  upstreamBlobSha1: string;
  note: string;
}

/** 读篆书登记表。 */
export function loadSealRegistry(root = ASSETS_ROOT): SealRegistryRow[] {
  const p = join(root, "seal", "external.csv");
  if (!existsSync(p)) return [];
  const table = parseCsv(readFileSync(p, "utf8"));
  return table.records.map((rec) => ({
    codepoint: (rec.codepoint ?? "").replace(/^U\+/, ""),
    unicode: rec.unicode ?? "",
    modernChar: rec.modern_char ?? "",
    radicalNo: rec.radical_no ?? "",
    radicalCp: rec.radical_cp ?? "",
    ccz: rec.ccz ?? "",
    dyc: rec.dyc ?? "",
    qjz: rec.qjz ?? "",
    thx: rec.thx ?? "",
    upstreamPath: rec.upstream_path ?? "",
    upstreamBlobSha1: rec.upstream_blob_sha1 ?? "",
    note: rec.note ?? "",
  }));
}
