/**
 * anime.js v4 的**裁剪入口**。
 *
 * anime.js 的发布包是一个「全家桶」UMD（118 KB min），里面除了动画引擎还有
 * draggable / scroll / layout / text 等跟本仓库完全无关的模块。
 * 这里只把用得上的导出重新汇成一个入口，让 esbuild 能把没用到的部分摇掉。
 *
 * 选用理由见 `docs/架构.md` 的「动画底子」一节。
 */

export {
  animate,
  createTimeline,
  createDrawable,
  createTimer,
  set,
  stagger,
  svg,
  utils,
  eases,
  engine,
} from "animejs";
