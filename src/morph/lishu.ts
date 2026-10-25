/**
 * C2 隶变算法：把篆书形态按隶书规则做几何变换。
 *
 * 隶书的形成是一次系统性的「书写性改造」，四条经典规则：
 *
 * | 规则 | 几何含义 | 本模块的实现 |
 * |---|---|---|
 * | 圆转方折 | 圆弧笔画折成方折 | 折线简化 + 近水平/垂直段吸附到轴向 |
 * | 线条波磔 | 横向收笔上扬成波 | 末端追加一段波峰 |
 * | 横平竖直 | 横向取平、纵向取直 | 笔画主方向旋到最近的轴 |
 * | 象形性降低 | 曲线趋于平直、构件趋于简约 | 曲线点压缩 + 容差简化 |
 *
 * **诚实度（必须写进界面）**：输出是「算法生成的隶变示意」，**不是隶书摹本**。
 * 它的教学价值在于展示「篆书被这样处理会走向隶书」，而不是冒充史料。
 * 真实隶书字形需要另行取得授权后单独入库。
 */

import type { Glyph, GlyphPath } from "../glyph.ts";
import { boundsOf, polylineLength, type Point, type SubPath } from "../geometry/path.ts";
import { contourToCenterline, outlineFromCenterline } from "../geometry/centerline.ts";
import { centroid, principalAngle } from "../geometry/sample.ts";

/** 隶变参数。 */
export interface LishuOptions {
  /** 折线简化容差（用户单位）；越大越「方折」。 */
  simplifyTolerance?: number;
  /** 角度吸附阈值（弧度）；偏离轴向在此范围内才吸附。 */
  axisSnapAngle?: number;
  /** 是否加波磔。 */
  waveTail?: boolean;
  /**
   * 波磔幅度（**绝对**，用户单位）。
   *
   * 给了就用它，不再按字身缩放。早先的实现是 `waveAmplitude * 0.06 * 字身长边`，
   * 于是 `waveAmplitude: 10` 在 100 单位见方的字上会变成 **105.6 单位**——
   * 比整个字还长，隶变演示里的「一团乱」就是这么来的。
   * 绝对幅度是可预期的：调用方知道自己要多长的尾巴。
   */
  waveAmplitude?: number;
  /**
   * 波磔幅度（占字身长边的**比例**）。
   *
   * `waveAmplitude` 没给时用它。默认 0.025——隶书的波磔是收笔处一个小小的上扬，
   * 大约是字身的 2–3%，与字的大小无关。
   */
  waveRatio?: number;
  /** 是否横平竖直。 */
  levelAndStraight?: boolean;
  /**
   * 参考尺度（用户单位）：波磔比例要乘它。
   *
   * 整字变换用字身长边；单独处理一条子路径时用该条自己的长边。
   * 显式给出可以消掉两者之间的差别——**同一个字，整字走一遍和逐条走一遍
   * 应当得到同样的尾巴**，否则「算法输出」取决于调用粒度，很别扭。
   */
  scaleRef?: number;
  /**
   * 这条子路径是不是闭合轮廓。
   *
   * 真实字形由解析层的 `Z` 标记给出；手工调用时不给就按几何判据（首尾重合）。
   */
  closed?: boolean;
}

/** 默认参数。 */
export const DEFAULT_LISHU: Required<Omit<LishuOptions, "scaleRef" | "closed">> = {
  simplifyTolerance: 3,
  axisSnapAngle: (20 * Math.PI) / 180,
  waveTail: true,
  /** 0 = 不指定绝对幅度，走 waveRatio。 */
  waveAmplitude: 0,
  waveRatio: 0.025,
  levelAndStraight: true,
};

/**
 * 波磔幅度的实际取值。
 *
 * 绝对幅度优先；没有就用比例乘参考尺度。
 */
function waveSize(
  opts: Required<Omit<LishuOptions, "scaleRef" | "closed">>,
  scaleRef: number,
): number {
  if (opts.waveAmplitude > 0) return opts.waveAmplitude;
  return opts.waveRatio * scaleRef;
}

/**
 * 子路径是否闭合。
 *
 * 两条判据：
 * 1. **几何判据**——首尾点重合。这对手工构造的闭合点列有效；
 * 2. **来源判据**——解析时 `Z` 闭合的子路径，点列首尾**不重复**（末端由 `Z` 隐含），
 *    几何判据对它一律失效。真实字形走的是这一条，所以必须由解析层把标记带下来。
 */
export function isClosedSubpath(sp: SubPath): boolean {
  if (sp.length < 3) return false;
  const a = sp[0];
  const b = sp[sp.length - 1];
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

/**
 * 一条 `<path>` 的第 `index` 条子路径是否闭合。
 *
 * 优先用解析层带下来的 `Z` 标记；没有标记时退回几何判据。
 */
export function isClosedPathSubpath(path: GlyphPath, index: number): boolean {
  const flagged = path.closed?.[index];
  if (typeof flagged === "boolean") return flagged;
  return isClosedSubpath(path.subpaths[index] ?? []);
}

/**
 * Ramer–Douglas–Peucker 折线简化。
 *
 * 保留形状特征，去掉曲线上多余的采样点——这是「圆转方折」的第一步：
 * 曲线被简化成少量直线段。
 */
export function simplifyPolyline(points: Point[], tolerance: number): Point[] {
  // 深拷贝：同模块的 snapToAxes / addWaveTail 都拷了，只有这里直接返回原对象，
  // 调用方改返回值会顺手改到入参。
  if (points.length < 3 || tolerance <= 0) return points.map((p) => ({ ...p }));
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 1) if (keep[i]) out.push({ ...points[i] });
  return out;
}

/** 点到线段的垂直距离。 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * 轴向吸附：把接近水平或垂直的线段端点对齐到同一行/列。
 *
 * 篆书的圆弧被简化后，段与段之间仍有小角度差；吸附之后才真正呈现「方折」。
 */
export function snapToAxes(points: Point[], snapAngle: number): Point[] {
  if (points.length < 2) return points.slice();
  const out = points.map((p) => ({ ...p }));
  for (let i = 0; i < out.length - 1; i += 1) {
    const dx = out[i + 1].x - out[i].x;
    const dy = out[i + 1].y - out[i].y;
    if (dx === 0 && dy === 0) continue;
    const ang = Math.atan2(dy, dx);
    const norm = ((ang % Math.PI) + Math.PI) % Math.PI;
    // 到**最近轴线**的夹角。
    //
    // 早先只判 `norm <= snapAngle`，那漏掉了「往左走的近水平段」：
    // 它的方向角接近 π，`norm` 也接近 π，于是既没被判成水平也没被判成垂直。
    // 结果是同一个形状，**朝右画会被拉平、朝左画不会**——吸附不该看行进方向。
    const toAxis = Math.min(norm, Math.PI - norm);
    if (toAxis <= snapAngle) {
      const y = (out[i].y + out[i + 1].y) / 2;
      out[i].y = y;
      out[i + 1].y = y;
    } else if (Math.PI / 2 - toAxis <= snapAngle) {
      const x = (out[i].x + out[i + 1].x) / 2;
      out[i].x = x;
      out[i + 1].x = x;
    }
  }
  return out;
}

/**
 * 波磔：给横向笔画的收笔处加一段上扬的波峰。
 *
 * 做法：若笔画末点是最右端，则在末端沿水平方向延伸一段抛物线波。
 */
export function addWaveTail(points: Point[], amplitude: number): Point[] {
  if (points.length < 2 || amplitude <= 0) return points.slice();
  const out = points.map((p) => ({ ...p }));
  const last = out[out.length - 1];
  const rightmost = out.reduce((best, p) => (p.x > best.x ? p : best), out[0]);
  if (rightmost !== last) return out;

  // 找到末端水平方向的笔画
  const prev = out[out.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  if (dx <= 0) return out;
  const len = Math.hypot(dx, dy);
  if (len <= 0) return out;
  const ux = dx / len;
  const uy = dy / len;

  const waveLen = amplitude * 2.2;
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) {
    const s = (i / steps) * waveLen;
    const lift = Math.sin((i / steps) * Math.PI) * amplitude;
    out.push({
      x: last.x + ux * s,
      y: last.y + uy * s - lift,
    });
  }
  return out;
}

/** 横平竖直：把笔画整体旋转到最接近的水平或垂直方向。 */
export function levelAndStraight(points: Point[], snapAngle: number): Point[] {
  if (points.length < 2) return points.slice();
  const angle = principalAngle(points);
  const norm = ((angle % Math.PI) + Math.PI) % Math.PI;
  // 与 snapToAxes 同一套判据：到最近轴线的夹角，不看行进方向。
  const toAxis = Math.min(norm, Math.PI - norm);
  const target = toAxis <= Math.PI / 4 ? 0 : Math.PI / 2;
  if (Math.abs(toAxis - target) > snapAngle) return points.slice();

  const c = centroid(points);
  const delta = target - angle;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return points.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  });
}

/**
 * 四条规则的统一施加顺序：拉平 → 简化 → 吸附 → 波磔。
 *
 * 抽出来是为了让「开放折线」与「闭合轮廓的中线」走**完全相同**的规则序列——
 * 两条路径只在「输入是什么」上不同，规则本身不能有两套，否则两种字形的隶变
 * 效果会不一致。
 */
function applyLishuRules(
  points: Point[],
  opts: Required<Omit<LishuOptions, "scaleRef" | "closed">>,
  wave: number,
): Point[] {
  let pts = points.map((p) => ({ ...p }));
  if (opts.levelAndStraight) pts = levelAndStraight(pts, opts.axisSnapAngle);
  pts = simplifyPolyline(pts, opts.simplifyTolerance);
  pts = snapToAxes(pts, opts.axisSnapAngle);
  if (opts.waveTail) pts = addWaveTail(pts, wave);
  return pts;
}

/**
 * 对单条子路径施加隶变。
 *
 * **开放折线**（描边型字形的骨架）直接施加四条规则。
 *
 * **闭合轮廓**（摹本的一笔）先求中线、对中线施加规则、再按原半宽撑回轮廓。
 * 直接对闭合环做简化与加尾巴是不行的：环被简化会压扁，在环上加尾巴会凭空
 * 长出一个尖刺——那正是早先隶变演示「一团乱」的成因。
 *
 * 中线求不出来（退化轮廓，如点、块状笔画）时**原样保留**：算法不假装自己能处理。
 *
 * @param options.closed 这条是不是闭合轮廓。真实字形由解析层的 `Z` 标记给出；
 *   不给就按几何判据（首尾重合）——注意解析出来的闭合点列首尾**不重复**，
 *   所以真实字形必须显式传 `closed`，否则会走错分支。
 */
export function lishuTransformSubpath(sp: SubPath, options: LishuOptions = {}): SubPath {
  const opts = { ...DEFAULT_LISHU, ...options };
  if (sp.length < 2) return sp.map((p) => ({ ...p }));

  const b = boundsOf([sp]);
  const ref = opts.scaleRef ?? Math.max(b.width, b.height) ?? 1;
  const wave = waveSize(opts, ref || 1);
  const closed = opts.closed ?? isClosedSubpath(sp);

  if (closed) {
    const cl = contourToCenterline(sp);
    if (!cl) return sp.map((p) => ({ ...p }));
    const pts = applyLishuRules(cl.points, opts, wave);
    const half = cl.halfWidths.slice();
    while (half.length < pts.length) half.push(half[half.length - 1] ?? 0);
    return outlineFromCenterline({ points: pts, halfWidths: half, length: polylineLength(pts) });
  }

  return applyLishuRules(sp, opts, wave);
}

/**
 * 对整个字形施加隶变。
 *
 * 每条 `<path>`（摹本的一笔）单独处理；波磔幅度按整字尺度换算，
 * 免得小字被加上巨大的尾巴、小笔画被吃掉。
 */
export function lishuTransform(glyph: Glyph, options: LishuOptions = {}): Glyph {
  const opts = { ...DEFAULT_LISHU, ...options };
  const all = glyph.paths.flatMap((p) => p.subpaths);
  const bounds = boundsOf(all);
  const scaleRef = Math.max(bounds.width, bounds.height) || 1;
  const wave = waveSize(opts, scaleRef);

  const paths = glyph.paths.map((p) => {
    const subpaths = p.subpaths.map((sp, i) => {
      if (isClosedPathSubpath(p, i)) {
        const cl = contourToCenterline(sp);
        if (!cl) return sp.map((q) => ({ ...q }));
        const pts = applyLishuRules(cl.points, opts, wave);
        const half = cl.halfWidths.slice();
        while (half.length < pts.length) half.push(half[half.length - 1] ?? 0);
        return outlineFromCenterline({ points: pts, halfWidths: half, length: polylineLength(pts) });
      }
      return applyLishuRules(sp, opts, wave);
    });
    return { subpaths, strokeWidth: 0, filled: true, bounds: boundsOf(subpaths) };
  });

  return {
    viewBox: glyph.viewBox,
    paths,
    bounds: boundsOf(paths.flatMap((p) => p.subpaths)),
  };
}
