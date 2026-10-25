/**
 * 打包演示页用的第三方库（vendor）。
 *
 * 产出：
 * - `demos/lib/vendor/anime.iife.min.js` —— anime.js v4 的 IIFE，暴露全局 `Anime`
 * - `demos/lib/vendor/hanzi-writer.iife.min.js` —— hanzi-writer 的 IIFE，暴露全局 `HanziWriter`
 * - 对应的 `*.LICENSE.md` —— 上游许可全文（MIT 第 1 款要求随附）
 *
 * 为什么 vendor 而不是走 CDN：
 * - 演示页要「零构建、任何静态服务器都能跑」——包括离线、断网的内网环境；
 * - 上游版本要**钉死**，不能哪天 CDN 换版本就把演示页搞坏了；
 * - 许可上要把 MIT 全文随附在文件旁边，而不是只留一行「MIT」。
 *
 * 为什么**不**进 `src/`：
 * 算法库本身必须运行时零依赖（下游要能直接 `import` 我们的算法去算，
 * 不该被拖上一个动画引擎）。第三方库只服务于演示层。
 *
 * 数据不在这里：hanzi-writer 的笔顺数据（hanzi-writer-data，Arphic Public License）
 * 由 `tools/sync_stroke_order.ts` 同步到本地 `assets/stroke-order/`（已 gitignore，不发布）。
 *
 * 用法：
 *   node tools/build_vendor.ts
 */

import { build } from "esbuild";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";

const OUT_DIR = join(REPO_ROOT, "demos", "lib", "vendor");

interface VendorSpec {
  /** 裁剪入口。 */
  entry: string;
  /** 产物文件名。 */
  out: string;
  /** 全局变量名。 */
  global: string;
  /** 上游许可文件（相对 node_modules）。 */
  license: string;
  /** 许可产物文件名。 */
  licenseOut: string;
  /** 产物头部注释。 */
  banner: string;
  /**
   * 产物尾部附加代码。
   *
   * esbuild 的 IIFE + `globalName` 把**模块命名空间对象**挂到全局上：
   * `window.HanziWriter` 会是 `{ HanziWriter: 类 }`，而不是类本身。
   * 上游 hanzi-writer 自己的 UMD 产物是把**类**挂上去的（`window.HanziWriter.create(...)`），
   * 这里补一段把它摊平，演示页的调用方式才和上游一致。
   */
  footer?: string;
}

const VENDORS: VendorSpec[] = [
  {
    entry: join(REPO_ROOT, "tools", "vendor", "anime-entry.ts"),
    out: "anime.iife.min.js",
    global: "Anime",
    license: join("animejs", "LICENSE.md"),
    licenseOut: "anime.LICENSE.md",
    banner:
      "/* anime.js v4 —— 由 tools/build_vendor.ts 生成，请勿手改。\n" +
      "   上游 https://github.com/juliangarnier/anime ，MIT 许可，全文见 anime.LICENSE.md */",
  },
  {
    entry: join(REPO_ROOT, "tools", "vendor", "hanzi-writer-entry.ts"),
    out: "hanzi-writer.iife.min.js",
    global: "HanziWriter",
    license: join("hanzi-writer", "LICENSE"),
    licenseOut: "hanzi-writer.LICENSE.md",
    banner:
      "/* hanzi-writer —— 由 tools/build_vendor.ts 生成，请勿手改。\n" +
      "   上游 https://github.com/chanind/hanzi-writer ，MIT 许可，全文见 hanzi-writer.LICENSE.md */",
    footer:
      "/* 摊平：让全局是类本身，与上游 UMD 产物的用法一致（window.HanziWriter.create） */\n" +
      "if (typeof HanziWriter !== \"undefined\" && HanziWriter && HanziWriter.HanziWriter) {\n" +
      "  HanziWriter = HanziWriter.HanziWriter;\n" +
      "}",
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const v of VENDORS) {
    const out = join(OUT_DIR, v.out);
    await build({
      entryPoints: [v.entry],
      outfile: out,
      bundle: true,
      minify: true,
      format: "iife",
      globalName: v.global,
      target: "es2022",
      platform: "browser",
      legalComments: "inline",
      banner: { js: v.banner },
      footer: v.footer ? { js: v.footer } : undefined,
    });
    // MIT 第 1 款：许可声明要随附在软件的所有副本里
    copyFileSync(join(REPO_ROOT, "node_modules", v.license), join(OUT_DIR, v.licenseOut));
    const kb = (statSync(out).size / 1024).toFixed(0);
    console.log(`已打包 → ${out}（${kb} KB）　许可 → ${v.licenseOut}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
