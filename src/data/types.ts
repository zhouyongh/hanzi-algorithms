/**
 * 数据集读取（JSONL）。
 *
 * 本库不发布字形，也不发布从字形派生的数据（见 `LICENSE-DATA`）。
 * 这里的类型定义描述的是**数据结构**，供下游在自己的数据上套用同一套算法。
 *
 * 数据格式沿用兄弟仓库 `hanzi-glyphs-svg` 的惯例：**JSONL 为事实源**
 * （一行一条记录，可 diff、可 grep），构建产物（SQLite 等）不入库。
 */

import type { StructureCode } from "../structure/decomposition.ts";

/** 书体。 */
export type Script =
  | "oracle"    // 甲骨文
  | "bronze"    // 金文
  | "seal"      // 篆书
  | "clerical"  // 隶书
  | "chuanchao" // 傳抄古文
  | "chu";      // 楚简

/** 书体的中文名与默认书写方向。 */
export const SCRIPT_META: Record<Script, { name: string; vertical: boolean }> = {
  oracle: { name: "甲骨文", vertical: false },
  bronze: { name: "金文", vertical: false },
  seal: { name: "篆书", vertical: false },
  clerical: { name: "隶书", vertical: false },
  chuanchao: { name: "傳抄古文", vertical: false },
  chu: { name: "楚简", vertical: false },
};

/**
 * 部首表的一条记录。
 *
 * 说文 540 部与康熙 214 部口径不同，**不做合并**，各自成表。
 */
export interface RadicalRecord {
  /** 部首编号（说文部次 / 康熙部次）。 */
  radicalNo: number;
  /** 所属体系。 */
  system: "shuowen" | "kangxi";
  /** 部首字。 */
  char: string;
  /** 部首字在对应书体里的码位。 */
  codepoint: string;
  /** 部首字形路径（相对字形仓）。 */
  glyphPath: string;
  /** 该部首覆盖的现代字数。 */
  coverage: number;
}

/** 构件分解的一条记录。 */
export interface DecompositionRecord {
  /** 现代字。 */
  char: string;
  /** 书体。 */
  script: Script;
  /** 结构符。 */
  structure: StructureCode;
  /** 构件列表（第一个通常是部首）。 */
  components: Array<{ char: string; pathIndices: number[] }>;
  /** 置信度 [0, 1]。 */
  confidence: number;
  /** 是否有人工核验。 */
  verified: boolean;
}

/** 演变对应的一条记录。 */
export interface EvolutionRecord {
  /** 现代字。 */
  char: string;
  /** 演变链上的书体序列。 */
  chain: Script[];
  /** 各段对应的字形路径。 */
  glyphPaths: string[];
  /** 各段笔画对应关系（源 → 目标）。 */
  correspondences: Array<Array<{ from: number; to: number; overlap: number }>>;
  /** 整体置信度。 */
  confidence: number;
}

/** 字形度量的一条记录。 */
export interface MetricRecord {
  /** 现代字。 */
  char: string;
  /** 书体。 */
  script: Script;
  /** 笔画数。 */
  strokes: number;
  /** 墨迹外接框（相对 viewBox 归一化到 0..1）。 */
  bounds: { x: number; y: number; width: number; height: number };
  /** 重心（相对 viewBox 归一化到 0..1）。 */
  centroid: { x: number; y: number };
  /** 最长笔画的方向（弧度）。 */
  mainAngle: number;
}

/** 解析 JSONL 文本为记录数组。跳过空行与解析失败的行。 */
export function parseJsonl<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      // 坏行跳过：数据是派生产物，一条坏行不该让整份表读不出来
    }
  }
  return out;
}
