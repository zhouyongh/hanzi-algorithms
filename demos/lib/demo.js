/**
 * 演示页的公共工具（经典脚本，不是 ES module）。
 *
 * 为什么不用 ES module：模块图会让演示页依赖浏览器的模块加载器，
 * 而「零构建、任何静态服务器都能跑」是这里的第一诉求。改成
 * 两个经典脚本：先加载 `hanzi-algorithms.js`（算法，打包产物），
 * 再加载本文件（工具），页面逻辑直接用全局对象。
 *
 * 依赖：`window.HanziAlgorithms`（算法库）、`window.HanziDemo`（本文件）。
 */

(function () {
  "use strict";

  /**
   * 嵌入模式：这个演示页被单页浏览页（demos/index.html）用 iframe 内嵌。
   *
   * 外层已经有 Tab 栏了，页内那排导航是重复的——`body.embed` 让 CSS
   * 把它藏掉（见 demo.css 末尾）。用查询参数 `?embed=1` 触发。
   */
  if (/(^|[?&])embed=1(&|$)/.test(location.search)) {
    document.body.classList.add("embed");
  }

  /** 算法库（由 tools/build_bundle.ts 打包产出）。 */
  const H = window.HanziAlgorithms;

  /**
   * 字形根：**随库发布的演示子集**（`demos/glyphs/`）。
   *
   * 为什么不是本机那 631 MB 全量素材：全量在 `assets/` 里，已 gitignore，
   * 不随库发布——别人 clone 下来就什么都看不到。子集由
   * `tools/build_demo_glyphs.ts` 生成（每层十几到二十来个字），够演示页跑起来，
   * 随库入库，clone 下来双击就能用。
   *
   * 路径按**页面 URL** 解析：页面在 `/demos/` 下，`./glyphs` → `/demos/glyphs`。
   */
  const GLYPH_ROOT = "./glyphs";

  /** 索引根（随库发布的演示子集）：`./data/index/<层>.json`。 */
  const INDEX_ROOT = "./data/index";

  /** 数据根（随库发布的演示子集）：偏旁形码本、说文部登记、笔顺都在这下面。 */
  const DATA_ROOT = "./data";

  /** 缓存：避免同一字形反复 fetch。 */
  const glyphCache = new Map();

  /**
   * 并发限制器。
   *
   * 有些浏览器/代理环境对同一源的并发连接数限制很严，超了就**排队等**——
   * 表现是「请求发出去了、服务器也响应了，但前端的 promise 永不 settle」，
   * 页面看着像卡死。这里把同时在飞的请求压到 3 个，其余排队。
   */
  const MAX_CONCURRENT = 2;
  let inflight = 0;
  const waiters = [];

  function withLimit(fn) {
    return new Promise((resolve, reject) => {
      const run = () => {
        inflight += 1;
        fn().then(resolve, reject).finally(() => {
          inflight -= 1;
          const next = waiters.shift();
          if (next) next();
        });
      };
      if (inflight < MAX_CONCURRENT) run();
      else waiters.push(run);
    });
  }

  /**
   * 全局错误显示。
   *
   * 演示页里的异常如果只是静静地把页面留成半成品，调试起来很痛苦——
   * 这里把错误直接显示在页顶。
   */
  function showError(message) {
    let bar = document.getElementById("error-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "error-bar";
      bar.style.cssText =
        "position:sticky;top:0;z-index:99;background:#a1442f;color:#fff;padding:8px 16px;" +
        "font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap";
      document.body.prepend(bar);
    }
    bar.textContent = "演示页出错：" + message;
  }

  window.addEventListener("error", function (e) { showError(e.message || String(e.error)); });
  window.addEventListener("unhandledrejection", function (e) { showError(String(e.reason)); });

  /**
   * 取某个书体的「现代字 → 文件名」索引。
   *
   * 索引是静态文件（演示子集里每层只有几十个字的映射，很小），
   * 走普通静态文件路径，不依赖服务器端的查询接口——这样任何静态服务器都能跑演示。
   */
  async function loadIndex(layer) {
    const res = await withLimit(() =>
      fetch(INDEX_ROOT + "/" + layer + ".json"));
    if (!res.ok) throw new Error("取索引失败：" + layer + "（HTTP " + res.status + "）");
    return res.json();
  }

  /**
   * 取说文 540 部登记。
   *
   * @returns { 篆书码位: [说文部次, 部首码位, 部首字] }
   */
  async function loadRadicalIndex() {
    const res = await withLimit(() =>
      fetch(DATA_ROOT + "/seal-radicals.json"));
    if (!res.ok) throw new Error("取部首登记失败（HTTP " + res.status + "）");
    return res.json();
  }

  /**
   * 取部首的**偏旁形**（笔画形状描述子）。
   *
   * 由 `tools/build_radical_forms.ts` 从语料归纳而来（**随库发布**：
   * 演示子集里带了一份拷贝，见 `demos/data/PROVENANCE.md`）。
   * 有了它才能走**投票法**——实测投票法比模板法准，
   * 但只在归纳出了偏旁形的部上可用（覆盖 148/540 部）。
   *
   * 取不到时返回空对象：演示页照常跑，只是退回模板法。
   *
   * @returns { 说文部次: { types: string[], coverage: number, chars: number } }
   */
  async function loadRadicalForms() {
    try {
      const res = await withLimit(() =>
        fetch(DATA_ROOT + "/radical-forms.json"));
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  /** 读取一个 SVG 字形文件，返回源码字符串。 */
  async function loadGlyphText(layer, file) {
    const key = layer + "/" + file;
    if (glyphCache.has(key)) return glyphCache.get(key);
    const res = await withLimit(() =>
      fetch(GLYPH_ROOT + "/" + layer + "/" + file));
    if (!res.ok) throw new Error("取字形失败：" + key + "（HTTP " + res.status + "）");
    const text = await res.text();
    glyphCache.set(key, text);
    return text;
  }

  /** 读取并解析一个字形，返回库里的 Glyph 对象。 */
  async function loadGlyph(layer, file) {
    return H.parseGlyphSvg(await loadGlyphText(layer, file));
  }

  /**
   * 把一条路径的子路径转成 SVG 的 `d` 字符串。
   *
   * 每条子路径都要以 `M` 开头——少了它 SVG 会整条路径不渲染（很安静的失败）。
   */
  function pathData(subpaths) {
    return subpaths
      .map(function (sp) {
        return "M " + sp.map(function (pt) {
          return pt.x.toFixed(2) + "," + pt.y.toFixed(2);
        }).join(" L ") + " Z";
      })
      .join(" ");
  }

  /**
   * 把一个 Glyph 画进 SVG 元素。
   *
   * @param svg      目标 <svg>
   * @param glyph    字形
   * @param opts.highlight  要高亮的 `<path>` 下标集合
   * @param opts.dim        其余路径是否淡出
   */
  function drawGlyph(svg, glyph, opts) {
    opts = opts || {};
    const highlight = opts.highlight || null;
    const vb = glyph.viewBox;
    svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.width + " " + vb.height);
    svg.innerHTML = "";
    glyph.paths.forEach(function (p, i) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData(p.subpaths));
      if (p.filled) {
        path.setAttribute("fill", highlight && highlight.has(i) ? "#8a6d3b" : "#1c1b18");
        path.setAttribute("fill-rule", "nonzero");
      } else {
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", highlight && highlight.has(i) ? "#8a6d3b" : "#1c1b18");
        path.setAttribute("stroke-width", String(p.strokeWidth));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
      }
      if (opts.dim && highlight && !highlight.has(i)) path.setAttribute("opacity", "0.22");
      path.dataset.pathIndex = String(i);
      svg.appendChild(path);
    });
  }

  /** 建一个元素。 */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    attrs = attrs || {};
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, String(v));
    }
    const list = [].concat(children || []);
    for (const c of list) if (c) node.appendChild(c);
    return node;
  }

  /**
   * 顶部提示条（取不到字形素材时用）。
   *
   * 正常情况下用不到：演示子集随库发布，`demos/glyphs/` 与 `demos/data/`
   * 就在仓库里。真的取不到，多半是**没起静态服务器**（用 `file://` 打开
   * 会被浏览器的跨源策略挡住 fetch），或者子集没生成。
   */
  function missingAssets(container) {
    container.innerHTML = "";
    container.appendChild(el("div", { class: "empty" }, [
      el("p", { html: "取不到字形素材。演示子集随库发布（<span class=\"mono\">demos/glyphs/</span>），" +
        "先确认它存在；再用静态服务器打开本页（<span class=\"mono\">file://</span> 下 fetch 会被跨源策略挡掉）：" }),
      el("p", { class: "mono", html: "node tools/build_demo_glyphs.ts   # 重新生成子集" }),
      el("p", { class: "mono", html: "node tools/serve.ts --port 8080   # 起本地服务器" }),
    ]));
  }

  window.HanziDemo = {
    H: H,
    loadIndex: loadIndex,
    loadRadicalIndex: loadRadicalIndex,
    loadRadicalForms: loadRadicalForms,
    loadGlyph: loadGlyph,
    loadGlyphText: loadGlyphText,
    pathData: pathData,
    drawGlyph: drawGlyph,
    el: el,
    missingAssets: missingAssets,
    showError: showError,
  };
})();
