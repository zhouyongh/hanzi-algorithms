import { readFileSync } from "node:fs";
const lines = readFileSync("tools/eval_structure.ts", "utf8").split(/\r?\n/);
const BT = String.fromCharCode(96);
lines.forEach((l, i) => {
  const n = l.split(BT).length - 1;
  if (n % 2 === 1) {
    console.log((i + 1) + ": " + n + " 个反引号 → " + l.slice(0, 110));
  }
});
