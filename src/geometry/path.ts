/**
 * SVG path 解析与几何基础。
 *
 * 为什么自己写：汉字字形的 SVG 有两套形态——甲骨是「描边骨架」（`stroke` +
 * `stroke-width` + 直线段），篆书/金文/隶书是「填充轮廓」（闭合贝塞尔）。
 * 要做笔画级切分、部首定位、跨书体插值，必须先把两者都拆成同一种东西：
 * **点列**（`Point[]`）。浏览器 DOM 能解析 SVG，但 Node 里没有 DOM；本库要能
 * 在离线批处理里跑，所以解析器必须自带。
 *
 * 解析器覆盖 SVG 1.1 path 语法全集：M/m L/l H/h V/v C/c S/s Q/q T/t A/a Z/z，
 * 支持相对坐标、隐式重复（M 之后隐含 lineto）、平滑曲线控制点反射。
 */

/** 二维点。 */
export interface Point {
  x: number;
  y: number;
}

/** 一条子路径：已展平成折线的点列。 */
export type SubPath = Point[];

/** 矩形。 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TOKEN_RE = /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

const ARGS: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

/** 曲线展平的分段数。宁多勿少：后续有弧长重采样兜底，多余的点会被吸收。 */
export const FLATTEN_SEGMENTS = {
  cubic: 32,
  quadratic: 24,
  arc: 48,
} as const;

/** 三次贝塞尔展平为点列（不含起点）。 */
export function flattenCubic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  segments = FLATTEN_SEGMENTS.cubic,
): Point[] {
  const out: Point[] = [];
  for (let k = 1; k <= segments; k += 1) {
    const t = k / segments;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    out.push({
      x: a * x0 + b * x1 + c * x2 + d * x3,
      y: a * y0 + b * y1 + c * y2 + d * y3,
    });
  }
  return out;
}

/** 二次贝塞尔展平为点列（不含起点）。 */
export function flattenQuadratic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  segments = FLATTEN_SEGMENTS.quadratic,
): Point[] {
  const out: Point[] = [];
  for (let k = 1; k <= segments; k += 1) {
    const t = k / segments;
    const mt = 1 - t;
    const a = mt * mt;
    const b = 2 * mt * t;
    const c = t * t;
    out.push({ x: a * x0 + b * x1 + c * x2, y: a * y0 + b * y1 + c * y2 });
  }
  return out;
}

/**
 * 椭圆弧展平为点列（不含起点），实现 SVG 规范里的端点→中心参数化。
 */
export function flattenArc(
  x0: number, y0: number,
  rxIn: number, ryIn: number,
  rotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x: number, y: number,
  segments = FLATTEN_SEGMENTS.arc,
): Point[] {
  if (rxIn === 0 || ryIn === 0 || (x0 === x && y0 === y)) {
    return [{ x, y }];
  }
  const rxAbs = Math.abs(rxIn);
  const ryAbs = Math.abs(ryIn);
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x0 - x) / 2;
  const dy2 = (y0 - y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  // 半径过小则按规范等比放大
  const lambda = (x1p * x1p) / (rxAbs * rxAbs) + (y1p * y1p) / (ryAbs * ryAbs);
  let rx = rxAbs;
  let ry = ryAbs;
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const denom = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const numer = rx * rx * ry * ry - denom;
  let coef = denom === 0 ? 0 : Math.sqrt(Math.max(0, numer / denom));
  if (largeArc === sweep) coef = -coef;

  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angle(
    (x1p - cxp) / rx, (y1p - cyp) / ry,
    (-x1p - cxp) / rx, (-y1p - cyp) / ry,
  );
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;

  const out: Point[] = [];
  for (let k = 1; k <= segments; k += 1) {
    const t = theta1 + (delta * k) / segments;
    out.push({
      x: cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t) + cx,
      y: sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t) + cy,
    });
  }
  return out;
}

/**
 * 解析结果：展平后的子路径点列 + 每条子路径是否闭合。
 *
 * 闭合信息**必须单独记**：点列本身看不出闭合——SVG 的 `Z` 只是「首尾隐含相连」，
 * 解析出来的点列首尾不重复，于是「首尾重合」这种几何判据对闭合轮廓一律失效。
 *
 * 而闭合与否很要紧：摹本的一笔是**闭合轮廓**（一圈描边），
 * 隶变、描红这类算法要作用在笔势线上，得先知道「这条是不是一圈」。
 */
export interface ParsedPath {
  /** 展平后的子路径点列。 */
  subpaths: SubPath[];
  /** 每条子路径是否由 `Z` 闭合。 */
  closed: boolean[];
}

/**
 * 解析 SVG path 的 `d` 属性，返回展平后的子路径点列。
 *
 * 约定：闭合子路径的首尾点不重复（末端由 `Z` 隐含）；开放子路径保留全部点。
 * 直线段（两个点的子路径）会被保留——甲骨骨架全是两三点直线，丢掉就等于没解析。
 */
export function parsePath(d: string): SubPath[] {
  return parsePathDetailed(d).subpaths;
}

/** 同 `parsePath`，但额外给出每条子路径的闭合标记。 */
export function parsePathDetailed(d: string): ParsedPath {
  const tokens = d.match(TOKEN_RE);
  if (!tokens) return { subpaths: [], closed: [] };

  const subpaths: SubPath[] = [];
  const closedFlags: boolean[] = [];
  let current: SubPath = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCubicCtrl: Point | null = null;
  let lastQuadCtrl: Point | null = null;
  let command: string | null = null;

  const flush = (closed: boolean): void => {
    if (current.length >= 2) {
      subpaths.push(current);
      closedFlags.push(closed);
    }
    current = [];
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/[A-Za-z]/.test(token)) {
      command = token;
      i += 1;
      if (command === "z" || command === "Z") {
        flush(true);
        // `z` 之后当前点回到**本子路径的起点**（规范如此）。
        // 紧接着的相对 `m` 要相对这个点算，不能当成绝对坐标。
        cx = sx;
        cy = sy;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        continue;
      }
    }
    if (command === null) {
      throw new Error(`path 数据以坐标开头，缺少命令：${d.slice(0, 60)}`);
    }

    const upper: string = command.toUpperCase();
    const relative: boolean = command !== upper;
    const argc = ARGS[upper];
    if (argc === undefined) {
      throw new Error(`未知命令 ${command}`);
    }
    if (i + argc > tokens.length) {
      throw new Error(`命令 ${command} 的参数不足：${d.slice(0, 60)}`);
    }
    const a: number[] = [];
    for (let k = 0; k < argc; k += 1) a.push(Number(tokens[i + k]));
    i += argc;

    switch (upper) {
      case 'M': {
        flush(false);
        let x = a[0];
        let y = a[1];
        // 相对 `m` 永远相对**当前点**。路径开头时当前点是 (0,0)，加不加一样；
        // `z` 之后当前点是上一个子路径的起点——这正是早先算错的地方：
        // 「日」的路径是 `m…z m…z m…z`，后两个 `m` ��相对偏移被丢掉了，
        // 两个「格」被放到错误位置，于是洞没了、字形也歪了。
        if (relative) { x += cx; y += cy; }
        current = [{ x, y }];
        cx = x; cy = y; sx = x; sy = y;
        // 后续隐含的是 lineto
        command = relative ? "l" : "L";
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'L': {
        let x = a[0];
        let y = a[1];
        if (relative) { x += cx; y += cy; }
        current.push({ x, y });
        cx = x; cy = y;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'H': {
        let x = a[0];
        if (relative) x += cx;
        current.push({ x, y: cy });
        cx = x;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'V': {
        let y = a[0];
        if (relative) y += cy;
        current.push({ x: cx, y });
        cy = y;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      case 'C': {
        let x1 = a[0], y1 = a[1], x2 = a[2], y2 = a[3], x = a[4], y = a[5];
        if (relative) {
          x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy;
        }
        current.push(...flattenCubic(cx, cy, x1, y1, x2, y2, x, y));
        lastCubicCtrl = { x: x2, y: y2 };
        lastQuadCtrl = null;
        cx = x; cy = y;
        break;
      }
      case 'S': {
        let x2 = a[0], y2 = a[1], x = a[2], y = a[3];
        if (relative) { x2 += cx; y2 += cy; x += cx; y += cy; }
        const x1: number = lastCubicCtrl ? 2 * cx - lastCubicCtrl.x : cx;
        const y1: number = lastCubicCtrl ? 2 * cy - lastCubicCtrl.y : cy;
        current.push(...flattenCubic(cx, cy, x1, y1, x2, y2, x, y));
        lastCubicCtrl = { x: x2, y: y2 };
        lastQuadCtrl = null;
        cx = x; cy = y;
        break;
      }
      case 'Q': {
        let x1 = a[0], y1 = a[1], x = a[2], y = a[3];
        if (relative) { x1 += cx; y1 += cy; x += cx; y += cy; }
        current.push(...flattenQuadratic(cx, cy, x1, y1, x, y));
        lastQuadCtrl = { x: x1, y: y1 };
        lastCubicCtrl = null;
        cx = x; cy = y;
        break;
      }
      case 'T': {
        let x = a[0], y = a[1];
        if (relative) { x += cx; y += cy; }
        const x1: number = lastQuadCtrl ? 2 * cx - lastQuadCtrl.x : cx;
        const y1: number = lastQuadCtrl ? 2 * cy - lastQuadCtrl.y : cy;
        current.push(...flattenQuadratic(cx, cy, x1, y1, x, y));
        lastQuadCtrl = { x: x1, y: y1 };
        lastCubicCtrl = null;
        cx = x; cy = y;
        break;
      }
      case 'A': {
        const x = a[5];
        const y = a[6];
        current.push(...flattenArc(cx, cy, a[0], a[1], a[2], a[3] !== 0, a[4] !== 0, x, y));
        cx = x; cy = y;
        lastCubicCtrl = null;
        lastQuadCtrl = null;
        break;
      }
      default:
        throw new Error(`未处理的命令 ${command}`);
    }
  }
  flush(false);
  return { subpaths, closed: closedFlags };
}

/** 折线长度。 */
export function polylineLength(points: SubPath): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** 一组子路径的外接矩形。空输入返回零矩形。 */
export function boundsOf(subpaths: SubPath[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sp of subpaths) {
    for (const p of sp) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 矩形中心。 */
export function centerOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** 矩形面积。 */
export function areaOf(rect: Rect): number {
  return rect.width * rect.height;
}

/**
 * 一组子路径的**墨量质心**（面积/长度加权的重心）。
 *
 * 为什么要它：判断「部首在左、其余在右」时，**外接框**太脆——
 * 篆书的部件常互相交叠（「眼」的「艮」有一段横帽伸到「目」的右边），
 * 于是两个框横向重叠 90%，框心也跟着偏。但**墨量**的分布是稳的：
 * 「目」的墨都在左边，「艮」的墨都在右边，哪怕它们交叠。
 *
 * 闭合多边形按面积算，开放折线（描边型字形）按弧长算。
 */
export function centroidOf(subpaths: SubPath[]): Point {
  let sumX = 0;
  let sumY = 0;
  let sumW = 0;

  for (const sp of subpaths) {
    if (sp.length < 2) {
      if (sp.length === 1) { sumX += sp[0].x; sumY += sp[0].y; sumW += 1; }
      continue;
    }
    const closed =
      Math.abs(sp[0].x - sp[sp.length - 1].x) < 1e-6 &&
      Math.abs(sp[0].y - sp[sp.length - 1].y) < 1e-6;

    if (closed) {
      // 有向面积 + 一阶矩
      let a2 = 0;
      let cx = 0;
      let cy = 0;
      for (let i = 0; i + 1 < sp.length; i += 1) {
        const p = sp[i];
        const q = sp[i + 1];
        const cross = p.x * q.y - q.x * p.y;
        a2 += cross;
        cx += (p.x + q.x) * cross;
        cy += (p.y + q.y) * cross;
      }
      const area = a2 / 2;
      if (Math.abs(area) > 1e-9) {
        const w = Math.abs(area);
        sumX += (cx / (6 * area)) * w;
        sumY += (cy / (6 * area)) * w;
        sumW += w;
        continue;
      }
    }

    // 开放折线：按弧长分段取中点
    for (let i = 1; i < sp.length; i += 1) {
      const p = sp[i - 1];
      const q = sp[i];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (len <= 0) continue;
      sumX += ((p.x + q.x) / 2) * len;
      sumY += ((p.y + q.y) / 2) * len;
      sumW += len;
    }
  }

  if (sumW <= 0) return { x: 0, y: 0 };
  return { x: sumX / sumW, y: sumY / sumW };
}
