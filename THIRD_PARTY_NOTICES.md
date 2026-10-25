# 第三方署名与权利保留

本文件记录 hanzi-algorithms 使用的第三方材料、它们的许可，以及本仓库的改动。

## 一、本仓库自己的产出

| 范围 | 许可 | 全文 |
|---|---|---|
| `src/**`、`tools/**`、`demos/**`、`tests/**`（代码） | MIT | [LICENSE-CODE](LICENSE-CODE) |
| `README.md`、`AGENTS.md`、本文件等（文档） | CC0 1.0 | [LICENSE-DOCS](LICENSE-DOCS) |

## 二、本仓库**不发布**的字形素材

字形来自兄弟仓库 [`hanzi-glyphs-svg`](https://github.com/zhouyongh/hanzi-glyphs-svg)，
由 `tools/sync_glyphs.ts` 同步到本地 `assets/` 目录。**`assets/` 与由它派生的 `data/`
都在 `.gitignore` 里，不随本仓库分发。**

下面是这些素材的来源与许可状态，供使用者在自己的项目里引用时照着署名：

| 书体 | 来源 | 许可状态 |
|---|---|---|
| 甲骨文 | Li, Qing-sheng & Bian, Yu-lin (2026), *Oracle Bone Glyphs: Parametric Vector Dataset (v0.3)*，DOI [`10.5281/zenodo.22467946`](https://doi.org/10.5281/zenodo.22467946) | **CC BY 4.0**——使用须署名「Li, Qing-sheng & Bian, Yu-lin (2026), Oracle Bone Glyphs: Parametric Vector Dataset (v0.3)」，并注明是否作过修改 |
| 篆书 | 汉典（zdic.net）「书法」小篆实例 | **CC0 1.0**——无义务 |
| 金文 / 隶书 | 汉典（zdic.net）「书法」对应书体实例 | **CC0 1.0**——上游已公开（汉典《服务条款》第四条归公宣告），本仓只取少量演示子集 |
| 傳抄古文 / 楚简 | 汉典（zdic.net）「书法」对应书体实例 | **未发布**——上游 `hanzi-glyphs-svg` 尚未公开这两层（只在作者本地全量分支上）；本仓库不复制、不发布，演示子集也不收 |

完整的逐条出处记录（每个字形的 source URL、sha256、抓取时间、底本信息）见
`hanzi-glyphs-svg` 仓的 `glyphs/provenance/`。

**本仓库对这些字形没有主张任何权利**：它们是上游的字形，本仓库只做算法。
派生数据（`data/*.jsonl`、部首定位结果、笔画对应关系等）是从字形算出来的，
性质与字形相同，因此同样不随库发布。

## 二之二、本仓库**发布**的演示用字形子集

为了让演示页**开箱即用**（clone 下来就能点，不用先同步 631 MB 素材），
本仓库带了一小份**演示子集**：`demos/glyphs/`（甲骨 / 金文 / 篆 / 隶四层，每层二十来个字）与 `demos/data/`
（索引、偏旁形码本、说文部登记表、楷书笔顺数据）。

- 逐层的来源、取了哪些字、许可与署名要求，写在
  [`demos/data/PROVENANCE.md`](demos/data/PROVENANCE.md)；
- **字形的许可与上面那张表一致**：甲骨文是 **CC BY 4.0**（须署名，见 PROVENANCE.md），
  篆书 / 金文 / 隶书是 **CC0 1.0**；
- **傳抄古文 / 楚简不随本仓发布**：上游还没公开这两层，演示子集也不收；
  等上游发布后再加回 `tools/build_demo_glyphs.ts` 的 `DEMO_LAYERS` 重跑；
- `demos/data/radical-forms.json`（偏旁形码本）与 `demos/data/seal-radicals.json`
  （说文部登记表）是从字形**算出来/整理出来**的派生数据，性质与字形相同；
- `demos/data/stroke-order/` 里的楷书笔顺数据来自
  [`hanzi-writer-data`](https://github.com/chanind/hanzi-writer-data)，
  按 **Arphic Public License** 发布（许可全文见该仓的 `ARPHICPL.TXT`，
  本地同步的那份也放在 `demos/data/stroke-order/` 里）。

使用演示子集时，请照 `demos/data/PROVENANCE.md` 里的要求署名。


## 三、算法生成物的性质声明

本库有两类输出是**算法生成**的，不是任何历史书体的摹本，使用时必须如实标注：

1. **形变插值的中间形态**（`src/morph/interpolate.ts`）
   ——「甲骨 → 篆」之间的每一帧都是算法算出来的过渡形，用来演示「形变」这件事，
   不能当作史料引用。

2. **隶变结果**（`src/morph/lishu.ts`）
   ——按圆转方折、线条波磔、横平竖直、象形性降低四条规则做的几何变换，
   用来演示「篆书被这样处理会走向隶书」，**不是隶书摹本**。
   真实隶书字形需要另行取得授权后单独入库。

## 四、第三方软件

### 4.1 算法层：运行时零依赖

`src/**` 只用 TypeScript / JavaScript 标准库，**没有运行时依赖**。
下游 `import` 本库的算法不需要装任何东西。

### 4.2 演示层：vendor 的第三方库

演示页（`demos/**`）用两个第三方动画库。它们**只服务于演示层**，
不进入 `src/**`，因此不影响上面的「运行时零依赖」。

| 库 | 版本 | 许可 | 用途 | 随附位置 |
|---|---|---|---|---|
| [anime.js](https://github.com/juliangarnier/anime) | 4.5.0 | **MIT** | 通用动画引擎：时间线、缓动、逐帧回调、SVG 描边绘制 | `demos/lib/vendor/anime.iife.min.js` + `anime.LICENSE.md` |
| [hanzi-writer](https://github.com/chanind/hanzi-writer) | 3.7.3 | **MIT** | 汉字笔顺动画的现成底子：真笔顺数据 + 逐笔书写动画 | `demos/lib/vendor/hanzi-writer.iife.min.js` + `hanzi-writer.LICENSE.md` |

两者都由 `tools/build_vendor.ts` 从 `node_modules` 裁剪打包（**版本钉死**，
产物入库以保证「零构建、离线可跑」），MIT 许可全文随附在产物旁边——
这是 MIT 第 1 款的要求。

### 4.3 笔顺数据：只同步到本地，不发布

演示页里的**现代字楷书笔顺**来自
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)，
按 **Arphic Public License** 发布（由 Arphic Technology 的字库抽取）。

- 数据由 `tools/sync_stroke_order.ts` 同步到本地 `assets/stroke-order/`
  ——**已 gitignore，不入库、不发布**；
- 许可原文 `ARPHICPL.TXT` 与出处记录 `PROVENANCE.json` 一并落在该目录，便于复核；
- 这里的「楷书笔顺」与本仓甲骨/篆/隶的「落笔顺序」**不是同一套笔顺体系**，
  界面与文档里都要说清楚，不能混为一谈。

本仓库对这些笔顺数据没有主张任何权利：它们是上游的数据，本仓库只做演示。

### 4.4 开发期依赖

见 `package.json` 的 `devDependencies`：

| 包 | 许可 | 用途 |
|---|---|---|
| [typescript](https://github.com/microsoft/TypeScript) | Apache-2.0 | 编译与类型检查 |
| [vitest](https://github.com/vitest-dev/vitest) | MIT | 测试运行器 |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | MIT | Node 类型定义 |
| [esbuild](https://github.com/evanw/esbuild) | MIT | 打包演示页的算法与 vendor 库 |
| [animejs](https://github.com/juliangarnier/anime) | MIT | vendor 源（4.5.0） |
| [hanzi-writer](https://github.com/chanind/hanzi-writer) | MIT | vendor 源（3.7.3） |
| [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | **Arphic Public License** | 笔顺数据源（同步到本地 `assets/`，不发布） |

本机渲染回退用的系统字体（Windows 自带的 `simsun` / `simkai` / `simhei` / `msyh` 等）
**不随库分发**。若引入开源字体（如 Noto Serif CJK，SIL OFL 1.1），其署名与许可
须按 OFL 要求随分发物提供。

## 五、反馈

若你是上述材料的权利人并认为本仓库的用法侵犯了你的权利，请通过 Issue 或
<1279190619@qq.com> 联系我们；我们会核实后移除相应内容。

本仓库的第三方材料清单是**逐项**的：每一层字形来自哪里、什么许可、署名怎么写，
都能在上面的表格与兄弟仓库的出处记录里逐条查到。
