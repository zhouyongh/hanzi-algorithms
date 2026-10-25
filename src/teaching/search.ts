/**
 * E3 字表索引与检索。
 *
 * 教学应用常见的入口：「按部首查字」「按笔画数筛字」「按结构筛形声字」。
 * 这些都是对一张字表的过滤，本模块把字表变成可查询的索引。
 *
 * 字表条目由上游数据生成（`tools/build_data.ts` 的 `decomposition.jsonl` /
 * `metrics.jsonl` / `radicals.jsonl`），本模块只定义结构与查询，不关心数据从哪来。
 */

import type { StructureCode } from "../structure/decomposition.ts";
import type { Script } from "../data/types.ts";

/** 字表里的一条。 */
export interface GlyphEntry {
  /** 现代字。 */
  char: string;
  /** 书体。 */
  script: Script;
  /** 笔画数。 */
  strokes: number;
  /** 说文部次（若已定位）。 */
  radicalNo?: number;
  /** 构形结构符（若已分解）。 */
  structure?: StructureCode;
  /** 该字的 Unicode 码位。 */
  unicode?: string;
  /** 自由附加字段。 */
  [k: string]: unknown;
}

/** 检索条件。 */
export interface GlyphQuery {
  /** 精确匹配现代字。 */
  char?: string;
  /** 书体。 */
  script?: Script;
  /** 说文部次。 */
  radicalNo?: number;
  /** 笔画数（精确）。 */
  strokes?: number;
  /** 笔画数区间（含端点）。 */
  strokesRange?: [number, number];
  /** 构形结构符。 */
  structure?: StructureCode;
  /** 结果条数上限。 */
  limit?: number;
}

/** 可检索的字表。 */
export class GlyphIndex {
  private readonly entries: GlyphEntry[];
  private readonly charMap = new Map<string, GlyphEntry[]>();
  private readonly radicalMap = new Map<number, GlyphEntry[]>();
  private readonly scriptMap = new Map<Script, GlyphEntry[]>();
  private readonly structureMap = new Map<string, GlyphEntry[]>();

  constructor(entries: GlyphEntry[]) {
    this.entries = entries.slice();
    for (const e of this.entries) {
      push(this.charMap, e.char, e);
      if (e.radicalNo !== undefined) push(this.radicalMap, e.radicalNo, e);
      push(this.scriptMap, e.script, e);
      if (e.structure) push(this.structureMap, e.structure, e);
    }
  }

  /** 条目总数。 */
  get size(): number {
    return this.entries.length;
  }

  /** 全部条目。 */
  all(): GlyphEntry[] {
    return this.entries.slice();
  }

  /** 按现代字取（可能多字一形）。 */
  byChar(char: string): GlyphEntry[] {
    return (this.charMap.get(char) ?? []).slice();
  }

  /** 按说文部次取。 */
  byRadical(no: number): GlyphEntry[] {
    return (this.radicalMap.get(no) ?? []).slice();
  }

  /** 按书体取。 */
  byScript(script: Script): GlyphEntry[] {
    return (this.scriptMap.get(script) ?? []).slice();
  }

  /** 按构形结构符取。 */
  byStructure(code: StructureCode): GlyphEntry[] {
    return (this.structureMap.get(code) ?? []).slice();
  }

  /** 出现过哪些说文部次（升序）。 */
  radicalNumbers(): number[] {
    return [...this.radicalMap.keys()].sort((a, b) => a - b);
  }

  /** 出现过哪些结构符。 */
  structures(): StructureCode[] {
    return [...this.structureMap.keys()] as StructureCode[];
  }

  /**
   * 组合检索。
   *
   * 条件之间是「与」；`limit` 只截断结果，不影响排序。
   */
  query(q: GlyphQuery): GlyphEntry[] {
    let pool: GlyphEntry[] = this.entries;
    if (q.char !== undefined) pool = pool.filter((e) => e.char === q.char);
    if (q.script !== undefined) pool = pool.filter((e) => e.script === q.script);
    if (q.radicalNo !== undefined) pool = pool.filter((e) => e.radicalNo === q.radicalNo);
    if (q.structure !== undefined) pool = pool.filter((e) => e.structure === q.structure);
    if (q.strokes !== undefined) pool = pool.filter((e) => e.strokes === q.strokes);
    if (q.strokesRange) {
      const [lo, hi] = q.strokesRange;
      pool = pool.filter((e) => e.strokes >= lo && e.strokes <= hi);
    }
    if (q.limit !== undefined && pool.length > q.limit) pool = pool.slice(0, q.limit);
    return pool;
  }
}

/** 往 Map 里追加。 */
function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * 按说文部次分组（说文 540 部）。
 *
 * 返回的是「部 → 部里的字」，部次升序。
 */
export function groupByRadical(index: GlyphIndex): Array<{ radicalNo: number; entries: GlyphEntry[] }> {
  return index.radicalNumbers().map((no) => ({ radicalNo: no, entries: index.byRadical(no) }));
}

/**
 * 部件频次统计：哪些部件最常用。
 *
 * 教学应用里「部首排行」是常见需求。
 */
export function radicalFrequency(index: GlyphIndex): Array<{ radicalNo: number; count: number }> {
  const counts = new Map<number, number>();
  for (const e of index.all()) {
    if (e.radicalNo === undefined) continue;
    counts.set(e.radicalNo, (counts.get(e.radicalNo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([radicalNo, count]) => ({ radicalNo, count }))
    .sort((a, b) => b.count - a.count || a.radicalNo - b.radicalNo);
}
