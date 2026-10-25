/** 检查所有 .ts / .html 文件里有没有奇数个反引号（未闭合的模板字符串）。 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BT = String.fromCharCode(96);
const roots = ["src", "tools", "tests", "demos"];
let bad = 0;

const FENCE = BT.repeat(3);

function check(file: string) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let inFence = false;
  lines.forEach((l, i) => {
    // markdown 代码围栏（可带列表符号 / 引用符号前缀）开合各一行，不是模板字符串
    const t = l.trim().replace(/^[*>\-+]\s*/, "").trim();
    if (t.startsWith(FENCE)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const n = l.split(BT).length - 1;
    if (n % 2 === 1) {
      bad += 1;
      console.log(`${file}:${i + 1}  ${n} 个反引号 → ${l.trim().slice(0, 100)}`);
    }
  });
}

function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "assets" || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".ts") || name.endsWith(".html")) check(p);
  }
}

for (const r of roots) {
  try { walk(r); } catch { /* 目录不存在 */ }
}
console.log(bad === 0 ? "全部文件反引号配对正常" : `发现 ${bad} 处未闭合`);
process.exit(bad === 0 ? 0 : 1);
