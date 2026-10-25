/**
 * 把算法库打包成演示页可直接引用的经典脚本。
 *
 * 产出：`demos/lib/hanzi-algorithms.js`——一个 IIFE，暴露全局 `HanziAlgorithms`。
 *
 * 为什么不用 ES module 直连 `dist/`：
 * - 演示页要「零构建、任何静态服务器都能跑」，经典脚本最省事；
 * - 模块图会把演示页绑死在浏览器的模块加载器上（实测某些环境下模块脚本
 *   的加载会卡住，而同样的 URL 用 fetch 取完全正常）。
 *
 * 用法：
 *   node tools/build_bundle.ts
 */

import { build } from "esbuild";
import { statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";

const OUT = join(REPO_ROOT, "demos", "lib", "hanzi-algorithms.js");

async function main(): Promise<void> {
  await build({
    entryPoints: [join(REPO_ROOT, "src", "index.ts")],
    outfile: OUT,
    bundle: true,
    format: "iife",
    globalName: "HanziAlgorithms",
    target: "es2022",
    platform: "browser",
    legalComments: "inline",
    banner: {
      js: "/* hanzi-algorithms —— 由 tools/build_bundle.ts 生成，请勿手改。源在 src/ */",
    },
  });
  const kb = (statSync(OUT).size / 1024).toFixed(0);
  console.log(`已打包 → ${OUT}（${kb} KB）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
