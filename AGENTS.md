# AGENTS.md

## 通用技能库

跨仓库技能统一在 `D:\yohan\skills\`（目录见其 `INDEX.md`）。执行通用任务（配图、发布、写规范/规格/方案文档等）时，先查技能库有无对应技能：有则读其 `SKILL.md` 并遵循，技能库是这些规范的唯一事实源；没有才用本仓库自带做法。仓库特有的事实（文章放哪、本仓库主题）仍以本文件为准。

## 用途

汉字**结构计算库**：输入字形 SVG，输出结构化的结果——部首在哪、笔画怎么切、构件怎么拆、字怎么演变、版面怎么排、描红打几分。

- 收录各种汉字算法（A 部首 / B 形变 / C 演变 / D 排版 / E 教学辅助）
- 供上层项目引用；本仓库做算法与示例应用，不做游戏、不做业务应用
- 附一组**零构建的演示页** `demos/`（人工核验用）：
  `demos/index.html` 是**单页 Tab 浏览页**（一个页面分 Tab 看全部算法，
  结构照兄弟仓 `hanzi-glyphs-svg` 的 viewer），各算法页 `01-`…`07-` 既是独立页面，
  也是被单页浏览页 iframe 内嵌的内容（内嵌时带 `?embed=1`，演示页据此隐藏自己的导航）

## 与兄弟仓库的关系

```
hanzi-glyphs-svg     字形层   字形文件 + 出处（数据）
hanzi-relations      关系层   字↔释义/异体/版本（数据，待建）
hanzi-algorithms     算法层   结构计算 + 形变 + 排版（代码 + 示例）  ← 本仓库
```

本仓库**不复制字形**。字形来自 `hanzi-glyphs-svg`，由 `tools/sync_glyphs.ts` 同步到本地 `assets/`（已 gitignore），演示与测试从这里读。

## 目录

```
hanzi-algorithms/
  AGENTS.md / README.md
  THIRD_PARTY_NOTICES.md
  LICENSE-CODE            MIT 全文（src / tools / demos / tests）
  LICENSE-DOCS            CC0 1.0 全文（文档）
  LICENSE-DATA            数据许可说明（本仓库不发布字形与派生产物）
  package.json / tsconfig.json / tsconfig.tools.json
  src/                    算法实现（TypeScript，运行时零依赖）
    geometry/             路径解析、弧长重采样、包围盒、仿射变换、轮廓中线
    raster/               光栅化、FFT、连通域、NCC 模板匹配
    structure/            A1 部首定位、A2 构形分解、A2b 部件分块、A3 笔画切分
                          （resolve.ts 是高层入口：投票优先、判不出回退模板）
    morph/                C1 跨书体对应与插值、C2 隶变变换
    layout/               D1 竖排、D2 古籍版式、D3 行款推进
    teaching/             E1 描红底本、E2 描红评分、E3 字表检索、
                          E4 形声分析、E5 笔画统计与笔顺检查
    glyph.ts              字形 SVG 读取（填充型 / 描边型统一）
    data/types.ts         数据集结构定义与 JSONL 解析
  tests/                  vitest 单测 + 真实字形端到端断言
  tools/                  同步字形、生成索引、生成数据集、本地服务器
    vendor/               vendor 库的裁剪入口（esbuild 摇树用）
  demos/                  单页 Tab 浏览页（index.html）+ 七个算法演示页
                          （01-…07-，既是独立页面，也是被单页浏览页内嵌的内容）
    lib/
      hanzi-algorithms.js 算法打包产物（入库）
      vendor/             第三方库的裁剪产物 + 许可全文（入库）
    glyphs/              演示用的字形子集（入库，每层二十来个字）
    data/                演示用的索引、偏旁形码本、笔顺数据、出处说明（入库）
  docs/                   设计取舍与踩坑（**为什么**这么做）+ 架构.md（**怎么搭**）
                          + 发布计划.md（怎么发到 GitHub）
  assets/                 本地全量字形与派生索引（gitignore，不入库）
  data/                   派生产物 JSONL（gitignore，不入库）```

保持精简，勿随意增加顶层目录。

**动算法前先读 `docs/设计取舍与踩坑.md`**——那里记着这一路踩过的坑，
大多从代码里看不出来。**动结构前先读 `docs/架构.md`**——语言、分层、依赖、
动画底子、测试策略都在那儿定死了。

## 硬规则

1. **算法必须可测**。每个算法至少有单测；能在真实字形上验证的，还要有端到端断言
   （`tests/radical.e2e.test.ts`、`tests/demos.e2e.test.ts`）。没有测试的算法等于没写。
   **每个模块要覆盖五层**：正常路径、边界、**退化输入不抛异常**、不变量/性质、
   真实字形端到端。第三层是重点——把「异常情况」钉成可断言的行为。
2. **算法必须可解释**。输出要带**置信度**；说不准的时候返回空，不许硬给答案。
   部首定位置信度不足返回 `null` 是有意为之，不是 bug。
3. **不得美化字形**。输出必须贴近原字形；本仓库不做卡通化、不做风格化变形。
   「隶变算法」是结构变换，必须标为「算法生成」，不得冒充隶书摹本。
4. **中间形态必须标为生成物**。形变插值出来的过渡形不是任何历史书体的摹本，
   演示页与 API 文档都要写明这一点。
5. **字形不随库发布**。`assets/`（全量 631 MB）与 `data/` 都进 `.gitignore`；字形的授权状态由作者另行确认。
   **例外**：为了让演示页开箱即用，仓库带一份**演示子集**（`demos/glyphs/` 甲骨 / 金文 / 篆 / 隶四层，
   每层二十来个字 + `demos/data/` 的索引与笔顺），出处与许可逐文件写在 `demos/data/PROVENANCE.md`。
   **傳抄古文与楚简不收**：这两层在上游 `hanzi-glyphs-svg` 里还没公开（只在作者本地全量分支上），
   等上游发布后再加回 `tools/build_demo_glyphs.ts` 的 `DEMO_LAYERS` 重跑。
   改动子集用 `node tools/build_demo_glyphs.ts`（确定性：同样的输入跑两次结果完全一样）。
6. **不编造来源**。字形出处以 `hanzi-glyphs-svg` 的 provenance 为准，本仓库只引用不复制。
7. **算法层零运行时依赖**。`src/**` 只用标准库。第三方库只许进 `demos/lib/vendor/`，
   且必须：版本钉死、许可全文随附、产物入库、由 `tools/build_vendor.ts` 可复跑重建。
8. **演示页上的文字是给使用者看的**。写「这里能看什么、怎么玩」，不写算法内部
   （归一化互相关、子路径、形变插值……那些留在 README 与 `docs/`）。
   但**诚实度声明必须保留**：「这是算法生成的，不是史料」这类提示要留着，只换说法。

## 算法索引

| 编号 | 算法 | 入口 | 演示 |
|---|---|---|---|
| A1 | 部首定位 | `src/structure/radical.ts` | `demos/01-radical.html` |
| A2 | 构形分解（IDS） | `src/structure/decomposition.ts` | `demos/01-radical.html` |
| A2b | 部件分块（几何递归二分） | `src/structure/blocks.ts` | `demos/01-radical.html` |
| A3 | 笔画切分与笔顺 | `src/structure/strokes.ts` | `demos/02-stroke.html` |
| C1 | 跨书体对应与形变 | `src/morph/correspond.ts`、`interpolate.ts` | `demos/03-evolution.html` |
| C2 | 隶变变换 | `src/morph/lishu.ts` | `demos/04-lishu.html` |
| D1 | 竖排与标点悬挂位 | `src/layout/vertical.ts` | `demos/05-vertical.html` |
| D2 | 古籍版式 | `src/layout/page.ts` | `demos/05-vertical.html` |
| D3 | 行款推进 | `src/layout/advance.ts` | `demos/05-vertical.html` |
| E1 | 描红底本 | `src/teaching/trace.ts` | `demos/07-trace.html` |
| E2 | 描红评分（逐笔） | `src/teaching/evaluate.ts` | `demos/07-trace.html` |
| E3 | 字表检索 | `src/teaching/search.ts` | —— |
| E4 | 形声分析 | `src/teaching/phonetic.ts` | `demos/06-lab.html` |
| E5 | 笔画统计与笔顺检查 | `src/teaching/stats.ts` | `demos/02-stroke.html` |
| — | 教学实验室（组合） | `demos/06-lab.html` | `demos/06-lab.html` |

## 脚本

| 脚本 | 作用 |
|---|---|
| `src/` 构建 | `npm run build` —— tsc 出 ESM + 类型声明到 `dist/` |
| `src/` 类型检查 | `npm run typecheck` |
| `src/` + `tools/` + `tests/` 类型检查 | `npm run typecheck:all` —— `tsconfig.json` 只管 `src/`，工具与测试同样跑在 Node 上，必须单独一起查 |
| 演示打包 | `node tools/build_bundle.ts` —— 把算法打成经典脚本 `demos/lib/hanzi-algorithms.js`（**入库**，演示页无需先编译） |
| vendor 打包 | `node tools/build_vendor.ts` —— 把 anime.js / hanzi-writer 裁成 IIFE 放进 `demos/lib/vendor/`（**入库**，许可全文随附） |
| 笔顺数据同步 | `node tools/sync_stroke_order.ts` —— 把 hanzi-writer-data 同步到本地 `assets/stroke-order/`（**不入库**）；`--chars=天,日` 只同步几个字 |
| `tests/` | `npm test` —— vitest；没有 `assets/` 时端到端用例自动跳过 |
| `tools/sync_glyphs.ts` | 从 `hanzi-glyphs-svg` 的分支导出六层书体到本地 `assets/` |
| `tools/build_demo_glyphs.ts` | 从本地 `assets/` 里挑出**演示用的字形子集**（甲骨/金文/篆/隶四层，每层二十来个字；傳抄与楚简上游未公开，不收）到 `demos/glyphs/` + `demos/data/`，并生成 `demos/data/PROVENANCE.md`（逐文件的上游出处与 sha256、发布时必须署名的文字）。**确定性**：同样的输入跑两次结果完全一样 |
| `tools/build_index.ts` | 生成 `assets/index/*.json`（演示页用的「现代字 → 文件名」映射） |
| `tools/build_data.ts` | 生成 `data/*.jsonl`（部首表、构形分解、演变链、字形度量） |
| `tools/eval_radical.ts` | 部首定位评估台：批量跑、打印命中路径与置信度 |
| `tools/eval_structure.ts` | 构形准确率评测（90 个可分解的标注字）；`--method=template\|vote`、`--frame=ink\|viewBox`、`--threshold=`、`--min-scale=`、`--max-scale=`、`--aniso=`、`--sweep` |
| `tools/build_radical_forms.ts` | 从语料归纳部首的**偏旁形**（笔画形状描述子 + 覆盖度挑代表），供投票法用 |
| `tools/probe_chars.ts` | 探针：查一批现代字在篆书层里存不存在（扩充标注集时用） |
| `tools/diag_geometry.ts` | 构形判定的几何诊断：打印部首框/其余框与两个轴上的重叠 |
| `tools/review_algorithms.ts` | **逐算法过审**：把每个算法在真实字形上的实际输出打出来，供人判断效果 |
| `tools/diag_overlay.ts`、`tools/diag_split2.ts`、`tools/diag_ascii.ts` | 出图/出字符画看字形：叠影、逐路径拆分、逐路径 ASCII |
| `tools/diag_parse_roundtrip.ts`、`tools/diag_parse_impact.ts`、`tools/diag_cmdseq.ts`、`tools/diag_holes.ts`、`tools/diag_hole_repro.ts` | 路径解析器的回归诊断（往返一致性、受影响字形统计、命令序列、子路径绕向、空腔复现） |
| `tools/diag_teaching.ts` | E2 描红评分与 E6 易混字对比的实测诊断 |
| `tools/diag_frame.ts`、`tools/diag_split.ts` | 取景对比图（ink vs viewBox）、单字按路径拆开渲染，供人眼核验 |
| `tools/render_report.ts` | 用库里的实现渲染实测对照图（证明「跑的是 src/ 的算法」） |
| `tools/diag_frame.ts`、`tools/diag_split.ts` | 取景对比图（ink vs viewBox）、单字按路径拆开渲染，供人眼核验 |
| `tools/gen_readme_table.ts` | 重新生成 README 里 A1 的实测表 |
| `tools/serve.ts` | 本地静态服务器 + 字形查询接口（给演示页） |
| `tools/rewrite-imports.ts` | 把相对导入统一成 `.ts` 扩展名（Node 原生跑 TS 的约定） |
| `tools/check_backticks.ts` | 静态检查：源码里有没有未闭合的模板字符串（反引号奇数个） |
| `tools/diag_*.ts`、`tools/raw_probe.ts` | 诊断用：查字形坐标范围、给演变链计时、原始 HTTP 响应探针 |

## 协作

- 中文交流；标识符用英文
- 改结构先改本文件
- 提交信息说明「为什么」
