import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** 把相对导入统一成 .ts 扩展名（Node 原生跑 TypeScript 的约定）。 */
function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!name.endsWith(".ts")) continue;
    const src = readFileSync(p, "utf8");
    const out = src
      .replace(/(from\s+["'][^"']*?)\.js(["'])/g, "$1.ts$2")
      .replace(/(import\(\s*["'][^"']*?)\.js(["'])/g, "$1.ts$2");
    if (out !== src) {
      writeFileSync(p, out);
      console.log("rewrote", p);
    }
  }
}

for (const d of process.argv.slice(2)) walk(d);
