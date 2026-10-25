/**
 * A2 构形分解：部首 + 剩余部分的相对关系。
 *
 * 目标是把「这个字是左形右声」这类判断变成可计算的输出——用 IDS
 * （Ideographic Description Sequences）的结构符表达。
 *
 * 与既有 IDS 数据集（cjkvi/cjkvi-ids，GPLv2）的区别：本模块**不查表**，
 * 而是从几何关系直接推。好处是能覆盖说文 540 部口径的字——包括现有 IDS
 * 集覆盖不到的摹本字形；代价是结构符只是几何近似，遇到「包围但偏心」
 * 这类字形会退化成通用的 ⿴。
 */

import type { Rect } from "../geometry/path.ts";
import type { Glyph } from "../glyph.ts";
import type { SubPath } from "../geometry/path.ts";
import { boundsOf, centroidOf } from "../geometry/path.ts";
import { inkViewBox } from "../glyph.ts";
import { hasEnclosedHole, rasterizeGlyph } from "../raster/mask.ts";
import type { RadicalMatch } from "./radical.ts";

/** IDS 结构符。 */
export type StructureCode =
  | "⿰" | "⿱" | "⿲" | "⿳" | "⿴" | "⿵" | "⿶" | "⿷" | "⿸" | "⿹" | "⿺" | "⿻";

/** 分解结果。 */
export interface Decomposition {
  /** 结构符。 */
  structure: StructureCode;
  /** 结构符的含义（如「左形右声」）。 */
  meaning: string;
  /**
   * 部首（说文部）在整字里的方位。
   *
   * 与 `structure` 分开，是因为**结构符说的是版面**（左右 / 上下 / 包围），
   * 而部首可能在其中任何一侧：「想」= ⿱相心，IDS 码是 ⿱，但说文部首「心」
   * 在**下**。教学应用要同时知道这两件事，所以分开记。
   */
  radicalSide: "left" | "right" | "top" | "bottom" | "enclosing" | "whole";
  /** 部首部分的路径下标。 */
  radicalPathIndices: number[];
  /** 其余部分的路径下标。 */
  remainderPathIndices: number[];
  /** 部首外接框。 */
  radicalBounds: Rect;
  /** 其余部分外接框。 */
  remainderBounds: Rect;
  /** 判定置信度 [0, 1]。 */
  confidence: number;
}

const MEANING: Record<StructureCode, string> = {
  "⿰": "左右结构",
  "⿱": "上下结构",
  "⿲": "右左结构",
  "⿳": "上中下结构",
  "⿴": "全包围结构",
  "⿵": "左上包围结构",
  "⿶": "右上包围结构",
  "⿷": "左下包围结构",
  "⿸": "下方包围结构",
  "⿹": "上方包围结构",
  "⿺": "左中包围结构",
  "⿻": "中右包围结构",
};

/** 某矩形是否被另一矩形包含。 */
function contains(outer: Rect, inner: Rect, tolerance = 0): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

/**
 * 部首本身是不是**闭合的框**。
 *
 * 「囗」是闭的（國 = ⿴囗或），「門」「匚」「厂」是开的
 * （問 = ⿵門口、匪 = ⿵匚非）。判据：部首的墨迹里有没有**封闭的空腔**。
 */
function isClosedFrame(radicalGlyph: Glyph): boolean {
  const mask = rasterizeGlyph(radicalGlyph.paths.flatMap((p) => p.subpaths), {
    width: 96,
    height: 96,
    viewBox: inkViewBox(radicalGlyph),
  });
  return hasEnclosedHole(mask);
}

/**
 * 部首字形与复合字字形**是不是同一张字**。
 *
 * 說文 540 部里有 60 来个部本身就是合体字（林、里、男、宮、明、朙…）。
 * 对这些字，「部首 + 剩余部分」这个前提不成立——部首就是整字，构形必然是独体。
 * 用「路径条数相同 + 外接框几乎重合」来识别。
 */
function isSameGlyph(a: Glyph, b: Glyph): boolean {
  if (a.paths.length !== b.paths.length) return false;
  const ba = boundsOf(a.paths.flatMap((p) => p.subpaths));
  const bb = boundsOf(b.paths.flatMap((p) => p.subpaths));
  const scale = Math.max(ba.width, ba.height, bb.width, bb.height, 1);
  const tol = scale * 0.02;
  return (
    Math.abs(ba.x - bb.x) < tol &&
    Math.abs(ba.y - bb.y) < tol &&
    Math.abs(ba.width - bb.width) < tol &&
    Math.abs(ba.height - bb.height) < tol
  );
}

/**
 * 由部首定位结果推出构形关系。
 *
 * 部首笔画为空时返回 `null`——说不出结构就说不出，不要硬猜。
 * （部首为空还往下走的话，剩余部分就是整字，会被判成「包围结构」，
 * 实测那会让四成的字得到错误构形。）
 *
 * @param glyph 复合字
 * @param match 部首定位结果
 * @param radicalGlyph 部首的**独立字形**。给了才能区分「全包围 ⿴」与
 *   「左上包围 ⿵」——两者在几何上都是「部首框套住其余部分」，
 *   区别在部首本身是不是**闭合的框**：「囗」闭（→⿴），「門」「匚」「厂」开（→⿵）。
 */
export function decompose(
  glyph: Glyph,
  match: RadicalMatch,
  radicalGlyph?: Glyph,
): Decomposition | null {
  const radicalSet = new Set(match.pathIndices);
  if (radicalSet.size === 0) return null;

  // 部件的最小单位是**子路径**：篆书层里一条 `<path>` 常含多个子路径，
  // 而它们不一定属于同一部件（「眼」的「艮」那条路径有 4 段，最上面那段
  // 横帽一直伸到字的左边）。用整条路径的外接框判断左右关系，框会横跨整个字，
  // 于是左右结构被判成包围结构。
  //
  // 有 `perSubpath` 就按子路径划分，没有（老调用方）就退回路径级。
  const radicalSubpaths: SubPath[] = [];
  const remainderSubpaths: SubPath[] = [];
  const radicalPathSet = new Set<number>();

  if (match.perSubpath && match.perSubpath.length > 0) {
    for (const rec of match.perSubpath) {
      const p = glyph.paths[rec.path];
      const sp = p?.subpaths[rec.subpath];
      if (!sp) continue;
      if (rec.radical) {
        radicalSubpaths.push(sp);
        radicalPathSet.add(rec.path);
      } else {
        remainderSubpaths.push(sp);
      }
    }
    // 一条子路径都没算部首（阈值太严）时退回路径级，避免说不出构形
    if (radicalSubpaths.length === 0) {
      for (const p of glyph.paths) {
        if (radicalSet.has(glyph.paths.indexOf(p))) radicalSubpaths.push(...p.subpaths);
        else remainderSubpaths.push(...p.subpaths);
      }
      radicalPathSet.clear();
      radicalSet.forEach((i) => radicalPathSet.add(i));
    }
  } else {
    glyph.paths.forEach((p, i) => {
      if (radicalSet.has(i)) radicalSubpaths.push(...p.subpaths);
      else remainderSubpaths.push(...p.subpaths);
    });
    radicalSet.forEach((i) => radicalPathSet.add(i));
  }

  const radicalBounds = boundsOf(radicalSubpaths);
  const remainderBounds = boundsOf(remainderSubpaths);

  const result: Decomposition = {
    structure: "⿴",
    meaning: MEANING["⿴"],
    radicalSide: "whole",
    // 报出来的路径清单用**路径级**（与界面高亮的一致）；
    // 几何判定用子路径级（更准，实测 62.0% vs 58.7%）。
    // 两者偶尔不一致：投票法的码本是按路径归纳的，逐子路径比会挑得更细
    // （「語」的部首「言」横跨路径 0 与路径 3）。
    radicalPathIndices: [...radicalSet].sort((a, b) => a - b),
    remainderPathIndices: glyph.paths
      .map((_, i) => i)
      .filter((i) => !radicalSet.has(i)),
    radicalBounds,
    remainderBounds,
    confidence: match.score,
  };

  if (remainderSubpaths.length === 0) {
    // 部首就是整字：独体字
    result.structure = "⿻";
    result.meaning = "独体字（部首即整字）";
    result.radicalSide = "whole";
    result.confidence = Math.min(1, match.score + 0.2);
    return result;
  }

  // 部首字形与复合字**是同一张字**（說文 540 部里有 60 来个部本身就是合体字：
  // 林、里、男、宮、明…）。这时「部首 + 剩余部分」的前提不成立，构形必然是独体。
  // 不这么判的话，投票法会把整字拆成几段，剩下几段被当成「其余部分」。
  if (radicalGlyph && isSameGlyph(radicalGlyph, glyph)) {
    result.structure = "⿻";
    result.meaning = "独体字（部首即整字）";
    result.radicalSide = "whole";
    result.radicalPathIndices = glyph.paths.map((_, i) => i);
    result.remainderPathIndices = [];
    result.confidence = Math.min(1, match.score + 0.2);
    return result;
  }

  // ── 几何判定 ─────────────────────────────────────────────
  //
  // 用**墨量质心**而不是外接框判断部件的相对位置。
  //
  // 框为什么不灵：篆书的部件常互相交叠——「眼」的「艮」有一段横帽伸到
  // 「目」的右边，两个框横向重叠 90%，框心也跟着偏；框重叠比于是 1，
  // 左右结构被判成包围结构。而**墨量**的分布是稳的：「目」的墨在左，
  // 「艮」的墨在右，哪怕它们交叠。
  //
  // 判据：两个质心在某轴上分得开（差 ≥ 字宽/字高的 18%），且在另一轴上
  // 差不多（差 < 55%），就算那一轴上的左右/上下关系。
  const glyphBounds = boundsOf(radicalSubpaths.concat(remainderSubpaths));
  const gW = glyphBounds.width || 1;
  const gH = glyphBounds.height || 1;
  const rc = centroidOf(radicalSubpaths);
  const sc = centroidOf(remainderSubpaths);
  const dx = sc.x - rc.x;
  const dy = sc.y - rc.y;

  const SEP = 0.18;   // 分离度下限（相对字宽/字高）
  const CROSS = 0.55; // 另一轴上的最大偏移（相对字宽/字高）

  const horizontal = Math.abs(dx) >= SEP * gW && Math.abs(dy) < CROSS * gH;
  const vertical = Math.abs(dy) >= SEP * gH && Math.abs(dx) < CROSS * gW;

  if (horizontal) {
    // 结构符按 **IDS 版面语义**给：并排就是 ⿰（左右结构）。
    //
    // 早先这里按部首在哪一侧发 ⿰ / ⿲（部首在左 ⿰、在右 ⿲），那是把**版面**
    // 与**构件顺序**混为一谈：⿲ 在 IDS 里表示「第一构件写在右边」，
    // 而本算法只知道「部首 + 其余」两方，**不知道 IDS 里哪一方写在前**。
    // 「期」= 其 + 月，部首月在右，但它是**左右结构**——IDS 写作 ⿰其月，
    // 发 ⿲ 是不对的。
    //
    // 上下轴早先就是这么修的（⿱ 不再区分 ⿷/⿸，方位归 `radicalSide`），
    // ���右轴这处漏了。部首在哪一侧由 `radicalSide` 单独说。
    result.structure = "⿰";
    result.meaning = MEANING["⿰"];
    result.radicalSide = dx > 0 ? "left" : "right";
    result.confidence = match.score * (0.6 + 0.4 * Math.min(1, Math.abs(dx) / (SEP * gW)));
    return result;
  }
  if (vertical) {
    // 结构符按 **IDS 版面语义**给：上下结构就是 ⿱（⿱ 的 IDS 写法是「上件在前」，
    // 部首在哪一侧由 `radicalSide` 单独说）。
    //
    // 早先把「部首在下」也写成 ⿷，但 IDS 里 ⿷ 是「左下包围」，
    // 两种语义混在一个码里会自相矛盾。现在版面归版面，部首方位归 `radicalSide`。
    result.structure = "⿱";
    result.meaning = MEANING["⿱"];
    result.radicalSide = dy > 0 ? "top" : "bottom";
    result.confidence = match.score * (0.6 + 0.4 * Math.min(1, Math.abs(dy) / (SEP * gH)));
    return result;
  }

  // 两个方向都分不开 → 包围。
  //
  // ⿴（全体包围）与 ⿵（左上包围）在几何上**分不开**：两者都是「部首框套住
  // 其余部分」，框的外接框跟整字一样大。区别在部首本身是不是**闭合的框**：
  // 「囗」闭合（國 = ⿴囗或），「門」「匚」「厂」开口（問 = ⿵門口、匪 = ⿵匚非）。
  // 所以看部首独立字形有没有封闭的空腔。
  const radicalIsFrame = radicalGlyph ? isClosedFrame(radicalGlyph) : false;
  if (contains(radicalBounds, remainderBounds, 2)) {
    result.radicalSide = "enclosing";
    if (radicalIsFrame) {
      result.structure = "⿴";
    } else {
      // 开口的包围：看其余部分落在部首框的哪一侧
      const rx = (sc.x - (radicalBounds.x + radicalBounds.width / 2)) / (radicalBounds.width / 2 || 1);
      const ry = (sc.y - (radicalBounds.y + radicalBounds.height / 2)) / (radicalBounds.height / 2 || 1);
      const OFF = 0.2;
      if (Math.abs(rx) < OFF && Math.abs(ry) < OFF) result.structure = "⿴";
      else if (rx > 0 && ry > 0) result.structure = "⿵";   // 其余在右下
      else if (rx < 0 && ry > 0) result.structure = "⿶";   // 其余在左下
      else if (rx > 0 && ry < 0) result.structure = "⿷";   // 其余在右上
      else result.structure = "⿸";                        // 其余在左上
    }
    result.meaning = MEANING[result.structure];
    return result;
  }
  if (contains(remainderBounds, radicalBounds, 2)) {
    result.structure = "⿴";
    result.meaning = MEANING["⿴"];
    result.radicalSide = "enclosing";
    result.confidence = match.score * 0.6;
    return result;
  }
  result.structure = "⿴";
  result.meaning = MEANING["⿴"];
  result.radicalSide = "enclosing";
  result.confidence = match.score * 0.6;
  return result;
}
