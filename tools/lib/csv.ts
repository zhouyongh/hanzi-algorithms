/**
 * 极简 CSV 解析（无依赖）。
 *
 * 只处理本仓用到的 CSV：字段里没有换行、没有转义引号，字段值本身不含逗号
 * （若含逗号则用双引号包住——这层也支持）。
 */

export interface CsvTable {
  header: string[];
  rows: string[][];
  /** 行号 → 字段名 → 值 */
  records: Array<Record<string, string>>;
}

/** 拆一行 CSV（支持双引号包裹的字段）。 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** 解析整份 CSV 文本。 */
export function parseCsv(text: string): CsvTable {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [], records: [] };
  const header = parseCsvLine(lines[0]).map((h) => h.replace(/^﻿/, ""));
  const rows: string[][] = [];
  const records: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row: string[] = [];
    for (let c = 0; c < header.length; c += 1) row.push(cells[c] ?? "");
    rows.push(row);
    const rec: Record<string, string> = {};
    header.forEach((h, c) => { rec[h] = row[c]; });
    records.push(rec);
  }
  return { header, rows, records };
}
