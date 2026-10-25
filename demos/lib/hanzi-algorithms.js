/* hanzi-algorithms —— 由 tools/build_bundle.ts 生成，请勿手改。源在 src/ */
"use strict";
var HanziAlgorithms = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_BLOCKS: () => DEFAULT_BLOCKS,
    DEFAULT_LISHU: () => DEFAULT_LISHU,
    DESCRIPTOR_SIZE: () => DESCRIPTOR_SIZE,
    FLATTEN_SEGMENTS: () => FLATTEN_SEGMENTS,
    GlyphIndex: () => GlyphIndex,
    IDENTITY: () => IDENTITY,
    SCRIPT_META: () => SCRIPT_META,
    TemplateMatcher: () => TemplateMatcher,
    VERSION: () => VERSION,
    addWaveTail: () => addWaveTail,
    advance: () => advance,
    advanceProgress: () => advanceProgress,
    analyzePhonetic: () => analyzePhonetic,
    apply: () => apply,
    applyAll: () => applyAll,
    applyToRect: () => applyToRect,
    applyToSubpaths: () => applyToSubpaths,
    areaOf: () => areaOf,
    blockOfPath: () => blockOfPath,
    boundsInPixels: () => boundsInPixels,
    boundsOf: () => boundsOf,
    buildPhoneticFamilies: () => buildPhoneticFamilies,
    buildTraceTemplate: () => buildTraceTemplate,
    centerOf: () => centerOf,
    centroid: () => centroid,
    centroidOf: () => centroidOf,
    checkStrokeOrder: () => checkStrokeOrder,
    compareGlyphs: () => compareGlyphs,
    componentDescriptor: () => componentDescriptor,
    compose: () => compose,
    connectedComponents: () => connectedComponents,
    contourToCenterline: () => contourToCenterline,
    correspondStrokes: () => correspondStrokes,
    countInk: () => countInk,
    createMask: () => createMask,
    cropToInk: () => cropToInk,
    decodeMaskBase64: () => decodeMaskBase64,
    decompose: () => decompose,
    descriptorDistance: () => descriptorDistance2,
    descriptorOf: () => descriptorOf,
    distanceToPolyline: () => distanceToPolyline,
    distanceToSegment: () => distanceToSegment,
    encodeMaskBase64: () => encodeMaskBase64,
    evaluateTracing: () => evaluateTracing,
    extractViewBox: () => extractViewBox,
    fft1d: () => fft1d,
    fft2d: () => fft2d,
    fitToBox: () => fitToBox,
    flattenArc: () => flattenArc,
    flattenCubic: () => flattenCubic,
    flattenQuadratic: () => flattenQuadratic,
    getPixel: () => getPixel,
    glyphPoints: () => glyphPoints,
    glyphStrokes: () => glyphStrokes,
    groupByRadical: () => groupByRadical,
    hasEnclosedHole: () => hasEnclosedHole,
    inkBounds: () => inkBounds,
    inkCentroid: () => inkCentroid,
    inkOf: () => inkOf,
    inkRatio: () => inkRatio,
    inkViewBox: () => inkViewBox,
    integralImage: () => integralImage,
    interpolateContours: () => interpolateContours,
    interpolateDetailed: () => interpolateDetailed,
    interpolateGlyphs: () => interpolateGlyphs,
    interpolateSequence: () => interpolateSequence,
    invert: () => invert,
    isClosedPathSubpath: () => isClosedPathSubpath,
    isClosedSubpath: () => isClosedSubpath,
    isStrokeGlyph: () => isStrokeGlyph,
    layoutClassicPage: () => layoutClassicPage,
    layoutVertical: () => layoutVertical,
    levelAndStraight: () => levelAndStraight,
    lishuTransform: () => lishuTransform,
    lishuTransformSubpath: () => lishuTransformSubpath,
    locateRadical: () => locateRadical,
    longestSubpath: () => longestSubpath,
    matchTemplate: () => matchTemplate,
    needsVerticalAdjustment: () => needsVerticalAdjustment,
    nextPow2: () => nextPow2,
    normalizeGlyph: () => normalizeGlyph,
    normalizeToFrame: () => normalizeToFrame,
    outlineFromCenterline: () => outlineFromCenterline,
    parseGlyphSvg: () => parseGlyphSvg,
    parseJsonl: () => parseJsonl,
    parsePath: () => parsePath,
    parsePathDetailed: () => parsePathDetailed,
    phonoSemanticStats: () => phonoSemanticStats,
    placeText: () => placeText,
    polylineLength: () => polylineLength,
    principalAngle: () => principalAngle,
    punctuationShift: () => punctuationShift,
    radicalFrequency: () => radicalFrequency,
    rasterizeGlyph: () => rasterizeGlyph,
    rasterizePolygons: () => rasterizePolygons,
    rasterizeStrokes: () => rasterizeStrokes,
    resampleByArcLength: () => resampleByArcLength,
    resampleClosed: () => resampleClosed,
    resizeMask: () => resizeMask,
    resizeMaskSmooth: () => resizeMaskSmooth,
    resolveStructure: () => resolveStructure,
    rotate: () => rotate,
    rotateAround: () => rotateAround,
    scale: () => scale,
    scaleAround: () => scaleAround,
    scaleGrid: () => scaleGrid,
    segmentBlocks: () => segmentBlocks,
    setPixel: () => setPixel,
    simplifyPolyline: () => simplifyPolyline,
    snapToAxes: () => snapToAxes,
    spatialGroups: () => spatialGroups,
    splitStrokes: () => splitStrokes,
    stepAt: () => stepAt,
    strokeCount: () => strokeCount,
    strokeOrder: () => strokeOrder,
    strokeStats: () => strokeStats,
    strokeToContour: () => strokeToContour,
    strokesInOrder: () => strokesInOrder,
    traceTemplateToSvg: () => traceTemplateToSvg,
    translate: () => translate,
    verticalExtent: () => verticalExtent,
    windowSum: () => windowSum
  });

  // src/geometry/path.ts
  var TOKEN_RE = /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  var ARGS = {
    M: 2,
    L: 2,
    H: 1,
    V: 1,
    C: 6,
    S: 4,
    Q: 4,
    T: 2,
    A: 7,
    Z: 0
  };
  var FLATTEN_SEGMENTS = {
    cubic: 32,
    quadratic: 24,
    arc: 48
  };
  function flattenCubic(x0, y0, x1, y1, x2, y2, x3, y3, segments = FLATTEN_SEGMENTS.cubic) {
    const out = [];
    for (let k = 1; k <= segments; k += 1) {
      const t = k / segments;
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      out.push({
        x: a * x0 + b * x1 + c * x2 + d * x3,
        y: a * y0 + b * y1 + c * y2 + d * y3
      });
    }
    return out;
  }
  function flattenQuadratic(x0, y0, x1, y1, x2, y2, segments = FLATTEN_SEGMENTS.quadratic) {
    const out = [];
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
  function flattenArc(x0, y0, rxIn, ryIn, rotationDeg, largeArc, sweep, x, y, segments = FLATTEN_SEGMENTS.arc) {
    if (rxIn === 0 || ryIn === 0 || x0 === x && y0 === y) {
      return [{ x, y }];
    }
    const rxAbs = Math.abs(rxIn);
    const ryAbs = Math.abs(ryIn);
    const phi = rotationDeg * Math.PI / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const dx2 = (x0 - x) / 2;
    const dy2 = (y0 - y) / 2;
    const x1p = cosPhi * dx2 + sinPhi * dy2;
    const y1p = -sinPhi * dx2 + cosPhi * dy2;
    const lambda = x1p * x1p / (rxAbs * rxAbs) + y1p * y1p / (ryAbs * ryAbs);
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
    const cxp = coef * rx * y1p / ry;
    const cyp = -coef * ry * x1p / rx;
    const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;
    const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let delta = angle(
      (x1p - cxp) / rx,
      (y1p - cyp) / ry,
      (-x1p - cxp) / rx,
      (-y1p - cyp) / ry
    );
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    else if (sweep && delta < 0) delta += 2 * Math.PI;
    const out = [];
    for (let k = 1; k <= segments; k += 1) {
      const t = theta1 + delta * k / segments;
      out.push({
        x: cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t) + cx,
        y: sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t) + cy
      });
    }
    return out;
  }
  function parsePath(d) {
    return parsePathDetailed(d).subpaths;
  }
  function parsePathDetailed(d) {
    const tokens = d.match(TOKEN_RE);
    if (!tokens) return { subpaths: [], closed: [] };
    const subpaths = [];
    const closedFlags = [];
    let current = [];
    let cx = 0;
    let cy = 0;
    let sx = 0;
    let sy = 0;
    let lastCubicCtrl = null;
    let lastQuadCtrl = null;
    let command = null;
    const flush = (closed) => {
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
          cx = sx;
          cy = sy;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          continue;
        }
      }
      if (command === null) {
        throw new Error(`path \u6570\u636E\u4EE5\u5750\u6807\u5F00\u5934\uFF0C\u7F3A\u5C11\u547D\u4EE4\uFF1A${d.slice(0, 60)}`);
      }
      const upper = command.toUpperCase();
      const relative = command !== upper;
      const argc = ARGS[upper];
      if (argc === void 0) {
        throw new Error(`\u672A\u77E5\u547D\u4EE4 ${command}`);
      }
      if (i + argc > tokens.length) {
        throw new Error(`\u547D\u4EE4 ${command} \u7684\u53C2\u6570\u4E0D\u8DB3\uFF1A${d.slice(0, 60)}`);
      }
      const a = [];
      for (let k = 0; k < argc; k += 1) a.push(Number(tokens[i + k]));
      i += argc;
      switch (upper) {
        case "M": {
          flush(false);
          let x = a[0];
          let y = a[1];
          if (relative) {
            x += cx;
            y += cy;
          }
          current = [{ x, y }];
          cx = x;
          cy = y;
          sx = x;
          sy = y;
          command = relative ? "l" : "L";
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          break;
        }
        case "L": {
          let x = a[0];
          let y = a[1];
          if (relative) {
            x += cx;
            y += cy;
          }
          current.push({ x, y });
          cx = x;
          cy = y;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          break;
        }
        case "H": {
          let x = a[0];
          if (relative) x += cx;
          current.push({ x, y: cy });
          cx = x;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          break;
        }
        case "V": {
          let y = a[0];
          if (relative) y += cy;
          current.push({ x: cx, y });
          cy = y;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          break;
        }
        case "C": {
          let x1 = a[0], y1 = a[1], x2 = a[2], y2 = a[3], x = a[4], y = a[5];
          if (relative) {
            x1 += cx;
            y1 += cy;
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          current.push(...flattenCubic(cx, cy, x1, y1, x2, y2, x, y));
          lastCubicCtrl = { x: x2, y: y2 };
          lastQuadCtrl = null;
          cx = x;
          cy = y;
          break;
        }
        case "S": {
          let x2 = a[0], y2 = a[1], x = a[2], y = a[3];
          if (relative) {
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          const x1 = lastCubicCtrl ? 2 * cx - lastCubicCtrl.x : cx;
          const y1 = lastCubicCtrl ? 2 * cy - lastCubicCtrl.y : cy;
          current.push(...flattenCubic(cx, cy, x1, y1, x2, y2, x, y));
          lastCubicCtrl = { x: x2, y: y2 };
          lastQuadCtrl = null;
          cx = x;
          cy = y;
          break;
        }
        case "Q": {
          let x1 = a[0], y1 = a[1], x = a[2], y = a[3];
          if (relative) {
            x1 += cx;
            y1 += cy;
            x += cx;
            y += cy;
          }
          current.push(...flattenQuadratic(cx, cy, x1, y1, x, y));
          lastQuadCtrl = { x: x1, y: y1 };
          lastCubicCtrl = null;
          cx = x;
          cy = y;
          break;
        }
        case "T": {
          let x = a[0], y = a[1];
          if (relative) {
            x += cx;
            y += cy;
          }
          const x1 = lastQuadCtrl ? 2 * cx - lastQuadCtrl.x : cx;
          const y1 = lastQuadCtrl ? 2 * cy - lastQuadCtrl.y : cy;
          current.push(...flattenQuadratic(cx, cy, x1, y1, x, y));
          lastQuadCtrl = { x: x1, y: y1 };
          lastCubicCtrl = null;
          cx = x;
          cy = y;
          break;
        }
        case "A": {
          const x = a[5];
          const y = a[6];
          current.push(...flattenArc(cx, cy, a[0], a[1], a[2], a[3] !== 0, a[4] !== 0, x, y));
          cx = x;
          cy = y;
          lastCubicCtrl = null;
          lastQuadCtrl = null;
          break;
        }
        default:
          throw new Error(`\u672A\u5904\u7406\u7684\u547D\u4EE4 ${command}`);
      }
    }
    flush(false);
    return { subpaths, closed: closedFlags };
  }
  function polylineLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }
  function boundsOf(subpaths) {
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
  function centerOf(rect) {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  function areaOf(rect) {
    return rect.width * rect.height;
  }
  function centroidOf(subpaths) {
    let sumX = 0;
    let sumY = 0;
    let sumW = 0;
    for (const sp of subpaths) {
      if (sp.length < 2) {
        if (sp.length === 1) {
          sumX += sp[0].x;
          sumY += sp[0].y;
          sumW += 1;
        }
        continue;
      }
      const closed = Math.abs(sp[0].x - sp[sp.length - 1].x) < 1e-6 && Math.abs(sp[0].y - sp[sp.length - 1].y) < 1e-6;
      if (closed) {
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
          sumX += cx / (6 * area) * w;
          sumY += cy / (6 * area) * w;
          sumW += w;
          continue;
        }
      }
      for (let i = 1; i < sp.length; i += 1) {
        const p = sp[i - 1];
        const q = sp[i];
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        if (len <= 0) continue;
        sumX += (p.x + q.x) / 2 * len;
        sumY += (p.y + q.y) / 2 * len;
        sumW += len;
      }
    }
    if (sumW <= 0) return { x: 0, y: 0 };
    return { x: sumX / sumW, y: sumY / sumW };
  }

  // src/geometry/sample.ts
  function resampleByArcLength(points, count) {
    if (count <= 0) return [];
    if (points.length === 0) return [];
    if (points.length === 1) return new Array(count).fill({ ...points[0] });
    const cumulative = [0];
    for (let i = 1; i < points.length; i += 1) {
      cumulative.push(
        cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      );
    }
    const total = cumulative[cumulative.length - 1];
    if (total <= 0) return new Array(count).fill({ ...points[0] });
    const out = [];
    for (let k = 0; k < count; k += 1) {
      const target = total * k / (count - 1);
      let j = 1;
      while (j < cumulative.length - 1 && cumulative[j] < target) j += 1;
      const segStart = cumulative[j - 1];
      const segLen = cumulative[j] - segStart;
      const u = segLen <= 0 ? 0 : (target - segStart) / segLen;
      out.push({
        x: points[j - 1].x + u * (points[j].x - points[j - 1].x),
        y: points[j - 1].y + u * (points[j].y - points[j - 1].y)
      });
    }
    return out;
  }
  function resampleClosed(points, count) {
    if (count <= 0) return [];
    if (points.length < 2) return new Array(count).fill({ ...points[0] ?? { x: 0, y: 0 } });
    const ring = points.slice();
    if (ring[0].x !== ring[ring.length - 1].x || ring[0].y !== ring[ring.length - 1].y) {
      ring.push({ ...ring[0] });
    }
    const cumulative = [0];
    for (let i = 1; i < ring.length; i += 1) {
      cumulative.push(
        cumulative[i - 1] + Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y)
      );
    }
    const total = cumulative[cumulative.length - 1];
    if (total <= 0) return new Array(count).fill({ ...ring[0] });
    const out = [];
    for (let k = 0; k < count; k += 1) {
      const target = total * k / count;
      let j = 1;
      while (j < cumulative.length - 1 && cumulative[j] < target) j += 1;
      const segStart = cumulative[j - 1];
      const segLen = cumulative[j] - segStart;
      const u = segLen <= 0 ? 0 : (target - segStart) / segLen;
      out.push({
        x: ring[j - 1].x + u * (ring[j].x - ring[j - 1].x),
        y: ring[j - 1].y + u * (ring[j].y - ring[j - 1].y)
      });
    }
    return out;
  }
  function centroid(points) {
    if (points.length === 0) return { x: 0, y: 0 };
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / points.length, y: sy / points.length };
  }
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function distanceToPolyline(p, poly) {
    if (poly.length === 0) return Infinity;
    if (poly.length === 1) return Math.hypot(p.x - poly[0].x, p.y - poly[0].y);
    let best = Infinity;
    for (let i = 1; i < poly.length; i += 1) {
      const d = distanceToSegment(p, poly[i - 1], poly[i]);
      if (d < best) best = d;
    }
    return best;
  }
  function principalAngle(points) {
    if (points.length < 2) return 0;
    const c = centroid(points);
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of points) {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    return 0.5 * Math.atan2(2 * sxy, sxx - syy);
  }

  // src/geometry/transform.ts
  var IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  function compose(m2, m1) {
    return {
      a: m2.a * m1.a + m2.c * m1.b,
      b: m2.b * m1.a + m2.d * m1.b,
      c: m2.a * m1.c + m2.c * m1.d,
      d: m2.b * m1.c + m2.d * m1.d,
      e: m2.a * m1.e + m2.c * m1.f + m2.e,
      f: m2.b * m1.e + m2.d * m1.f + m2.f
    };
  }
  function invert(m) {
    const det = m.a * m.d - m.b * m.c;
    if (Math.abs(det) < 1e-12) return { ...IDENTITY };
    return {
      a: m.d / det,
      b: -m.b / det,
      c: -m.c / det,
      d: m.a / det,
      e: (m.c * m.f - m.d * m.e) / det,
      f: (m.b * m.e - m.a * m.f) / det
    };
  }
  function translate(tx, ty) {
    return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
  }
  function scale(sx, sy = sx) {
    return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
  }
  function rotate(rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  }
  function rotateAround(pivot, rad) {
    return compose(translate(pivot.x, pivot.y), compose(rotate(rad), translate(-pivot.x, -pivot.y)));
  }
  function scaleAround(pivot, sx, sy = sx) {
    return compose(translate(pivot.x, pivot.y), compose(scale(sx, sy), translate(-pivot.x, -pivot.y)));
  }
  function apply(m, p) {
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  }
  function applyAll(m, points) {
    return points.map((p) => apply(m, p));
  }
  function applyToSubpaths(m, subpaths) {
    return subpaths.map((sp) => applyAll(m, sp));
  }
  function applyToRect(m, r) {
    const corners = [
      apply(m, { x: r.x, y: r.y }),
      apply(m, { x: r.x + r.width, y: r.y }),
      apply(m, { x: r.x + r.width, y: r.y + r.height }),
      apply(m, { x: r.x, y: r.y + r.height })
    ];
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  function fitToBox(src, dst, uniform = true) {
    if (src.width <= 0 || src.height <= 0) return { ...IDENTITY };
    let sx = dst.width / src.width;
    let sy = dst.height / src.height;
    if (uniform) {
      const s = Math.min(sx, sy);
      sx = s;
      sy = s;
    }
    const dx = dst.x + dst.width / 2 - (src.x + src.width / 2) * sx;
    const dy = dst.y + dst.height / 2 - (src.y + src.height / 2) * sy;
    return { a: sx, b: 0, c: 0, d: sy, e: dx, f: dy };
  }

  // src/geometry/centerline.ts
  var DEFAULT_SAMPLES = 48;
  function contourToCenterline(sp, samples = DEFAULT_SAMPLES) {
    if (sp.length < 3) return null;
    const n = Math.max(8, samples * 2);
    const ring = resampleClosed(sp, n);
    if (ring.length < 8) return null;
    const angle = principalAngle(ring);
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
    const cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
    let i0 = 0;
    let i1 = 0;
    let t0 = Infinity;
    let t1 = -Infinity;
    for (let i = 0; i < ring.length; i += 1) {
      const t = (ring[i].x - cx) * ux + (ring[i].y - cy) * uy;
      if (t < t0) {
        t0 = t;
        i0 = i;
      }
      if (t > t1) {
        t1 = t;
        i1 = i;
      }
    }
    if (t1 - t0 <= 1e-9) return null;
    const sideA = [];
    for (let i = i0; ; i = (i + 1) % ring.length) {
      sideA.push(ring[i]);
      if (i === i1) break;
    }
    const sideB = [];
    for (let i = i1; ; i = (i + 1) % ring.length) {
      sideB.push(ring[i]);
      if (i === i0) break;
    }
    if (sideA.length < 2 || sideB.length < 2) return null;
    const a = resampleByArcLength(sideA, samples);
    const b = resampleByArcLength(sideB, samples);
    if (a.length < 2 || b.length < 2) return null;
    const points = [];
    const halfWidths = [];
    for (let k = 0; k < samples; k += 1) {
      const p = a[k];
      const q = b[samples - 1 - k];
      points.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      halfWidths.push(Math.hypot(p.x - q.x, p.y - q.y) / 2);
    }
    const length = polylineLength(points);
    if (length <= 1e-6) return null;
    const maxHalf = Math.max(...halfWidths);
    if (maxHalf <= 1e-6) return null;
    const perimeter = polylineLength(ring);
    if (length < 0.75 * (perimeter / 2)) return null;
    return { points, halfWidths, length };
  }
  function outlineFromCenterline(center, options = {}) {
    const pts = center.points;
    if (pts.length < 2) return [];
    const scale2 = options.halfWidthScale ?? 1;
    const halfAt = (t) => {
      if (center.halfWidths.length === 0) return 0;
      const idx = Math.max(0, Math.min(center.halfWidths.length - 1, Math.round(t * (center.halfWidths.length - 1))));
      return center.halfWidths[idx] * scale2;
    };
    const left = [];
    const right = [];
    for (let i = 0; i < pts.length; i += 1) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * halfAt(i / (pts.length - 1));
      const ny = dx / len * halfAt(i / (pts.length - 1));
      left.push({ x: pts[i].x + nx, y: pts[i].y + ny });
      right.push({ x: pts[i].x - nx, y: pts[i].y - ny });
    }
    right.reverse();
    return [...left, ...right];
  }

  // src/raster/mask.ts
  function createMask(width, height) {
    return { data: new Uint8Array(width * height), width, height };
  }
  function getPixel(mask, x, y) {
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
    return mask.data[y * mask.width + x];
  }
  function setPixel(mask, x, y, value) {
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
    mask.data[y * mask.width + x] = value;
  }
  function countInk(mask) {
    let n = 0;
    for (let i = 0; i < mask.data.length; i += 1) if (mask.data[i]) n += 1;
    return n;
  }
  function encodeMaskBase64(mask) {
    const bytes = new Uint8Array(Math.ceil(mask.data.length / 8));
    for (let i = 0; i < mask.data.length; i += 1) {
      if (mask.data[i]) bytes[i >> 3] |= 1 << (i & 7);
    }
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  function decodeMaskBase64(data, width, height) {
    const bin = atob(data);
    const mask = createMask(width, height);
    for (let i = 0; i < mask.data.length; i += 1) {
      const byte = bin.charCodeAt(i >> 3) || 0;
      mask.data[i] = byte >> (i & 7) & 1;
    }
    return mask;
  }
  function inkRatio(mask) {
    if (mask.data.length === 0) return 0;
    return countInk(mask) / mask.data.length;
  }
  function inkBounds(mask) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (mask.data[y * mask.width + x]) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  function hasEnclosedHole(mask) {
    const { width: w, height: h } = mask;
    if (w < 3 || h < 3) return false;
    const inv = { width: w, height: h, data: new Uint8Array(w * h) };
    for (let i = 0; i < w * h; i += 1) inv.data[i] = mask.data[i] ? 0 : 1;
    const cc = connectedComponents(inv, 4);
    const outside = /* @__PURE__ */ new Set();
    for (let x = 0; x < w; x += 1) {
      const t = cc.label[x];
      if (t >= 0) outside.add(t);
      const b = cc.label[(h - 1) * w + x];
      if (b >= 0) outside.add(b);
    }
    for (let y = 0; y < h; y += 1) {
      const l = cc.label[y * w];
      if (l >= 0) outside.add(l);
      const r = cc.label[y * w + w - 1];
      if (r >= 0) outside.add(r);
    }
    for (let i = 0; i < cc.ink.length; i += 1) {
      if (!outside.has(i) && cc.ink[i] > 0) return true;
    }
    return false;
  }
  function cropToInk(mask) {
    const b = inkBounds(mask);
    if (!b) return { mask: createMask(mask.width, mask.height), offsetX: 0, offsetY: 0 };
    const pad = 1;
    const x0 = Math.max(0, b.x0 - pad);
    const y0 = Math.max(0, b.y0 - pad);
    const x1 = Math.min(mask.width, b.x1 + 1 + pad);
    const y1 = Math.min(mask.height, b.y1 + 1 + pad);
    const w = x1 - x0;
    const h = y1 - y0;
    const out = createMask(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        out.data[y * w + x] = mask.data[(y + y0) * mask.width + (x + x0)];
      }
    }
    return { mask: out, offsetX: x0, offsetY: y0 };
  }
  function resizeMask(mask, width, height) {
    const out = createMask(width, height);
    for (let y = 0; y < height; y += 1) {
      const sy = Math.min(mask.height - 1, Math.floor(y * mask.height / height));
      for (let x = 0; x < width; x += 1) {
        const sx = Math.min(mask.width - 1, Math.floor(x * mask.width / width));
        out.data[y * width + x] = mask.data[sy * mask.width + sx];
      }
    }
    return out;
  }
  function resizeMaskSmooth(mask, width, height) {
    const out = createMask(width, height);
    const sx = mask.width / width;
    const sy = mask.height / height;
    for (let y = 0; y < height; y += 1) {
      const fy = (y + 0.5) * sy - 0.5;
      const y0 = Math.max(0, Math.min(mask.height - 1, Math.floor(fy)));
      const y1 = Math.min(mask.height - 1, y0 + 1);
      const wy = fy - y0;
      for (let x = 0; x < width; x += 1) {
        const fx = (x + 0.5) * sx - 0.5;
        const x0 = Math.max(0, Math.min(mask.width - 1, Math.floor(fx)));
        const x1 = Math.min(mask.width - 1, x0 + 1);
        const wx = fx - x0;
        const v = mask.data[y0 * mask.width + x0] * (1 - wx) * (1 - wy) + mask.data[y0 * mask.width + x1] * wx * (1 - wy) + mask.data[y1 * mask.width + x0] * (1 - wx) * wy + mask.data[y1 * mask.width + x1] * wx * wy;
        out.data[y * width + x] = v > 0.375 ? 1 : 0;
      }
    }
    return out;
  }
  function connectedComponents(mask, connectivity = 8) {
    const { width: w, height: h } = mask;
    const label = new Int32Array(w * h).fill(-1);
    const ink = [];
    const stack = [];
    for (let start = 0; start < label.length; start += 1) {
      if (label[start] !== -1 || !mask.data[start]) continue;
      const id = ink.length;
      let count = 0;
      stack.length = 0;
      stack.push(start);
      label[start] = id;
      while (stack.length > 0) {
        const p = stack.pop();
        count += 1;
        const px = p % w;
        const py = (p - px) / w;
        const push2 = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const q = ny * w + nx;
          if (label[q] !== -1 || !mask.data[q]) return;
          label[q] = id;
          stack.push(q);
        };
        push2(px + 1, py);
        push2(px - 1, py);
        push2(px, py + 1);
        push2(px, py - 1);
        if (connectivity === 8) {
          push2(px + 1, py + 1);
          push2(px - 1, py - 1);
          push2(px + 1, py - 1);
          push2(px - 1, py + 1);
        }
      }
      ink.push(count);
    }
    return { label, ink };
  }
  function rasterizePolygons(subpaths, width, height) {
    const mask = createMask(width, height);
    const edges = [];
    for (const sp of subpaths) {
      if (sp.length < 2) continue;
      const ring = sp.length > 1 && sp[0].x === sp[sp.length - 1].x && sp[0].y === sp[sp.length - 1].y ? sp : [...sp, sp[0]];
      for (let i = 1; i < ring.length; i += 1) {
        const a = ring[i - 1];
        const b = ring[i];
        if (a.y === b.y) continue;
        edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
      }
    }
    if (edges.length === 0) return mask;
    const buckets = Array.from({ length: height }, () => []);
    for (const e of edges) {
      const top = Math.min(e.y0, e.y1);
      const bot = Math.max(e.y0, e.y1);
      const yStart = Math.max(0, Math.ceil(top - 0.5));
      const yEnd = Math.min(height - 1, Math.floor(bot - 0.5));
      for (let y = yStart; y <= yEnd; y += 1) buckets[y].push(e);
    }
    const xs = [];
    const dirs = [];
    for (let y = 0; y < height; y += 1) {
      const yc = y + 0.5;
      xs.length = 0;
      dirs.length = 0;
      for (const e of buckets[y]) {
        const t = (yc - e.y0) / (e.y1 - e.y0);
        xs.push(e.x0 + t * (e.x1 - e.x0));
        dirs.push(e.y1 > e.y0 ? 1 : -1);
      }
      if (xs.length < 2) continue;
      const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
      let winding = 0;
      for (let k = 0; k < order.length - 1; k += 1) {
        winding += dirs[order[k]];
        if (winding === 0) continue;
        const xa = xs[order[k]];
        const xb = xs[order[k + 1]];
        const px0 = Math.max(0, Math.ceil(xa - 0.5));
        const px1 = Math.min(width - 1, Math.floor(xb - 0.5));
        for (let x = px0; x <= px1; x += 1) mask.data[y * width + x] = 1;
      }
    }
    return mask;
  }
  function rasterizeStrokes(strokes, width, height) {
    const mask = createMask(width, height);
    for (const { points, halfWidth } of strokes) {
      if (points.length < 2) continue;
      const r = Math.max(0.5, halfWidth);
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
        for (let s = 0; s <= steps; s += 1) {
          const t = s / steps;
          const cx = a.x + t * (b.x - a.x);
          const cy = a.y + t * (b.y - a.y);
          const x0 = Math.max(0, Math.floor(cx - r));
          const x1 = Math.min(width - 1, Math.ceil(cx + r));
          const y0 = Math.max(0, Math.floor(cy - r));
          const y1 = Math.min(height - 1, Math.ceil(cy + r));
          const rr = r * r;
          for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
              const dx = x + 0.5 - cx;
              const dy = y + 0.5 - cy;
              if (dx * dx + dy * dy <= rr) mask.data[y * width + x] = 1;
            }
          }
        }
      }
    }
    return mask;
  }
  function rasterizeGlyph(subpaths, opts) {
    const { width, height, viewBox } = opts;
    const sx = width / (viewBox.width || 1);
    const sy = height / (viewBox.height || 1);
    const map = (p) => ({
      x: (p.x - viewBox.x) * sx,
      y: (p.y - viewBox.y) * sy
    });
    if (opts.strokes && opts.strokes.length > 0) {
      const scaled = opts.strokes.map((s) => ({
        points: s.points.map(map),
        halfWidth: s.halfWidth * Math.abs(sx)
      }));
      return rasterizeStrokes(scaled, width, height);
    }
    const polys = subpaths.map((sp) => sp.map(map));
    return rasterizePolygons(polys, width, height);
  }
  function boundsInPixels(subpaths, viewBox, width, height) {
    const b = boundsOf(subpaths);
    const sx = width / (viewBox.width || 1);
    const sy = height / (viewBox.height || 1);
    return {
      x: (b.x - viewBox.x) * sx,
      y: (b.y - viewBox.y) * sy,
      width: b.width * sx,
      height: b.height * sy
    };
  }

  // src/raster/fft.ts
  function fft1d(re, im, inverse) {
    const n = re.length;
    if (n <= 1) return;
    if ((n & n - 1) !== 0) {
      throw new Error(`FFT \u957F\u5EA6\u5FC5\u987B\u662F 2 \u7684\u5E42\uFF0C\u6536\u5230 ${n}`);
    }
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = 2 * Math.PI / len * (inverse ? 1 : -1);
      const wRe = Math.cos(ang);
      const wIm = Math.sin(ang);
      const half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let curRe = 1;
        let curIm = 0;
        for (let k = 0; k < half; k += 1) {
          const aRe = re[i + k];
          const aIm = im[i + k];
          const bRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
          const bIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
          re[i + k] = aRe + bRe;
          im[i + k] = aIm + bIm;
          re[i + k + half] = aRe - bRe;
          im[i + k + half] = aIm - bIm;
          const nextRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = nextRe;
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < n; i += 1) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }
  function fft2d(re, im, rows, cols, inverse) {
    const rowRe = new Float64Array(cols);
    const rowIm = new Float64Array(cols);
    for (let r = 0; r < rows; r += 1) {
      const off = r * cols;
      for (let c = 0; c < cols; c += 1) {
        rowRe[c] = re[off + c];
        rowIm[c] = im[off + c];
      }
      fft1d(rowRe, rowIm, inverse);
      for (let c = 0; c < cols; c += 1) {
        re[off + c] = rowRe[c];
        im[off + c] = rowIm[c];
      }
    }
    const colRe = new Float64Array(rows);
    const colIm = new Float64Array(rows);
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        colRe[r] = re[r * cols + c];
        colIm[r] = im[r * cols + c];
      }
      fft1d(colRe, colIm, inverse);
      for (let r = 0; r < rows; r += 1) {
        re[r * cols + c] = colRe[r];
        im[r * cols + c] = colIm[r];
      }
    }
  }
  function nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  // src/raster/match.ts
  function scaleGrid(min, max, step) {
    const out = [];
    for (let v = min; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(4)));
    return out;
  }
  function integralImage(mask) {
    const { width: w, height: h } = mask;
    const ii = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y += 1) {
      let rowSum = 0;
      for (let x = 0; x < w; x += 1) {
        rowSum += mask.data[y * w + x];
        ii[(y + 1) * (w + 1) + (x + 1)] = ii[y * (w + 1) + (x + 1)] + rowSum;
      }
    }
    return ii;
  }
  function windowSum(ii, stride, x, y, ww, wh) {
    return ii[(y + wh) * stride + (x + ww)] - ii[y * stride + (x + ww)] - ii[(y + wh) * stride + x] + ii[y * stride + x];
  }
  var TemplateMatcher = class {
    image;
    n;
    m;
    imageRe;
    imageIm;
    ii;
    componentInk;
    componentBox;
    constructor(image) {
      this.image = image;
      this.n = nextPow2(image.height * 2);
      this.m = nextPow2(image.width * 2);
      this.imageRe = new Float64Array(this.n * this.m);
      this.imageIm = new Float64Array(this.n * this.m);
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          this.imageRe[y * this.m + x] = image.data[y * image.width + x];
        }
      }
      fft2d(this.imageRe, this.imageIm, this.n, this.m, false);
      this.ii = integralImage(image);
      const cc = connectedComponents(image);
      this.componentInk = cc.ink;
      this.componentBox = componentBoxes(image, cc.label, cc.ink.length);
    }
    /**
     * 匹配框的「连通域精确率」。
     *
     * 框内墨量 ÷ 框所触及的**全部**连通域的墨量。
     *
     * 这一项治的是「只截取笔画的一部分」：小方块嵌在一根粗笔画里时，
     * 它在框内是满分，但框只覆盖了那根笔画的 6%，精确率就低；
     * 而真正的部首作为完整的一组笔画被框住时，精确率接近 1。
     *
     * 用连通域的**外接框**判断是否被触及（O(连通域数)），比逐像素查标签快得多；
     * 外接框相交是像素相交的超集，略微低估精确率，但不影响候选之间的排序。
     */
    precisionAt(x, y, w, h, overlap) {
      if (overlap <= 0) return 0;
      const x1 = x + w;
      const y1 = y + h;
      let total = 0;
      for (let c = 0; c < this.componentInk.length; c += 1) {
        const b = this.componentBox[c];
        if (b.x >= x1 || b.x1 <= x || b.y >= y1 || b.y1 <= y) continue;
        total += this.componentInk[c];
      }
      return total > 0 ? overlap / total : 0;
    }
    /**
     * 在图像中找出与模板最匹配的位置（模板已按 (fx, fy) 缩放）。
     *
     * 走 FFT：一次变换就能扫全图。
     */
    matchScaled(template, fx, fy) {
      const th = template.height;
      const tw = template.width;
      if (th > this.image.height || tw > this.image.width) return null;
      const tArea = countInk(template);
      if (tArea === 0) return null;
      const tRe = new Float64Array(this.n * this.m);
      const tIm = new Float64Array(this.n * this.m);
      for (let y = 0; y < th; y += 1) {
        for (let x = 0; x < tw; x += 1) {
          tRe[y * this.m + x] = template.data[y * tw + x];
        }
      }
      fft2d(tRe, tIm, this.n, this.m, false);
      const re = new Float64Array(this.n * this.m);
      const im = new Float64Array(this.n * this.m);
      for (let i = 0; i < this.n * this.m; i += 1) {
        re[i] = this.imageRe[i] * tRe[i] + this.imageIm[i] * tIm[i];
        im[i] = this.imageIm[i] * tRe[i] - this.imageRe[i] * tIm[i];
      }
      fft2d(re, im, this.n, this.m, true);
      const vh = this.image.height - th + 1;
      const vw = this.image.width - tw + 1;
      const Q = 1e6;
      const nccMap = new Float64Array(vh * vw);
      let bestQ = -Infinity;
      for (let y = 0; y < vh; y += 1) {
        for (let x = 0; x < vw; x += 1) {
          const overlap = re[y * this.m + x];
          const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
          const denom = Math.sqrt(Math.max(energy, 1e-6) * tArea);
          const ncc = overlap / denom;
          nccMap[y * vw + x] = ncc;
          const q = Math.round(ncc * Q);
          if (q > bestQ) bestQ = q;
        }
      }
      if (!Number.isFinite(bestQ)) return null;
      const threshold = (bestQ - 1) / Q;
      let best = null;
      let bestPrecision = -1;
      for (let y = 0; y < vh; y += 1) {
        for (let x = 0; x < vw; x += 1) {
          const ncc = nccMap[y * vw + x];
          if (ncc < threshold) continue;
          const overlap = re[y * this.m + x];
          const precision = this.precisionAt(x, y, tw, th, overlap);
          if (precision <= bestPrecision) continue;
          bestPrecision = precision;
          const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
          const union = tArea + energy - overlap;
          best = {
            score: ncc,
            x,
            y,
            width: tw,
            height: th,
            fx,
            fy,
            coverage: overlap / tArea,
            iou: union > 0 ? overlap / union : 0,
            precision
          };
        }
      }
      return best;
    }
    /**
     * 在给定中心附近做**直接**匹配（不走 FFT）。
     *
     * 各向异性细搜要试成百上千组 (fx, fy)，每组都做一次全图 FFT 太贵；
     * 但细搜的位置一定在等比粗搜的解附近，所以只在邻域内直接算就够了。
     */
    matchScaledNear(template, fx, fy, centerX, centerY, radius) {
      const th = template.height;
      const tw = template.width;
      if (th > this.image.height || tw > this.image.width) return null;
      const tArea = countInk(template);
      if (tArea === 0) return null;
      const pts = [];
      for (let y = 0; y < th; y += 1) {
        for (let x = 0; x < tw; x += 1) {
          if (template.data[y * tw + x]) pts.push(y * tw + x);
        }
      }
      if (pts.length === 0) return null;
      const stride = Math.max(1, Math.floor(pts.length / 400));
      const sample = pts.filter((_, i) => i % stride === 0);
      const tAreaSampled = sample.length;
      const x0 = Math.max(0, centerX - radius);
      const x1 = Math.max(x0, Math.min(this.image.width - tw, centerX + radius));
      const y0 = Math.max(0, centerY - radius);
      const y1 = Math.max(y0, Math.min(this.image.height - th, centerY + radius));
      if (x1 < x0 || y1 < y0) return null;
      let best = null;
      let bestQ = -Infinity;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          let overlap = 0;
          for (let i = 0; i < sample.length; i += 1) {
            const p = sample[i];
            const py = y + Math.floor(p / tw);
            const px = x + p % tw;
            if (this.image.data[py * this.image.width + px]) overlap += 1;
          }
          const energy = windowSum(this.ii, this.image.width + 1, x, y, tw, th);
          const ncc = overlap / Math.sqrt(Math.max(energy, 1e-6) * tAreaSampled);
          const q = Math.round(ncc * 1e6);
          if (q > bestQ) {
            bestQ = q;
            const realOverlap = overlap * tArea / tAreaSampled;
            const precision = this.precisionAt(x, y, tw, th, realOverlap);
            const union = tArea + energy - realOverlap;
            best = {
              score: ncc,
              x,
              y,
              width: tw,
              height: th,
              fx,
              fy,
              coverage: realOverlap / tArea,
              iou: union > 0 ? realOverlap / union : 0,
              precision
            };
          }
        }
      }
      return best;
    }
  };
  function componentBoxes(mask, label, count) {
    const boxes = [];
    for (let i = 0; i < count; i += 1) boxes.push({ x: Infinity, y: Infinity, x1: -Infinity, y1: -Infinity });
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        const id = label[y * mask.width + x];
        if (id < 0) continue;
        const b = boxes[id];
        if (x < b.x) b.x = x;
        if (y < b.y) b.y = y;
        if (x + 1 > b.x1) b.x1 = x + 1;
        if (y + 1 > b.y1) b.y1 = y + 1;
      }
    }
    return boxes;
  }
  function matchTemplate(image, rawTemplate, options = {}) {
    const minScale = options.minScale ?? 0.3;
    const maxScale = options.maxScale ?? 1.15;
    const coarseStep = options.coarseStep ?? 0.1;
    const fineStep = options.fineStep ?? 0.025;
    const fineRadius = options.fineRadius ?? 1;
    const cropped = cropToInk(rawTemplate).mask;
    if (countInk(cropped) === 0) return null;
    const matcher = new TemplateMatcher(image);
    const evaluate = (fx, fy) => {
      const tw = Math.max(4, Math.round(cropped.width * fx));
      const th = Math.max(4, Math.round(cropped.height * fy));
      if (tw > image.width || th > image.height) return null;
      const scaled = resizeMaskSmooth(cropped, tw, th);
      return matcher.matchScaled(scaled, fx, fy);
    };
    const better = (a, b) => {
      const qa = Math.round(a.score * 1e6);
      const qb = Math.round(b.score * 1e6);
      if (qa !== qb) return qa > qb;
      if (Math.abs(a.precision - b.precision) > 1e-6) return a.precision > b.precision;
      return a.width * a.height > b.width * b.height;
    };
    let best = null;
    for (const s of scaleGrid(minScale, maxScale, coarseStep)) {
      const r = evaluate(s, s);
      if (r && (!best || better(r, best))) best = r;
    }
    if (!best) return null;
    const grid = scaleGrid(minScale, maxScale, coarseStep / 2);
    const maxAniso = options.maxAnisotropy ?? 2;
    const aspects = [];
    for (const fy of grid) {
      for (const fx of grid) {
        if (fx / fy > maxAniso || fy / fx > maxAniso) continue;
        const tw = Math.max(4, Math.round(cropped.width * fx));
        const th = Math.max(4, Math.round(cropped.height * fy));
        if (tw > image.width || th > image.height) continue;
        const scaled = resizeMaskSmooth(cropped, tw, th);
        const r = matcher.matchScaledNear(
          scaled,
          fx,
          fy,
          best.x,
          best.y,
          0
        );
        if (r) aspects.push({ fx, fy, score: r.score });
      }
    }
    aspects.sort((a, b) => b.score - a.score);
    for (const aspect of aspects.slice(0, 6)) {
      const r = evaluate(aspect.fx, aspect.fy);
      if (r && (!best || better(r, best))) best = r;
    }
    const refined = matcher.matchScaledNear(
      resizeMaskSmooth(
        cropped,
        Math.max(4, Math.round(cropped.width * best.fx)),
        Math.max(4, Math.round(cropped.height * best.fy))
      ),
      best.fx,
      best.fy,
      best.x,
      best.y,
      Math.max(3, Math.round(Math.max(best.width, best.height) / 3))
    );
    if (refined && better(refined, best)) best = refined;
    void fineRadius;
    void fineStep;
    return best;
  }

  // src/glyph.ts
  var VIEWBOX_RE = /^\s*([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s*$/;
  function parseGlyphSvg(svgText) {
    const viewBox = extractViewBox(svgText);
    const paths = [];
    const pathRe = /<path\b([^>]*?)\/?>/gi;
    const dRe = /\bd\s*=\s*"([^"]*)"|\bd\s*=\s*'([^']*)'/i;
    const strokeRe = /\bstroke-width\s*=\s*"?([\d.]+)"?/i;
    let m;
    while ((m = pathRe.exec(svgText)) !== null) {
      const attrs = m[1];
      const dm = dRe.exec(attrs);
      if (!dm) continue;
      const d = dm[1] ?? dm[2];
      if (!d) continue;
      let subpaths;
      let closed;
      try {
        const parsed = parsePathDetailed(d);
        subpaths = parsed.subpaths;
        closed = parsed.closed;
      } catch {
        continue;
      }
      if (subpaths.length === 0) continue;
      const swMatch = strokeRe.exec(attrs);
      const strokeWidth = swMatch ? Number(swMatch[1]) : 0;
      const filled = strokeWidth === 0;
      paths.push({ subpaths, closed, strokeWidth, filled, bounds: boundsOf(subpaths) });
    }
    const allSubpaths = paths.flatMap((p) => p.subpaths);
    return { viewBox, paths, bounds: boundsOf(allSubpaths) };
  }
  function extractViewBox(svgText) {
    const head = svgText.slice(0, 2e3);
    const vb = /viewBox\s*=\s*"([^"]*)"/i.exec(head);
    if (vb) {
      const parsed = VIEWBOX_RE.exec(vb[1]);
      if (parsed) {
        return {
          x: Number(parsed[1]),
          y: Number(parsed[2]),
          width: Number(parsed[3]),
          height: Number(parsed[4])
        };
      }
    }
    const w = Number(/\bwidth\s*=\s*"([\d.]+)"/i.exec(head)?.[1] ?? 400);
    const h = Number(/\bheight\s*=\s*"([\d.]+)"/i.exec(head)?.[1] ?? 400);
    return { x: 0, y: 0, width: w, height: h };
  }
  function glyphPoints(glyph) {
    return glyph.paths.flatMap((p) => p.subpaths.flat());
  }
  function glyphStrokes(glyph) {
    const out = [];
    for (const p of glyph.paths) {
      if (p.filled) continue;
      const sp = p.subpaths[0];
      if (!sp || sp.length < 2) continue;
      out.push({ points: sp, halfWidth: p.strokeWidth / 2 });
    }
    return out;
  }
  function inkViewBox(glyph, margin = 0) {
    const all = glyph.paths.flatMap((p) => p.subpaths).flat();
    if (all.length === 0) return glyph.viewBox;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of all) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const w = Math.max(1e-6, maxX - minX);
    const h = Math.max(1e-6, maxY - minY);
    return {
      x: minX - margin * w,
      y: minY - margin * h,
      width: w + 2 * margin * w,
      height: h + 2 * margin * h
    };
  }
  function isStrokeGlyph(glyph) {
    return glyph.paths.some((p) => !p.filled);
  }

  // src/structure/descriptor.ts
  var DESC_SIZE = 12;
  function parseDescriptor(d) {
    const parts = d.split("|");
    if (parts.length !== 2) return null;
    const aspectText = parts[0];
    const bits = parts[1];
    if (!bits || !/^[01]+$/.test(bits)) return null;
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(aspectText)) return null;
    const aspect = Number(aspectText);
    if (!Number.isFinite(aspect)) return null;
    return { aspect, aspectText, bits };
  }
  function describeMask(mask) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < x0) return "empty";
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const sub = createMask(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (mask.data[(y + y0) * mask.width + (x + x0)]) sub.data[y * w + x] = 1;
      }
    }
    const norm = resizeMaskSmooth(sub, DESC_SIZE, DESC_SIZE);
    let bits = "";
    for (const b of norm.data) bits += b ? "1" : "0";
    const aspect = Math.round(w / h * 3) / 3;
    return `${aspect.toFixed(2)}|${bits}`;
  }
  function descriptorDistance(a, b) {
    if (a === b) return 0;
    if (a === "empty" || b === "empty") return Infinity;
    const pa = parseDescriptor(a);
    const pb = parseDescriptor(b);
    if (!pa || !pb) return Infinity;
    const n = Math.max(pa.bits.length, pb.bits.length);
    let diff = 0;
    for (let i = 0; i < n; i += 1) {
      const x = i < pa.bits.length ? pa.bits[i] : "-";
      const y = i < pb.bits.length ? pb.bits[i] : "-";
      if (x !== y) diff += 1;
    }
    const aspectDiff = Math.abs(logRatio(pa.aspect) - logRatio(pb.aspect));
    const formatDiff = pa.aspectText === pb.aspectText ? 0 : 0.5;
    return diff + aspectDiff * ASPECT_WEIGHT + formatDiff;
  }
  function logRatio(aspect) {
    return Math.log(Math.max(aspect, 1e-3));
  }
  var ASPECT_WEIGHT = 12;
  function minDescriptorDistance(d, refs) {
    let best = Infinity;
    for (const r of refs) {
      const dist = descriptorDistance(d, r);
      if (dist < best) best = dist;
    }
    return best;
  }

  // src/structure/radical.ts
  function boundsOfMask(masks, indices, resolution) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const i of indices) {
      const m = masks[i];
      if (!m) continue;
      for (let y = 0; y < m.height; y += 1) {
        for (let x = 0; x < m.width; x += 1) {
          if (!m.data[y * m.width + x]) continue;
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x + 1 > x1) x1 = x + 1;
          if (y + 1 > y1) y1 = y + 1;
        }
      }
    }
    if (x1 < x0) return { x: 0, y: 0, width: resolution, height: resolution };
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }
  function insideRatio(mask, box) {
    const total = countInk(mask);
    if (total === 0) return 0;
    let inside = 0;
    const y0 = Math.max(0, box.y);
    const y1 = Math.min(mask.height, box.y + box.height);
    const x0 = Math.max(0, box.x);
    const x1 = Math.min(mask.width, box.x + box.width);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        if (mask.data[y * mask.width + x]) inside += 1;
      }
    }
    return inside / total;
  }
  function adjacent(a, b, gap = 2) {
    const aBox = cropToInk(a);
    const bBox = cropToInk(b);
    if (countInk(aBox.mask) === 0 || countInk(bBox.mask) === 0) return false;
    const ax0 = aBox.offsetX - gap;
    const ay0 = aBox.offsetY - gap;
    const ax1 = aBox.offsetX + aBox.mask.width + gap;
    const ay1 = aBox.offsetY + aBox.mask.height + gap;
    const bx0 = bBox.offsetX - gap;
    const by0 = bBox.offsetY - gap;
    const bx1 = bBox.offsetX + bBox.mask.width + gap;
    const by1 = bBox.offsetY + bBox.mask.height + gap;
    if (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0) return false;
    const am = aBox.mask;
    const bm = bBox.mask;
    for (let y = 0; y < am.height; y += 1) {
      for (let x = 0; x < am.width; x += 1) {
        if (!am.data[y * am.width + x]) continue;
        const gx = aBox.offsetX + x;
        const gy = aBox.offsetY + y;
        for (let yy = 0; yy < bm.height; yy += 1) {
          for (let xx = 0; xx < bm.width; xx += 1) {
            if (!bm.data[yy * bm.width + xx]) continue;
            const hx = bBox.offsetX + xx;
            const hy = bBox.offsetY + yy;
            if (Math.hypot(gx - hx, gy - hy) <= gap) return true;
          }
        }
      }
    }
    return false;
  }
  function spatialGroups(masks, indices) {
    const groups = [];
    const seen = /* @__PURE__ */ new Set();
    for (const start of indices) {
      if (seen.has(start)) continue;
      const group = [];
      const queue = [start];
      seen.add(start);
      while (queue.length > 0) {
        const cur = queue.shift();
        group.push(cur);
        for (const cand of indices) {
          if (seen.has(cand)) continue;
          if (adjacent(masks[cur], masks[cand])) {
            seen.add(cand);
            queue.push(cand);
          }
        }
      }
      groups.push(group);
    }
    return groups;
  }
  function locateRadical(glyph, radicalGlyph, options = {}) {
    const resolution = options.resolution ?? 128;
    const pathThreshold = options.pathThreshold ?? 0.4;
    const minScore = options.minScore ?? 0.45;
    const glyphStrokesInfo = isStrokeGlyph(glyph) ? glyphStrokes(glyph) : void 0;
    const frameMode = options.frame ?? "ink";
    const frameOf = (g) => frameMode === "ink" ? inkViewBox(g) : g.viewBox;
    const glyphInk = frameOf(glyph);
    const perPathMasks = glyph.paths.map(
      (p) => rasterizeGlyph(p.subpaths, {
        width: resolution,
        height: resolution,
        viewBox: glyphInk,
        strokes: glyphStrokesInfo ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }] : void 0
      })
    );
    const subpathRefs = [];
    const subpathMasks = [];
    glyph.paths.forEach((p, pi) => {
      p.subpaths.forEach((sp, si) => {
        subpathRefs.push({ path: pi, subpath: si });
        subpathMasks.push(
          rasterizeGlyph([sp], {
            width: resolution,
            height: resolution,
            viewBox: glyphInk,
            strokes: glyphStrokesInfo ? [{ points: sp, halfWidth: p.strokeWidth / 2 }] : void 0
          })
        );
      });
    });
    if (options.radicalTypes && options.radicalTypes.length > 0) {
      const tolerance = options.typeTolerance ?? 38;
      const perPath2 = perPathMasks.map((m, index) => {
        if (countInk(m) === 0) return { index, inside: 0, distance: Infinity };
        const desc = describeMask(m);
        const d = minDescriptorDistance(desc, options.radicalTypes);
        return { index, inside: 0, distance: d };
      });
      const selected2 = perPath2.filter((p) => p.distance <= tolerance).map((p) => p.index);
      if (selected2.length === 0) return null;
      const hits = perPath2.filter((p) => p.distance <= tolerance);
      const miss = perPath2.filter((p) => p.distance > tolerance);
      const hitScore = hits.reduce((s, p) => s + (1 - p.distance / tolerance), 0) / Math.max(1, hits.length);
      const missScore = miss.length > 0 ? miss.reduce((s, p) => s + Math.min(1, (p.distance - tolerance) / (tolerance * 2)), 0) / miss.length : 1;
      const score = Math.max(0, Math.min(1, hitScore * 0.7 + missScore * 0.3));
      if (score < minScore) return null;
      const radicalInk2 = selected2.reduce((s, i) => s + countInk(perPathMasks[i]), 0);
      const totalInk2 = perPathMasks.reduce((s, m) => s + countInk(m), 0);
      const box2 = boundsOfMask(perPathMasks, selected2, resolution);
      const perSubpath2 = subpathRefs.map((ref, i) => {
        const d = countInk(subpathMasks[i]) === 0 ? Infinity : minDescriptorDistance(describeMask(subpathMasks[i]), options.radicalTypes);
        return { ...ref, inside: 0, distance: d, radical: d <= tolerance };
      });
      return {
        pathIndices: selected2,
        score,
        precision: score,
        coverage: totalInk2 > 0 ? radicalInk2 / totalInk2 : 0,
        iou: score,
        box: box2,
        fx: 1,
        fy: 1,
        resolution,
        perPath: perPath2.map((p) => ({ index: p.index, inside: p.distance <= tolerance ? 1 : 0 })),
        perSubpath: perSubpath2
      };
    }
    if (!radicalGlyph) return null;
    const image = rasterizeGlyph(
      glyph.paths.flatMap((p) => p.subpaths),
      {
        width: resolution,
        height: resolution,
        viewBox: glyphInk,
        strokes: glyphStrokesInfo
      }
    );
    if (countInk(image) === 0) return null;
    const radicalStrokes = isStrokeGlyph(radicalGlyph) ? glyphStrokes(radicalGlyph) : void 0;
    const template = rasterizeGlyph(
      radicalGlyph.paths.flatMap((p) => p.subpaths),
      {
        width: resolution,
        height: resolution,
        viewBox: frameOf(radicalGlyph),
        strokes: radicalStrokes
      }
    );
    if (countInk(template) === 0) return null;
    const match = matchTemplate(image, template, options);
    if (!match || match.score < minScore) return null;
    const box = { x: match.x, y: match.y, width: match.width, height: match.height };
    const perPath = perPathMasks.map((m, index) => ({ index, inside: insideRatio(m, box) }));
    let selected = perPath.filter((p) => p.inside >= pathThreshold).map((p) => p.index);
    if (selected.length === 0) {
      const best = perPath.slice().sort((a, b) => b.inside - a.inside)[0];
      if (best && best.inside >= 0.25) selected = [best.index];
    }
    const radicalInk = selected.reduce((sum, i) => sum + countInk(perPathMasks[i]), 0);
    const totalInk = countInk(image);
    const perSubpath = subpathRefs.map((ref, i) => {
      const inside = insideRatio(subpathMasks[i], box);
      return { ...ref, inside, radical: inside >= pathThreshold };
    });
    return {
      pathIndices: selected,
      score: match.score,
      precision: match.precision,
      coverage: totalInk > 0 ? radicalInk / totalInk : 0,
      iou: match.iou,
      box,
      fx: match.fx,
      fy: match.fy,
      resolution,
      perPath,
      perSubpath
    };
  }

  // src/structure/strokes.ts
  function splitStrokes(glyph) {
    const strokes = [];
    glyph.paths.forEach((p, pathIndex) => {
      const isSkeleton = !p.filled;
      const points = isSkeleton ? p.subpaths[0] ?? [] : [];
      const perimeter = p.subpaths.reduce((sum, sp, i) => {
        let len = polylineLength(sp);
        if (p.closed?.[i] && sp.length >= 2) {
          const a = sp[0];
          const b = sp[sp.length - 1];
          len += Math.hypot(b.x - a.x, b.y - a.y);
        }
        return sum + len;
      }, 0);
      strokes.push({
        index: strokes.length,
        pathIndex,
        kind: isSkeleton ? "skeleton" : "outline",
        points,
        subpaths: p.subpaths,
        length: isSkeleton ? polylineLength(points) : perimeter,
        bounds: boundsOf(p.subpaths),
        angle: principalAngle(p.subpaths.flat()),
        strokeWidth: p.strokeWidth
      });
    });
    return strokes;
  }
  function strokeCount(glyph) {
    return glyph.paths.length;
  }
  function strokeOrder(glyph, order) {
    const n = glyph.paths.length;
    if (order && order.length === n && isPermutation(order, n)) return order.slice();
    return glyph.paths.map((_, i) => i);
  }
  function isPermutation(arr, n) {
    const seen = /* @__PURE__ */ new Set();
    for (const v of arr) {
      if (!Number.isInteger(v) || v < 0 || v >= n) return false;
      if (seen.has(v)) return false;
      seen.add(v);
    }
    return seen.size === n;
  }
  function strokesInOrder(glyph, order) {
    const strokes = splitStrokes(glyph);
    const seq = strokeOrder(glyph, order);
    return seq.map((pathIndex) => strokes[pathIndex]);
  }

  // src/structure/decomposition.ts
  var MEANING = {
    "\u2FF0": "\u5DE6\u53F3\u7ED3\u6784",
    "\u2FF1": "\u4E0A\u4E0B\u7ED3\u6784",
    "\u2FF2": "\u53F3\u5DE6\u7ED3\u6784",
    "\u2FF3": "\u4E0A\u4E2D\u4E0B\u7ED3\u6784",
    "\u2FF4": "\u5168\u5305\u56F4\u7ED3\u6784",
    "\u2FF5": "\u5DE6\u4E0A\u5305\u56F4\u7ED3\u6784",
    "\u2FF6": "\u53F3\u4E0A\u5305\u56F4\u7ED3\u6784",
    "\u2FF7": "\u5DE6\u4E0B\u5305\u56F4\u7ED3\u6784",
    "\u2FF8": "\u4E0B\u65B9\u5305\u56F4\u7ED3\u6784",
    "\u2FF9": "\u4E0A\u65B9\u5305\u56F4\u7ED3\u6784",
    "\u2FFA": "\u5DE6\u4E2D\u5305\u56F4\u7ED3\u6784",
    "\u2FFB": "\u4E2D\u53F3\u5305\u56F4\u7ED3\u6784"
  };
  function contains(outer, inner, tolerance = 0) {
    return inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.x + inner.width <= outer.x + outer.width + tolerance && inner.y + inner.height <= outer.y + outer.height + tolerance;
  }
  function isClosedFrame(radicalGlyph) {
    const mask = rasterizeGlyph(radicalGlyph.paths.flatMap((p) => p.subpaths), {
      width: 96,
      height: 96,
      viewBox: inkViewBox(radicalGlyph)
    });
    return hasEnclosedHole(mask);
  }
  function isSameGlyph(a, b) {
    if (a.paths.length !== b.paths.length) return false;
    const ba = boundsOf(a.paths.flatMap((p) => p.subpaths));
    const bb = boundsOf(b.paths.flatMap((p) => p.subpaths));
    const scale2 = Math.max(ba.width, ba.height, bb.width, bb.height, 1);
    const tol = scale2 * 0.02;
    return Math.abs(ba.x - bb.x) < tol && Math.abs(ba.y - bb.y) < tol && Math.abs(ba.width - bb.width) < tol && Math.abs(ba.height - bb.height) < tol;
  }
  function decompose(glyph, match, radicalGlyph) {
    const radicalSet = new Set(match.pathIndices);
    if (radicalSet.size === 0) return null;
    const radicalSubpaths = [];
    const remainderSubpaths = [];
    const radicalPathSet = /* @__PURE__ */ new Set();
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
    const result = {
      structure: "\u2FF4",
      meaning: MEANING["\u2FF4"],
      radicalSide: "whole",
      // 报出来的路径清单用**路径级**（与界面高亮的一致）；
      // 几何判定用子路径级（更准，实测 62.0% vs 58.7%）。
      // 两者偶尔不一致：投票法的码本是按路径归纳的，逐子路径比会挑得更细
      // （「語」的部首「言」横跨路径 0 与路径 3）。
      radicalPathIndices: [...radicalSet].sort((a, b) => a - b),
      remainderPathIndices: glyph.paths.map((_, i) => i).filter((i) => !radicalSet.has(i)),
      radicalBounds,
      remainderBounds,
      confidence: match.score
    };
    if (remainderSubpaths.length === 0) {
      result.structure = "\u2FFB";
      result.meaning = "\u72EC\u4F53\u5B57\uFF08\u90E8\u9996\u5373\u6574\u5B57\uFF09";
      result.radicalSide = "whole";
      result.confidence = Math.min(1, match.score + 0.2);
      return result;
    }
    if (radicalGlyph && isSameGlyph(radicalGlyph, glyph)) {
      result.structure = "\u2FFB";
      result.meaning = "\u72EC\u4F53\u5B57\uFF08\u90E8\u9996\u5373\u6574\u5B57\uFF09";
      result.radicalSide = "whole";
      result.radicalPathIndices = glyph.paths.map((_, i) => i);
      result.remainderPathIndices = [];
      result.confidence = Math.min(1, match.score + 0.2);
      return result;
    }
    const glyphBounds = boundsOf(radicalSubpaths.concat(remainderSubpaths));
    const gW = glyphBounds.width || 1;
    const gH = glyphBounds.height || 1;
    const rc = centroidOf(radicalSubpaths);
    const sc = centroidOf(remainderSubpaths);
    const dx = sc.x - rc.x;
    const dy = sc.y - rc.y;
    const SEP = 0.18;
    const CROSS = 0.55;
    const horizontal = Math.abs(dx) >= SEP * gW && Math.abs(dy) < CROSS * gH;
    const vertical = Math.abs(dy) >= SEP * gH && Math.abs(dx) < CROSS * gW;
    if (horizontal) {
      result.structure = "\u2FF0";
      result.meaning = MEANING["\u2FF0"];
      result.radicalSide = dx > 0 ? "left" : "right";
      result.confidence = match.score * (0.6 + 0.4 * Math.min(1, Math.abs(dx) / (SEP * gW)));
      return result;
    }
    if (vertical) {
      result.structure = "\u2FF1";
      result.meaning = MEANING["\u2FF1"];
      result.radicalSide = dy > 0 ? "top" : "bottom";
      result.confidence = match.score * (0.6 + 0.4 * Math.min(1, Math.abs(dy) / (SEP * gH)));
      return result;
    }
    const radicalIsFrame = radicalGlyph ? isClosedFrame(radicalGlyph) : false;
    if (contains(radicalBounds, remainderBounds, 2)) {
      result.radicalSide = "enclosing";
      if (radicalIsFrame) {
        result.structure = "\u2FF4";
      } else {
        const rx = (sc.x - (radicalBounds.x + radicalBounds.width / 2)) / (radicalBounds.width / 2 || 1);
        const ry = (sc.y - (radicalBounds.y + radicalBounds.height / 2)) / (radicalBounds.height / 2 || 1);
        const OFF = 0.2;
        if (Math.abs(rx) < OFF && Math.abs(ry) < OFF) result.structure = "\u2FF4";
        else if (rx > 0 && ry > 0) result.structure = "\u2FF5";
        else if (rx < 0 && ry > 0) result.structure = "\u2FF6";
        else if (rx > 0 && ry < 0) result.structure = "\u2FF7";
        else result.structure = "\u2FF8";
      }
      result.meaning = MEANING[result.structure];
      return result;
    }
    if (contains(remainderBounds, radicalBounds, 2)) {
      result.structure = "\u2FF4";
      result.meaning = MEANING["\u2FF4"];
      result.radicalSide = "enclosing";
      result.confidence = match.score * 0.6;
      return result;
    }
    result.structure = "\u2FF4";
    result.meaning = MEANING["\u2FF4"];
    result.radicalSide = "enclosing";
    result.confidence = match.score * 0.6;
    return result;
  }

  // src/structure/blocks.ts
  var DEFAULT_BLOCKS = {
    separation: 0.18,
    cross: 0.55,
    maxDepth: 3
  };
  function segmentBlocks(glyph, options = {}) {
    const opts = { ...DEFAULT_BLOCKS, ...options };
    const all = glyph.paths.flatMap((p) => p.subpaths);
    if (glyph.paths.length === 0) return [];
    const gBounds = boundsOf(all);
    const gW = gBounds.width || 1;
    const gH = gBounds.height || 1;
    const gCenter = centroidOf(all);
    const items = glyph.paths.map((p, index) => ({
      index,
      c: centroidOf(p.subpaths)
    }));
    const leaves = [];
    const walk = (group, depth) => {
      if (group.length === 0) return;
      if (group.length === 1 || depth >= opts.maxDepth) {
        leaves.push(makeBlock(glyph, group.map((g) => g.index)));
        return;
      }
      const split = findSplit(group, gW, gH, opts.separation, opts.cross);
      if (!split) {
        leaves.push(makeBlock(glyph, group.map((g) => g.index)));
        return;
      }
      const byIndex = new Map(group.map((g) => [g.index, g]));
      const a = split.a.map((i) => byIndex.get(i)).filter((x) => Boolean(x));
      const b = split.b.map((i) => byIndex.get(i)).filter((x) => Boolean(x));
      walk(a, depth + 1);
      walk(b, depth + 1);
    };
    walk(items, 0);
    for (const b of leaves) {
      b.label = labelOf(b.centroid, gCenter, gW, gH);
    }
    return leaves;
  }
  function labelOf(c, gCenter, gW, gH) {
    const dx = (c.x - gCenter.x) / gW;
    const dy = (c.y - gCenter.y) / gH;
    const OFF = 0.1;
    const h = dx < -OFF ? "\u5DE6" : dx > OFF ? "\u53F3" : "\u4E2D";
    const v = dy < -OFF ? "\u4E0A" : dy > OFF ? "\u4E0B" : "\u4E2D";
    if (h === "\u4E2D" && v === "\u4E2D") return "\u4E2D";
    if (h !== "\u4E2D" && v === "\u4E2D") return h;
    if (h === "\u4E2D" && v !== "\u4E2D") return v;
    return `${h}${v}`;
  }
  function makeBlock(glyph, pathIndices) {
    const subpaths = pathIndices.flatMap((i) => glyph.paths[i]?.subpaths ?? []);
    return {
      pathIndices: pathIndices.slice().sort((a, b) => a - b),
      label: "\u4E2D",
      bounds: boundsOf(subpaths),
      centroid: centroidOf(subpaths),
      children: []
    };
  }
  function findSplit(group, gW, gH, separation, cross) {
    const onX = bestSplitOnAxis(group, gW, gH, separation, cross, "x");
    const onY = bestSplitOnAxis(group, gW, gH, separation, cross, "y");
    if (!onX) return onY;
    if (!onY) return onX;
    return onX.separation >= onY.separation ? onX : onY;
  }
  function bestSplitOnAxis(group, gW, gH, separation, cross, axis) {
    const val = (c) => axis === "x" ? c.x : c.y;
    const crossVal = (c) => axis === "x" ? c.y : c.x;
    const extent = axis === "x" ? gW : gH;
    const crossExtent = axis === "x" ? gH : gW;
    const sorted = group.slice().sort((p, q) => val(p.c) - val(q.c));
    const candidates = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const v0 = val(sorted[i - 1].c);
      const v1 = val(sorted[i].c);
      if (v1 - v0 > 1e-9) candidates.push((v0 + v1) / 2);
    }
    if (candidates.length === 0) return null;
    let best = null;
    for (const t of candidates) {
      const lo = sorted.filter((g) => val(g.c) < t);
      const hi = sorted.filter((g) => val(g.c) >= t);
      if (lo.length === 0 || hi.length === 0) continue;
      const mean = (arr, f) => arr.reduce((s, g) => s + f(g.c), 0) / arr.length;
      const sep = Math.abs(mean(hi, val) - mean(lo, val)) / extent;
      if (sep < separation) continue;
      const crossDiff = Math.abs(mean(hi, crossVal) - mean(lo, crossVal)) / crossExtent;
      if (crossDiff >= cross) continue;
      if (!best || sep > best.separation) {
        best = {
          a: lo.map((g) => g.index),
          b: hi.map((g) => g.index),
          axis,
          separation: sep,
          labelA: axis === "x" ? "\u5DE6" : "\u4E0A",
          labelB: axis === "x" ? "\u53F3" : "\u4E0B"
        };
      }
    }
    return best;
  }
  function blockOfPath(blocks, pathIndex) {
    for (const b of blocks) {
      if (b.pathIndices.includes(pathIndex)) return b.label;
    }
    return null;
  }

  // src/structure/resolve.ts
  function resolveStructure(glyph, radicalGlyph, options = {}) {
    const vote = () => {
      if (!options.radicalTypes || options.radicalTypes.length === 0) return null;
      const m = locateRadical(glyph, null, {
        ...options,
        radicalTypes: options.radicalTypes
      });
      if (!m) return null;
      const d = decompose(glyph, m, radicalGlyph ?? void 0);
      if (!d) return null;
      return { match: m, decomposition: d, method: "vote" };
    };
    const template = () => {
      if (!radicalGlyph) return null;
      const { radicalTypes: _drop, ...templateOpts } = options;
      void _drop;
      const m = locateRadical(glyph, radicalGlyph, templateOpts);
      if (!m) return null;
      const d = decompose(glyph, m, radicalGlyph);
      if (!d) return null;
      return { match: m, decomposition: d, method: "template" };
    };
    return vote() ?? template();
  }

  // src/morph/correspond.ts
  function inkBox(glyph) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of glyph.paths) {
      const pad = p.filled ? 0 : p.strokeWidth / 2;
      for (const sp of p.subpaths) {
        for (const pt of sp) {
          if (pt.x - pad < minX) minX = pt.x - pad;
          if (pt.x + pad > maxX) maxX = pt.x + pad;
          if (pt.y - pad < minY) minY = pt.y - pad;
          if (pt.y + pad > maxY) maxY = pt.y + pad;
        }
      }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    if (!Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  function frameBox(resolution) {
    return {
      x: resolution * 0.04,
      y: resolution * 0.04,
      width: resolution * 0.92,
      height: resolution * 0.92
    };
  }
  function frameMatrix(box, resolution) {
    const frame = frameBox(resolution);
    const s = box.width > 0 && box.height > 0 ? Math.min(frame.width / box.width, frame.height / box.height) : box.width > 0 ? frame.width / box.width : box.height > 0 ? frame.height / box.height : 1;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return {
      a: s,
      b: 0,
      c: 0,
      d: s,
      e: frame.x + frame.width / 2 - cx * s,
      f: frame.y + frame.height / 2 - cy * s
    };
  }
  function framePaths(glyph, resolution) {
    const box = inkBox(glyph);
    const matrix = box ? frameMatrix(box, resolution) : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const scale2 = Math.hypot(matrix.a, matrix.b);
    const usable = Number.isFinite(scale2) && scale2 > 0 ? scale2 : 1;
    return glyph.paths.map((p) => ({
      subpaths: p.subpaths.map((sp) => applyAll(matrix, sp)),
      halfWidth: p.filled ? 0 : p.strokeWidth / 2 * usable
    }));
  }
  function pathMasks(glyph, resolution) {
    const framed = framePaths(glyph, resolution);
    const skeleton = isStrokeGlyph(glyph);
    const viewBox = { x: 0, y: 0, width: resolution, height: resolution };
    return framed.map((p) => {
      if (skeleton) {
        return rasterizeGlyph(p.subpaths, {
          width: resolution,
          height: resolution,
          viewBox,
          strokes: [{ points: p.subpaths[0] ?? [], halfWidth: p.halfWidth }]
        });
      }
      return rasterizeGlyph(p.subpaths, {
        width: resolution,
        height: resolution,
        viewBox
      });
    });
  }
  function intersectCount(a, b) {
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    let n = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (a.data[y * a.width + x] && b.data[y * b.width + x]) n += 1;
      }
    }
    return n;
  }
  function correspondStrokes(from, to, options = {}) {
    const resolution = options.resolution ?? 200;
    const minOverlap = options.minOverlap ?? 0.02;
    const fromMasks = pathMasks(from, resolution);
    const toMasks = pathMasks(to, resolution);
    const fromInk = fromMasks.map(countInk);
    const toInk = toMasks.map(countInk);
    const candidates = [];
    for (let fi = 0; fi < fromMasks.length; fi += 1) {
      if (fromInk[fi] === 0) continue;
      for (let ti = 0; ti < toMasks.length; ti += 1) {
        if (toInk[ti] === 0) continue;
        const inter = intersectCount(fromMasks[fi], toMasks[ti]);
        if (inter === 0) continue;
        const overlap = inter / fromInk[fi];
        if (overlap < minOverlap) continue;
        candidates.push({ from: fi, to: ti, overlap, coverage: inter / toInk[ti] });
      }
    }
    candidates.sort(
      (a, b) => b.overlap - a.overlap || b.coverage - a.coverage || a.from - b.from || a.to - b.to
    );
    const usedFrom = /* @__PURE__ */ new Set();
    const usedTo = /* @__PURE__ */ new Set();
    const pairs = [];
    for (const c of candidates) {
      if (usedFrom.has(c.from) || usedTo.has(c.to)) continue;
      usedFrom.add(c.from);
      usedTo.add(c.to);
      pairs.push({ from: c.from, to: c.to, overlap: c.overlap, coverage: c.coverage });
    }
    pairs.sort((a, b) => a.from - b.from);
    const unmatchedFrom = fromMasks.map((_, i) => i).filter((i) => !usedFrom.has(i));
    const unmatchedTo = toMasks.map((_, i) => i).filter((i) => !usedTo.has(i) && toInk[i] > 0);
    const confidence = pairs.length === 0 ? 0 : pairs.reduce((s, p) => s + p.overlap, 0) / pairs.length;
    return { pairs, unmatchedFrom, unmatchedTo, confidence };
  }
  function normalizeToFrame(glyph, resolution) {
    const all = glyph.paths.flatMap((p) => p.subpaths);
    const raw = rasterizeGlyph(all, {
      width: resolution,
      height: resolution,
      viewBox: glyph.viewBox,
      strokes: isStrokeGlyph(glyph) ? glyphStrokes(glyph) : void 0
    });
    const { mask: inkMask, offsetX, offsetY } = cropToInk(raw);
    const box = {
      x: 0,
      y: 0,
      width: resolution * 0.92,
      height: resolution * 0.92
    };
    const matrix = fitToBox(
      { x: offsetX, y: offsetY, width: inkMask.width, height: inkMask.height },
      box,
      true
    );
    return { mask: inkMask, matrix };
  }

  // src/morph/interpolate.ts
  function strokeToContour(points, halfWidth) {
    if (points.length < 2) return [];
    const hw = Math.max(halfWidth, 1e-6);
    const left = [];
    const right = [];
    for (let i = 0; i < points.length; i += 1) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;
      left.push({ x: points[i].x + nx, y: points[i].y + ny });
      right.push({ x: points[i].x - nx, y: points[i].y - ny });
    }
    right.reverse();
    return [...left, ...right];
  }
  function normalizeGlyph(glyph, resolution = 200) {
    const all = glyph.paths.flatMap((p) => p.subpaths);
    const b = boundsOf(all);
    const box = {
      x: resolution * 0.04,
      y: resolution * 0.04,
      width: resolution * 0.92,
      height: resolution * 0.92
    };
    const matrix = fitToBox(b, box, true);
    const skeleton = isStrokeGlyph(glyph);
    const paths = glyph.paths.map((p) => {
      const src = skeleton ? p.subpaths.map((sp) => strokeToContour(sp, p.strokeWidth / 2)).filter((sp) => sp.length >= 2) : p.subpaths;
      const moved = src.map((sp) => applyAll(matrix, sp));
      return {
        subpaths: moved,
        strokeWidth: 0,
        filled: true,
        bounds: boundsOf(moved)
      };
    });
    return {
      glyph: {
        viewBox: { x: 0, y: 0, width: resolution, height: resolution },
        paths,
        bounds: boundsOf(paths.flatMap((p) => p.subpaths))
      },
      matrix
    };
  }
  function isFiniteSubpath(sp) {
    if (sp.length < 2) return false;
    for (const p of sp) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    }
    return true;
  }
  function longestSubpath(subpaths) {
    let best = [];
    let bestLen = -1;
    for (const sp of subpaths) {
      let len = 0;
      for (let i = 1; i < sp.length; i += 1) {
        len += Math.hypot(sp[i].x - sp[i - 1].x, sp[i].y - sp[i - 1].y);
      }
      if (len > bestLen) {
        bestLen = len;
        best = sp;
      }
    }
    return best;
  }
  function interpolateContours(a, b, t, samples = 64) {
    if (a.length < 2) return b.map((p) => ({ ...p }));
    if (b.length < 2) return a.map((p) => ({ ...p }));
    const pa = resampleClosed(a, samples);
    const pb = resampleClosed(b, samples);
    const out = [];
    for (let i = 0; i < samples; i += 1) {
      out.push({
        x: pa[i].x + (pb[i].x - pa[i].x) * t,
        y: pa[i].y + (pb[i].y - pa[i].y) * t
      });
    }
    return out;
  }
  function scaleAboutCentroid(points, factor) {
    if (points.length === 0) return points;
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    const cx = sx / points.length;
    const cy = sy / points.length;
    return points.map((p) => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
  }
  function interpolateDetailed(from, to, t, options = {}) {
    const samples = options.samples ?? 64;
    const resolution = options.resolution ?? 200;
    const clamped = Math.max(0, Math.min(1, t));
    const normFrom = normalizeGlyph(from, resolution).glyph;
    const normTo = normalizeGlyph(to, resolution).glyph;
    const corr = correspondStrokes(normFrom, normTo, options);
    const paths = [];
    const roles = [];
    const consumedTo = /* @__PURE__ */ new Set();
    for (const pair of corr.pairs) {
      const subsA = normFrom.paths[pair.from]?.subpaths ?? [];
      const subsB = normTo.paths[pair.to]?.subpaths ?? [];
      const midSubs = [];
      const count = Math.max(subsA.length, subsB.length);
      for (let k = 0; k < count; k += 1) {
        const a = subsA[k] ?? [];
        const b = subsB[k] ?? [];
        if (a.length >= 2 && b.length >= 2 && isFiniteSubpath(a) && isFiniteSubpath(b)) {
          midSubs.push(interpolateContours(a, b, clamped, samples));
        } else if (a.length >= 2) {
          midSubs.push(scaleAboutCentroid(a, 1 - clamped));
        } else if (b.length >= 2) {
          midSubs.push(scaleAboutCentroid(b, clamped));
        }
      }
      if (midSubs.length === 0) continue;
      paths.push({ subpaths: midSubs, strokeWidth: 0, filled: true, bounds: boundsOf(midSubs) });
      roles.push("morph");
      consumedTo.add(pair.to);
    }
    for (let i = 0; i < normTo.paths.length; i += 1) {
      if (consumedTo.has(i)) continue;
      const subs = normTo.paths[i].subpaths.filter(isFiniteSubpath);
      if (subs.length === 0) continue;
      const grown = subs.map((sp) => scaleAboutCentroid(sp, clamped));
      paths.push({ subpaths: grown, strokeWidth: 0, filled: true, bounds: boundsOf(grown) });
      roles.push("appear");
    }
    const pairedFrom = new Set(corr.pairs.map((p) => p.from));
    for (let i = 0; i < normFrom.paths.length; i += 1) {
      if (pairedFrom.has(i)) continue;
      const subs = normFrom.paths[i].subpaths.filter(isFiniteSubpath);
      if (subs.length === 0) continue;
      const shrunk = subs.map((sp) => scaleAboutCentroid(sp, 1 - clamped));
      paths.push({ subpaths: shrunk, strokeWidth: 0, filled: true, bounds: boundsOf(shrunk) });
      roles.push("disappear");
    }
    return {
      glyph: {
        viewBox: { x: 0, y: 0, width: resolution, height: resolution },
        paths,
        bounds: boundsOf(paths.flatMap((p) => p.subpaths))
      },
      roles,
      correspond: corr,
      stats: {
        morphed: roles.filter((r) => r === "morph").length,
        appeared: roles.filter((r) => r === "appear").length,
        disappeared: roles.filter((r) => r === "disappear").length
      }
    };
  }
  function interpolateGlyphs(from, to, t, options = {}) {
    return interpolateDetailed(from, to, t, options).glyph;
  }
  function interpolateSequence(from, to, steps, options = {}) {
    const out = [];
    const n = Math.max(2, steps);
    for (let i = 0; i < n; i += 1) {
      out.push(interpolateGlyphs(from, to, i / (n - 1), options));
    }
    return out;
  }

  // src/morph/lishu.ts
  var DEFAULT_LISHU = {
    simplifyTolerance: 3,
    axisSnapAngle: 20 * Math.PI / 180,
    waveTail: true,
    /** 0 = 不指定绝对幅度，走 waveRatio。 */
    waveAmplitude: 0,
    waveRatio: 0.025,
    levelAndStraight: true
  };
  function waveSize(opts, scaleRef) {
    if (opts.waveAmplitude > 0) return opts.waveAmplitude;
    return opts.waveRatio * scaleRef;
  }
  function isClosedSubpath(sp) {
    if (sp.length < 3) return false;
    const a = sp[0];
    const b = sp[sp.length - 1];
    return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
  }
  function isClosedPathSubpath(path, index) {
    const flagged = path.closed?.[index];
    if (typeof flagged === "boolean") return flagged;
    return isClosedSubpath(path.subpaths[index] ?? []);
  }
  function simplifyPolyline(points, tolerance) {
    if (points.length < 3 || tolerance <= 0) return points.map((p) => ({ ...p }));
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length > 0) {
      const [first, last] = stack.pop();
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
    const out = [];
    for (let i = 0; i < points.length; i += 1) if (keep[i]) out.push({ ...points[i] });
    return out;
  }
  function perpendicularDistance(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function snapToAxes(points, snapAngle) {
    if (points.length < 2) return points.slice();
    const out = points.map((p) => ({ ...p }));
    for (let i = 0; i < out.length - 1; i += 1) {
      const dx = out[i + 1].x - out[i].x;
      const dy = out[i + 1].y - out[i].y;
      if (dx === 0 && dy === 0) continue;
      const ang = Math.atan2(dy, dx);
      const norm = (ang % Math.PI + Math.PI) % Math.PI;
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
  function addWaveTail(points, amplitude) {
    if (points.length < 2 || amplitude <= 0) return points.slice();
    const out = points.map((p) => ({ ...p }));
    const last = out[out.length - 1];
    const rightmost = out.reduce((best, p) => p.x > best.x ? p : best, out[0]);
    if (rightmost !== last) return out;
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
      const s = i / steps * waveLen;
      const lift = Math.sin(i / steps * Math.PI) * amplitude;
      out.push({
        x: last.x + ux * s,
        y: last.y + uy * s - lift
      });
    }
    return out;
  }
  function levelAndStraight(points, snapAngle) {
    if (points.length < 2) return points.slice();
    const angle = principalAngle(points);
    const norm = (angle % Math.PI + Math.PI) % Math.PI;
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
  function applyLishuRules(points, opts, wave) {
    let pts = points.map((p) => ({ ...p }));
    if (opts.levelAndStraight) pts = levelAndStraight(pts, opts.axisSnapAngle);
    pts = simplifyPolyline(pts, opts.simplifyTolerance);
    pts = snapToAxes(pts, opts.axisSnapAngle);
    if (opts.waveTail) pts = addWaveTail(pts, wave);
    return pts;
  }
  function lishuTransformSubpath(sp, options = {}) {
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
  function lishuTransform(glyph, options = {}) {
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
      bounds: boundsOf(paths.flatMap((p) => p.subpaths))
    };
  }

  // src/layout/vertical.ts
  var RIGHT_TOP_DOTS = /* @__PURE__ */ new Set(["\u3002", "\uFF0C", "\u3001", "\uFF1B", "\uFF1A", "\xB7", "\uFF0E"]);
  var ROTATED_PAIRS = /* @__PURE__ */ new Set([
    "\uFF08",
    "\uFF09",
    "\u3014",
    "\u3015",
    "\uFF3B",
    "\uFF3D",
    "\u3010",
    "\u3011",
    "\u300A",
    "\u300B",
    "\u3008",
    "\u3009",
    "\u300C",
    "\u300D",
    "\u300E",
    "\u300F",
    "\u2014",
    "\u2015",
    "\uFF5E",
    "\u2026",
    "(",
    ")"
  ]);
  var OPENING_SYMBOLS = /* @__PURE__ */ new Set(["\uFF08", "\u3014", "\uFF3B", "\u3010", "\u300A", "\u3008", "\u300C", "\u300E", "("]);
  var LINE_START_FORBIDDEN = /* @__PURE__ */ new Set([
    "\u3002",
    "\uFF0C",
    "\u3001",
    "\uFF1B",
    "\uFF1A",
    "\xB7",
    "\uFF0E",
    "\uFF1F",
    "\uFF01",
    "\uFF09",
    "\u3015",
    "\uFF3D",
    "\u3011",
    "\u300B",
    "\u3009",
    "\u300D",
    "\u300F",
    "\u2026",
    "\u2014",
    "\u2015",
    "\uFF5E"
  ]);
  var LINE_END_FORBIDDEN = /* @__PURE__ */ new Set(["\uFF08", "\u3014", "\uFF3B", "\u3010", "\u300A", "\u3008", "\u300C", "\u300E", "("]);
  function punctuationShift(char, charSize, lineGap) {
    if (RIGHT_TOP_DOTS.has(char)) {
      const half = charSize * 0.5;
      const dx = lineGap === void 0 ? half : Math.min(half, Math.max(0, lineGap));
      return { dx, dy: -half, rotate: false, direction: 1 };
    }
    if (ROTATED_PAIRS.has(char)) {
      const opening = OPENING_SYMBOLS.has(char);
      return { dx: 0, dy: 0, rotate: true, direction: opening ? 1 : -1 };
    }
    return null;
  }
  function needsVerticalAdjustment(char) {
    return RIGHT_TOP_DOTS.has(char) || ROTATED_PAIRS.has(char);
  }
  function resolveRowsPerColumn(requested, fallback) {
    if (requested === void 0 || Number.isNaN(requested)) return Math.max(1, fallback);
    return Math.max(1, requested);
  }
  function assignSlots(chars, rowsPerColumn, kinsoku) {
    const slots = [];
    const useKinsoku = kinsoku && Number.isInteger(rowsPerColumn);
    let column = 0;
    let row = 0;
    for (let i = 0; i < chars.length; i += 1) {
      const char = chars[i];
      if (useKinsoku) {
        if (row === 0 && column > 0 && LINE_START_FORBIDDEN.has(char)) {
          const prev = slots[slots.length - 1];
          if (prev && rowsPerColumn >= 2) {
            prev.column = column;
            prev.row = 0;
            row = 1;
          }
        }
        if (row + 1 >= rowsPerColumn && LINE_END_FORBIDDEN.has(char)) {
          column += 1;
          row = 0;
        }
      }
      slots.push({ index: i, column, row });
      row += 1;
      if (row >= rowsPerColumn) {
        column += 1;
        row -= rowsPerColumn;
      }
    }
    return slots;
  }
  function layoutVertical(text, options) {
    const charSize = options.charSize;
    const charGap = options.charGap ?? 0;
    const lineGap = options.lineGap ?? charSize * 0.5;
    const originX = options.originX ?? 0;
    const originY = options.originY ?? 0;
    const pitch = charSize + charGap;
    const chars = Array.from(text);
    const rowsPerColumn = resolveRowsPerColumn(options.rowsPerColumn, chars.length);
    const kinsoku = options.kinsoku ?? false;
    const cells = [];
    for (const slot of assignSlots(chars, rowsPerColumn, kinsoku)) {
      const char = chars[slot.index];
      const shift = punctuationShift(char, charSize, lineGap);
      cells.push({
        char,
        index: slot.index,
        // 列从右往左：第 0 列在最右侧
        x: originX - slot.column * (charSize + lineGap),
        y: originY + slot.row * pitch,
        column: slot.column,
        row: slot.row,
        punctuation: shift ? true : void 0,
        shift: shift ?? void 0
      });
    }
    return cells;
  }
  function verticalExtent(cells, options) {
    if (cells.length === 0) return { width: 0, height: 0 };
    const charSize = options.charSize;
    const charGap = options.charGap ?? 0;
    const lineGap = options.lineGap ?? charSize * 0.5;
    const columns = Math.max(...cells.map((c) => c.column)) + 1;
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    return {
      width: columns * charSize + (columns - 1) * lineGap,
      height: rows * (charSize + charGap) - charGap
    };
  }

  // src/layout/page.ts
  function clamp(v, lo, hi) {
    if (!Number.isFinite(v)) return lo;
    return Math.min(Math.max(v, lo), Math.max(lo, hi));
  }
  function layoutClassicPage(options) {
    const leafWidth = options.leafWidth;
    const leafHeight = options.leafHeight;
    const columns = Number.isFinite(options.columns) ? Math.max(1, Math.floor(options.columns)) : 1;
    const columnGap = options.columnGap ?? leafWidth * 0.012;
    const marginTop = options.marginTop ?? leafHeight * 0.08;
    const marginBottom = options.marginBottom ?? leafHeight * 0.1;
    const marginLeft = options.marginLeft ?? leafWidth * 0.05;
    const marginRight = options.marginRight ?? leafWidth * 0.05;
    const fishtail = options.fishtail ?? "double";
    const banxinWidth = options.banxinWidth ?? leafWidth * 0.03;
    const banxinCenter = options.banxinCenter ?? 0.5;
    const banxinHeightRatio = options.banxinHeightRatio ?? 0.3;
    const leaf = { x: 0, y: 0, width: leafWidth, height: leafHeight };
    const frame = {
      x: marginLeft,
      y: marginTop,
      width: leafWidth - marginLeft - marginRight,
      height: leafHeight - marginTop - marginBottom
    };
    const innerWidth = frame.width - (columns - 1) * columnGap;
    const colWidth = innerWidth / columns;
    const colList = [];
    for (let i = 0; i < columns; i += 1) {
      const right = frame.x + frame.width - i * (colWidth + columnGap);
      colList.push({
        index: i,
        x: right - colWidth,
        width: colWidth,
        y: frame.y,
        height: frame.height
      });
    }
    const columnRules = [];
    for (let i = 0; i < columns - 1; i += 1) {
      const right = frame.x + frame.width - (i + 1) * (colWidth + columnGap);
      columnRules.push({
        x: right,
        y0: frame.y,
        y1: frame.y + frame.height,
        gap: columnGap * 0.35
      });
    }
    const banxinHeight = leafHeight * banxinHeightRatio;
    const banxinTop = leafHeight * banxinCenter - banxinHeight / 2;
    const banxin = {
      x: clamp(frame.x - banxinWidth * 0.6, 0, leafWidth - banxinWidth),
      y: clamp(banxinTop, 0, leafHeight - banxinHeight),
      width: banxinWidth,
      height: banxinHeight
    };
    const fishtails = [];
    if (fishtail === "single" || fishtail === "double") {
      fishtails.push({
        x: banxin.x,
        y: banxin.y,
        width: banxin.width,
        height: banxin.height * 0.22,
        direction: "down"
      });
    }
    if (fishtail === "double") {
      fishtails.push({
        x: banxin.x,
        y: banxin.y + banxin.height * 0.78,
        width: banxin.width,
        height: banxin.height * 0.22,
        direction: "up"
      });
    }
    return {
      leaf,
      frame,
      banxin,
      columnRules,
      fishtails,
      columns: colList,
      rowsPerColumn: options.rowsPerColumn,
      // 题名要落到返回值里，否则调用方给的题名无处安放
      title: options.title
    };
  }
  function placeText(page, text, options = {}) {
    const chars = Array.from(text);
    const charGap = options.charGap ?? 0;
    const rows = page.rowsPerColumn;
    const colWidth = page.columns.length > 0 ? page.columns[0].width : 0;
    const defaultSize = rows > 0 ? (page.frame.height - (rows - 1) * charGap) / rows * 0.86 : 16;
    const charSize = Math.min(options.charSize ?? defaultSize, colWidth);
    const out = [];
    for (let i = 0; i < chars.length; i += 1) {
      const column = Math.floor(i / page.rowsPerColumn);
      const row = i % page.rowsPerColumn;
      const col = page.columns[column];
      if (!col) break;
      out.push({
        char: chars[i],
        index: i,
        x: col.x + (col.width - charSize) / 2,
        y: col.y + row * (charSize + charGap),
        column,
        row
      });
    }
    return out;
  }

  // src/layout/advance.ts
  function advance(count, options) {
    if (!Number.isFinite(count) || count < 1) return [];
    const total = Math.ceil(count);
    const charSize = options.charSize;
    const charGap = options.charGap ?? 0;
    const lineGap = options.lineGap ?? charSize * 0.5;
    const originX = options.originX ?? 0;
    const originY = options.originY ?? 0;
    const rightToLeft = options.rightToLeft ?? true;
    const rows = Number.isNaN(options.rowsPerColumn) ? 1 : Math.max(1, options.rowsPerColumn);
    const steps = [];
    for (let i = 0; i < total; i += 1) {
      const column = Math.floor(i / rows);
      const row = i % rows;
      const dx = rightToLeft ? -column * (charSize + lineGap) : column * (charSize + lineGap);
      steps.push({
        step: i,
        column,
        row,
        x: originX + dx,
        y: originY + row * (charSize + charGap),
        columnStart: row === 0,
        last: i === total - 1
      });
    }
    return steps;
  }
  function stepAt(steps, index) {
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) return null;
    return steps[index] ?? null;
  }
  function advanceProgress(steps, totalSteps) {
    if (steps.length === 0) return 0;
    if (totalSteps === void 0 || !Number.isFinite(totalSteps) || totalSteps <= 0) return 1;
    return Math.min(1, Math.max(0, steps.length / totalSteps));
  }

  // src/teaching/trace.ts
  function buildTraceTemplate(glyph, options = {}) {
    const widthScale = options.widthScale ?? 1.6;
    const skeleton = isStrokeGlyph(glyph);
    if (skeleton) {
      const strokes = glyphStrokes(glyph);
      return {
        kind: "skeleton",
        order: strokes.map((_, i) => i),
        strokes: strokes.map((s, i) => ({
          kind: "stroke",
          width: options.width ?? Math.max(s.halfWidth * 2 * widthScale, 1),
          points: s.points,
          subpaths: [],
          order: i
        }))
      };
    }
    return {
      kind: "outline",
      order: glyph.paths.map((_, i) => i),
      strokes: glyph.paths.map((p, i) => ({
        kind: "fill",
        width: 0,
        points: [],
        subpaths: p.subpaths,
        order: i
      }))
    };
  }
  function traceTemplateToSvg(template, color = "#eae4d6") {
    return template.strokes.map((s) => {
      const d = s.kind === "stroke" ? `M ${s.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}` : s.subpaths.map((sp) => `M ${sp.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")} Z`).join(" ");
      if (s.kind === "stroke") {
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${s.width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      return `<path d="${d}" fill="${color}" fill-rule="nonzero"/>`;
    }).join("\n");
  }

  // src/teaching/evaluate.ts
  function strokeMask(glyph, pathIndex, frame) {
    const p = glyph.paths[pathIndex];
    const strokes = isStrokeGlyph(glyph) ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }] : void 0;
    const mask = rasterizeGlyph(p.subpaths, {
      width: frame.resolution,
      height: frame.resolution,
      viewBox: glyph.viewBox,
      strokes
    });
    return applyFrame(mask, frame);
  }
  function applyFrame(mask, frame) {
    const out = rasterizeGlyph([], {
      width: frame.resolution,
      height: frame.resolution,
      viewBox: { x: 0, y: 0, width: 1, height: 1 }
    });
    const m = frame.matrix;
    const vb = frame.svgViewBox;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue;
        const ux = vb.x + (x + 0.5) * vb.width / mask.width;
        const uy = vb.y + (y + 0.5) * vb.height / mask.height;
        const tx = m.a * ux + m.c * uy + m.e;
        const ty = m.b * ux + m.d * uy + m.f;
        const px = Math.floor(tx);
        const py = Math.floor(ty);
        if (px >= 0 && py >= 0 && px < frame.resolution && py < frame.resolution) {
          out.data[py * frame.resolution + px] = 1;
        }
      }
    }
    return out;
  }
  function makeFrame(glyph, resolution, normalize) {
    const all = glyph.paths.flatMap((p) => p.subpaths);
    const ink = boundsOf(all);
    const target = normalize === "bbox" ? { x: resolution * 0.04, y: resolution * 0.04, width: resolution * 0.92, height: resolution * 0.92 } : { x: 0, y: 0, width: resolution, height: resolution };
    const matrix = fitToBox(ink, target, true);
    return { matrix, resolution, svgViewBox: glyph.viewBox };
  }
  function intersect(a, b) {
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    let n = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (a.data[y * a.width + x] && b.data[y * b.width + x]) n += 1;
      }
    }
    return n;
  }
  function evaluateTracing(target, attempt, options = {}) {
    const resolution = options.resolution ?? 128;
    const normalize = options.normalize ?? "bbox";
    const passThreshold = options.passThreshold ?? 0.55;
    const tFrame = makeFrame(target, resolution, normalize);
    const targetFull = rasterizeGlyph(target.paths.flatMap((p) => p.subpaths), {
      width: resolution,
      height: resolution,
      viewBox: target.viewBox,
      strokes: isStrokeGlyph(target) ? glyphStrokes(target) : void 0
    });
    const targetFullN = applyFrame(targetFull, tFrame);
    let attemptFull;
    let attemptFrame;
    if (isMask(attempt)) {
      attemptFrame = tFrame;
      attemptFull = attempt;
    } else {
      attemptFrame = makeFrame(attempt, resolution, normalize);
      const raw2 = rasterizeGlyph(attempt.paths.flatMap((p) => p.subpaths), {
        width: resolution,
        height: resolution,
        viewBox: attempt.viewBox,
        strokes: isStrokeGlyph(attempt) ? glyphStrokes(attempt) : void 0
      });
      attemptFull = applyFrame(raw2, attemptFrame);
    }
    const inter = intersect(targetFullN, attemptFull);
    const union = countInk(targetFullN) + countInk(attemptFull) - inter;
    const iou = union > 0 ? inter / union : 0;
    const targetMasks = target.paths.map((_, i) => strokeMask(target, i, tFrame));
    const attemptMasks = isMask(attempt) ? [] : attempt.paths.map((_, i) => strokeMask(attempt, i, attemptFrame));
    const strokes = [];
    const usedAttempts = /* @__PURE__ */ new Set();
    for (let ti = 0; ti < targetMasks.length; ti += 1) {
      const tm = targetMasks[ti];
      const tInk = countInk(tm);
      if (tInk === 0) {
        strokes.push({ target: ti, attempt: -1, score: 0, coverage: 0, precision: 0 });
        continue;
      }
      let bestIdx = -1;
      let bestScore = 0;
      let bestCoverage = 0;
      let bestPrecision = 0;
      for (let ai = 0; ai < attemptMasks.length; ai += 1) {
        const am = attemptMasks[ai];
        const aInk = countInk(am);
        if (aInk === 0) continue;
        const ov = intersect(tm, am);
        const coverage = ov / tInk;
        const precision = ov / aInk;
        const score2 = coverage + precision > 0 ? 2 * coverage * precision / (coverage + precision) : 0;
        if (score2 > bestScore) {
          bestScore = score2;
          bestIdx = ai;
          bestCoverage = coverage;
          bestPrecision = precision;
        }
      }
      if (bestIdx >= 0) usedAttempts.add(bestIdx);
      strokes.push({
        target: ti,
        attempt: bestIdx,
        score: bestScore,
        coverage: bestCoverage,
        precision: bestPrecision
      });
    }
    const correct = strokes.filter((s) => s.score >= passThreshold).length;
    const meanStroke = strokes.length > 0 ? strokes.reduce((s, x) => s + x.score, 0) / strokes.length : 0;
    const worst = strokes.reduce((w, s, i) => s.score < (strokes[w]?.score ?? 1) ? i : w, 0);
    const extraStrokes = attemptMasks.map((_, i) => i).filter((i) => !usedAttempts.has(i));
    const orderMap = attemptMasks.map((am) => {
      let best = -1;
      let bestScore = 0;
      targetMasks.forEach((tm, ti) => {
        const s = strokePairScore(tm, am);
        if (s > bestScore) {
          bestScore = s;
          best = ti;
        }
      });
      return best;
    });
    let orderCorrect = true;
    let orderNote = "";
    for (let i = 1; i < orderMap.length; i += 1) {
      if (orderMap[i] >= 0 && orderMap[i - 1] >= 0 && orderMap[i] < orderMap[i - 1]) {
        orderCorrect = false;
        orderNote = `\u7B2C ${i + 1} \u7B14\u5199\u6210\u4E86\u7B2C ${orderMap[i] + 1} \u7B14\u7684\u6837\u5B50\u2014\u2014\u7B14\u987A\u53CD\u4E86`;
        break;
      }
    }
    const raw = iou * 0.4 + meanStroke * 0.6;
    const penalizeOrder = options.penalizeOrder ?? true;
    const orderPenalty = options.orderPenalty ?? 0.8;
    const score = !orderCorrect && penalizeOrder ? raw * orderPenalty : raw;
    return {
      score,
      iou,
      strokes,
      correct,
      total: strokes.length,
      worstStroke: strokes.length > 0 ? worst : -1,
      extraStrokes,
      orderCorrect,
      orderNote
    };
  }
  function strokePairScore(target, attempt) {
    const tInk = countInk(target);
    const aInk = countInk(attempt);
    if (tInk === 0 || aInk === 0) return 0;
    const ov = intersect(target, attempt);
    const coverage = ov / tInk;
    const precision = ov / aInk;
    return coverage + precision > 0 ? 2 * coverage * precision / (coverage + precision) : 0;
  }
  function isMask(x) {
    return "data" in x && "width" in x;
  }
  function inkCentroid(glyph) {
    const all = glyph.paths.flatMap((p) => p.subpaths).flat();
    return centroid(all);
  }

  // src/teaching/search.ts
  var GlyphIndex = class {
    entries;
    charMap = /* @__PURE__ */ new Map();
    radicalMap = /* @__PURE__ */ new Map();
    scriptMap = /* @__PURE__ */ new Map();
    structureMap = /* @__PURE__ */ new Map();
    constructor(entries) {
      this.entries = entries.slice();
      for (const e of this.entries) {
        push(this.charMap, e.char, e);
        if (e.radicalNo !== void 0) push(this.radicalMap, e.radicalNo, e);
        push(this.scriptMap, e.script, e);
        if (e.structure) push(this.structureMap, e.structure, e);
      }
    }
    /** 条目总数。 */
    get size() {
      return this.entries.length;
    }
    /** 全部条目。 */
    all() {
      return this.entries.slice();
    }
    /** 按现代字取（可能多字一形）。 */
    byChar(char) {
      return (this.charMap.get(char) ?? []).slice();
    }
    /** 按说文部次取。 */
    byRadical(no) {
      return (this.radicalMap.get(no) ?? []).slice();
    }
    /** 按书体取。 */
    byScript(script) {
      return (this.scriptMap.get(script) ?? []).slice();
    }
    /** 按构形结构符取。 */
    byStructure(code) {
      return (this.structureMap.get(code) ?? []).slice();
    }
    /** 出现过哪些说文部次（升序）。 */
    radicalNumbers() {
      return [...this.radicalMap.keys()].sort((a, b) => a - b);
    }
    /** 出现过哪些结构符。 */
    structures() {
      return [...this.structureMap.keys()];
    }
    /**
     * 组合检索。
     *
     * 条件之间是「与」；`limit` 只截断结果，不影响排序。
     */
    query(q) {
      let pool = this.entries;
      if (q.char !== void 0) pool = pool.filter((e) => e.char === q.char);
      if (q.script !== void 0) pool = pool.filter((e) => e.script === q.script);
      if (q.radicalNo !== void 0) pool = pool.filter((e) => e.radicalNo === q.radicalNo);
      if (q.structure !== void 0) pool = pool.filter((e) => e.structure === q.structure);
      if (q.strokes !== void 0) pool = pool.filter((e) => e.strokes === q.strokes);
      if (q.strokesRange) {
        const [lo, hi] = q.strokesRange;
        pool = pool.filter((e) => e.strokes >= lo && e.strokes <= hi);
      }
      if (q.limit !== void 0 && pool.length > q.limit) pool = pool.slice(0, q.limit);
      return pool;
    }
  };
  function push(map, key, value) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  }
  function groupByRadical(index) {
    return index.radicalNumbers().map((no) => ({ radicalNo: no, entries: index.byRadical(no) }));
  }
  function radicalFrequency(index) {
    const counts = /* @__PURE__ */ new Map();
    for (const e of index.all()) {
      if (e.radicalNo === void 0) continue;
      counts.set(e.radicalNo, (counts.get(e.radicalNo) ?? 0) + 1);
    }
    return [...counts.entries()].map(([radicalNo, count]) => ({ radicalNo, count })).sort((a, b) => b.count - a.count || a.radicalNo - b.radicalNo);
  }

  // src/teaching/phonetic.ts
  function analyzePhonetic(decomposition, match, options = {}) {
    const radical = decomposition.radicalPathIndices;
    const remainder = decomposition.remainderPathIndices;
    const structure = decomposition.structure;
    if (remainder.length === 0) {
      return {
        isPhonoSemantic: false,
        semantic: { side: "whole", pathIndices: radical },
        phonetic: { side: "whole", pathIndices: [] },
        confidence: 0.2,
        basis: "\u90E8\u9996\u5373\u6574\u5B57\uFF0C\u5C5E\u72EC\u4F53\u5B57\u6216\u5408\u4F53\u5B57\uFF0C\u4E0D\u4F5C\u5F62\u58F0\u5206\u6790\u3002"
      };
    }
    const sideOf = () => {
      if (decomposition.radicalSide) return decomposition.radicalSide;
      if (structure === "\u2FF0") return "left";
      if (structure === "\u2FF2") return "right";
      if (structure === "\u2FF1") return "top";
      if (structure === "\u2FF3") return "top";
      if (structure === "\u2FF5" || structure === "\u2FF6" || structure === "\u2FF7" || structure === "\u2FF8" || structure === "\u2FF9") {
        return "enclosing";
      }
      return "whole";
    };
    const radicalSide = sideOf();
    const isConventional = radicalSide === "left" || radicalSide === "top" || radicalSide === "enclosing";
    const score = match?.score ?? 0.4;
    const semanticSide = radicalSide;
    const phoneticSide = semanticSide === "left" ? "right" : semanticSide === "right" ? "left" : semanticSide === "top" ? "bottom" : semanticSide === "bottom" ? "top" : "enclosing";
    const confidence = Math.max(0, Math.min(1, score * (isConventional ? 0.9 : 0.55)));
    const semanticName = options.radicalChar ? `\u300C${options.radicalChar}\u300D` : "\u8BED\u4E49\u90E8\u9996";
    const phoneticName = options.phoneticChar ? `\u300C${options.phoneticChar}\u300D` : "\u53E6\u4E00\u6784\u4EF6";
    return {
      isPhonoSemantic: true,
      semantic: { side: semanticSide, pathIndices: radical },
      phonetic: { side: phoneticSide, pathIndices: remainder },
      confidence,
      basis: isConventional ? `${structure} \u5C5E\u5E38\u89C1\u5F62\u58F0\u683C\u5C40\uFF1A${semanticName}\u4E3A\u5F62\u7B26\uFF0C${phoneticName}\u4E3A\u58F0\u7B26\uFF0C\u8BFB\u97F3\u4ECE\u58F0\u7B26\u6765\u3002` : `${structure} \u7684\u5F62\u58F0\u683C\u5C40\u4E0E\u5E38\u89C1\u60C5\u5F62\u76F8\u53CD\uFF08\u5F62\u7B26\u5728${sideText(semanticSide)}\uFF09\uFF0C\u4ECD\u6309\u5B57\u5F62\u5224\u5B9A\uFF1A${semanticName}\u4E3A\u5F62\u7B26\uFF0C${phoneticName}\u4E3A\u58F0\u7B26\uFF0C\u4F46\u7F6E\u4FE1\u5EA6\u8F83\u4F4E\u3002`
    };
  }
  function sideText(side) {
    switch (side) {
      case "left":
        return "\u5DE6";
      case "right":
        return "\u53F3";
      case "top":
        return "\u4E0A";
      case "bottom":
        return "\u4E0B";
      case "enclosing":
        return "\u5916\u56F4";
      default:
        return "\u6574\u4F53";
    }
  }
  function phonoSemanticStats(analyses) {
    const total = analyses.length;
    const phono = analyses.filter((a) => a.isPhonoSemantic);
    const conventional = phono.filter((a) => !a.basis.includes("\u76F8\u53CD"));
    return {
      total,
      phonoSemantic: phono.length,
      ratio: total > 0 ? phono.length / total : 0,
      conventionalRatio: phono.length > 0 ? conventional.length / phono.length : 0
    };
  }

  // src/teaching/stats.ts
  var DIRECTION_BINS = 8;
  function strokeStats(glyph) {
    const strokes = splitStrokes(glyph);
    const lengths = strokes.map((s) => s.length);
    const total = lengths.reduce((a, b) => a + b, 0);
    const longest = lengths.length > 0 ? Math.max(...lengths) : 0;
    const histogram = new Array(DIRECTION_BINS).fill(0);
    for (const s of strokes) {
      const bin = directionBin(s.angle);
      histogram[bin] += 1;
    }
    const all = glyph.paths.flatMap((p) => p.subpaths);
    const pts = all.flat();
    return {
      count: strokes.length,
      totalLength: total,
      longestLength: longest,
      meanLength: strokes.length > 0 ? total / strokes.length : 0,
      directionHistogram: histogram,
      centroid: centroid(pts),
      bounds: boundsOf(all),
      lengthRatio: lengths.map((l) => total > 0 ? l / total : 0)
    };
  }
  function directionBin(angle) {
    let a = angle % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    const bin = Math.floor(a / Math.PI * DIRECTION_BINS) % DIRECTION_BINS;
    return bin;
  }
  function checkStrokeOrder(glyph, order) {
    const strokes = splitStrokes(glyph);
    if (order.length !== strokes.length) {
      return { ok: false, suspectIndex: -1, reason: `\u7B14\u5E8F\u957F\u5EA6 ${order.length} \u4E0E\u7B14\u753B\u6570 ${strokes.length} \u4E0D\u7B26` };
    }
    const skeleton = isStrokeGlyph(glyph);
    for (let i = 1; i < order.length; i += 1) {
      const prev = strokes[order[i - 1]];
      const cur = strokes[order[i]];
      if (!prev || !cur) continue;
      const end = prev.points[prev.points.length - 1];
      const start = cur.points[0];
      if (!end || !start) continue;
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const scale2 = Math.max(prev.length, cur.length, 1);
      if (dist > scale2 * 0.6) {
        if (skeleton) {
          return {
            ok: true,
            suspectIndex: i,
            reason: `\u7B2C ${i} \u7B14\u4E0E\u4E0A\u4E00\u7B14\u4E0D\u8854\u63A5\uFF08\u9AA8\u67B6\u5B57\u5F62\u7684\u7B14\u753B\u5404\u81EA\u72EC\u7ACB\uFF0C\u6587\u4EF6\u987A\u5E8F\u5373\u843D\u7B14\u987A\u5E8F\uFF0C\u65E0\u7B14\u5E8F\u9519\u8BEF\u53EF\u67E5\uFF09`
          };
        }
        return {
          ok: false,
          suspectIndex: i,
          reason: `\u7B2C ${i} \u7B14\u4E0E\u4E0A\u4E00\u7B14\u76F8\u8DDD ${dist.toFixed(1)}\uFF0C\u8FD9\u4E00\u4E32\u4E0D\u50CF\u4E00\u6761\u8FDE\u7EED\u7684\u7B14\u987A\uFF08\u6479\u672C\u5B57\u5F62\u7684\u8DEF\u5F84\u987A\u5E8F\u672C\u5C31\u4E0D\u627F\u8F7D\u7B14\u987A\u4FE1\u606F\uFF09`
        };
      }
    }
    return { ok: true, suspectIndex: -1, reason: "\u7B14\u5E8F\u8FDE\u8D2F" };
  }

  // src/teaching/compare.ts
  function makeFrames(a, b, resolution) {
    const inkA = boundsOf(a.paths.flatMap((p) => p.subpaths));
    const inkB = boundsOf(b.paths.flatMap((p) => p.subpaths));
    const canvas = {
      x: resolution * 0.04,
      y: resolution * 0.04,
      width: resolution * 0.92,
      height: resolution * 0.92
    };
    const sameUnits = Math.abs(a.viewBox.width - b.viewBox.width) < 1e-6 && Math.abs(a.viewBox.height - b.viewBox.height) < 1e-6;
    if (sameUnits) {
      const w = Math.max(inkA.width, inkB.width) || 1;
      const h = Math.max(inkA.height, inkB.height) || 1;
      const s = Math.min(canvas.width / w, canvas.height / h);
      const frameFor = (ink, glyph) => ({
        matrix: {
          a: s,
          b: 0,
          c: 0,
          d: s,
          e: canvas.x + canvas.width / 2 - (ink.x + ink.width / 2) * s,
          f: canvas.y + canvas.height / 2 - (ink.y + ink.height / 2) * s
        },
        resolution,
        viewBox: glyph.viewBox
      });
      return { fa: frameFor(inkA, a), fb: frameFor(inkB, b) };
    }
    const one = (glyph, ink) => ({
      matrix: fitToBox(ink, canvas, true),
      resolution,
      viewBox: glyph.viewBox
    });
    return { fa: one(a, inkA), fb: one(b, inkB) };
  }
  function applyFrame2(mask, frame) {
    const out = rasterizeGlyph([], {
      width: frame.resolution,
      height: frame.resolution,
      viewBox: { x: 0, y: 0, width: 1, height: 1 }
    });
    const m = frame.matrix;
    const vb = frame.viewBox;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue;
        const ux = vb.x + (x + 0.5) * vb.width / mask.width;
        const uy = vb.y + (y + 0.5) * vb.height / mask.height;
        const tx = m.a * ux + m.c * uy + m.e;
        const ty = m.b * ux + m.d * uy + m.f;
        const px = Math.floor(tx);
        const py = Math.floor(ty);
        if (px >= 0 && py >= 0 && px < frame.resolution && py < frame.resolution) {
          out.data[py * frame.resolution + px] = 1;
        }
      }
    }
    return out;
  }
  function pathMask(glyph, pathIndex, frame) {
    const p = glyph.paths[pathIndex];
    const strokes = isStrokeGlyph(glyph) ? [{ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 }] : void 0;
    const raw = rasterizeGlyph(p.subpaths, {
      width: frame.resolution,
      height: frame.resolution,
      viewBox: glyph.viewBox,
      strokes
    });
    return applyFrame2(raw, frame);
  }
  function intersect2(a, b) {
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    let n = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (a.data[y * a.width + x] && b.data[y * b.width + x]) n += 1;
      }
    }
    return n;
  }
  function compareGlyphs(a, b, options = {}) {
    const resolution = options.resolution ?? 128;
    const pairThreshold = options.pairThreshold ?? 0.3;
    const { fa, fb } = makeFrames(a, b, resolution);
    const ma = rasterizeGlyph(a.paths.flatMap((p) => p.subpaths), {
      width: resolution,
      height: resolution,
      viewBox: a.viewBox,
      strokes: isStrokeGlyph(a) ? glyphStrokes(a) : void 0
    });
    const mb = rasterizeGlyph(b.paths.flatMap((p) => p.subpaths), {
      width: resolution,
      height: resolution,
      viewBox: b.viewBox,
      strokes: isStrokeGlyph(b) ? glyphStrokes(b) : void 0
    });
    const na = applyFrame2(ma, fa);
    const nb = applyFrame2(mb, fb);
    const inter = intersect2(na, nb);
    const union = countInk(na) + countInk(nb) - inter;
    const similarity = union > 0 ? inter / union : 0;
    const am = a.paths.map((_, i) => pathMask(a, i, fa));
    const bm = b.paths.map((_, i) => pathMask(b, i, fb));
    const usedA = /* @__PURE__ */ new Set();
    const usedB = /* @__PURE__ */ new Set();
    const pairs = [];
    const cand = [];
    for (let i = 0; i < am.length; i += 1) {
      const ia = countInk(am[i]);
      if (ia === 0) continue;
      for (let j = 0; j < bm.length; j += 1) {
        const ib = countInk(bm[j]);
        if (ib === 0) continue;
        const ov = intersect2(am[i], bm[j]);
        const coverage = ov / ia;
        const precision = ov / ib;
        const score = coverage + precision > 0 ? 2 * coverage * precision / (coverage + precision) : 0;
        if (score >= pairThreshold) cand.push({ a: i, b: j, score, coverage, precision });
      }
    }
    cand.sort((x, y) => y.score - x.score);
    for (const c of cand) {
      if (usedA.has(c.a) || usedB.has(c.b)) continue;
      usedA.add(c.a);
      usedB.add(c.b);
      pairs.push(c);
    }
    const onlyA = am.map((_, i) => i).filter((i) => countInk(am[i]) > 0 && !usedA.has(i));
    const onlyB = bm.map((_, i) => i).filter((i) => countInk(bm[i]) > 0 && !usedB.has(i));
    const summary = onlyA.length === 0 && onlyB.length === 0 ? `\u4E24\u5B57\u7B14\u753B\u4E00\u4E00\u5BF9\u5E94\uFF0C${pairs.length} \u7B14\u5168\u90E8\u914D\u5F97\u4E0A\uFF08\u5F62\u4F3C\u5EA6 ${(similarity * 100).toFixed(0)}%\uFF09` : `\u5171\u6709 ${pairs.length} \u7B14\uFF1B` + (onlyA.length > 0 ? `\u524D\u8005\u53E6\u6709 ${onlyA.length} \u7B14\uFF08${onlyA.map((i) => i + 1).join("\u3001")}\uFF09\uFF1B` : "") + (onlyB.length > 0 ? `\u540E\u8005\u53E6\u6709 ${onlyB.length} \u7B14\uFF08${onlyB.map((i) => i + 1).join("\u3001")}\uFF09\u3002` : "");
    return { similarity, pairs, onlyA, onlyB, summary };
  }

  // src/teaching/family.ts
  var DESCRIPTOR_SIZE = 16;
  function componentDescriptor(glyph, pathIndices, size = DESCRIPTOR_SIZE) {
    const desc = new Uint8Array(size * size / 8);
    if (pathIndices.length === 0) return desc;
    const subpaths = glyph.paths.filter((_, i) => pathIndices.includes(i)).flatMap((p) => p.subpaths);
    if (subpaths.length === 0) return desc;
    const box = boundsOf(subpaths);
    const boxW = Math.max(1e-6, box.width);
    const boxH = Math.max(1e-6, box.height);
    const scale2 = size * 4 / Math.max(boxW, boxH);
    const part = rasterizeGlyph(subpaths, {
      width: Math.max(1, Math.round(boxW * scale2)),
      height: Math.max(1, Math.round(boxH * scale2)),
      viewBox: box,
      strokes: isStrokeGlyph(glyph) ? glyph.paths.filter((_, i) => pathIndices.includes(i)).map((p) => ({ points: p.subpaths[0] ?? [], halfWidth: p.strokeWidth / 2 })) : void 0
    });
    const cropped = cropToInk2(part);
    if (countInk(cropped.mask) === 0) return desc;
    const matrix = fitToBox(
      { x: 0, y: 0, width: cropped.mask.width, height: cropped.mask.height },
      { x: 0, y: 0, width: size, height: size },
      true
    );
    const normalized = resampleMask(cropped.mask, matrix, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!normalized[y * size + x]) continue;
        const bit = y * size + x;
        desc[bit >> 3] |= 1 << (bit & 7);
      }
    }
    return desc;
  }
  function cropToInk2(mask) {
    const b = boundsOfMask2(mask);
    if (!b) return { mask, offsetX: 0, offsetY: 0 };
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const out = rasterizeGlyph([], { width: w, height: h, viewBox: { x: 0, y: 0, width: 1, height: 1 } });
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (mask.data[(y + b.y0) * mask.width + (x + b.x0)]) out.data[y * w + x] = 1;
      }
    }
    return { mask: out, offsetX: b.x0, offsetY: b.y0 };
  }
  function boundsOfMask2(mask) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x + 1 > x1) x1 = x + 1;
        if (y + 1 > y1) y1 = y + 1;
      }
    }
    return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  function resampleMask(mask, matrix, size) {
    const out = new Uint8Array(size * size);
    for (let y = 0; y < mask.height; y += 1) {
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue;
        const ux = x + 0.5;
        const uy = y + 0.5;
        const tx = matrix.a * ux + matrix.c * uy + matrix.e;
        const ty = matrix.b * ux + matrix.d * uy + matrix.f;
        const px = Math.floor(tx);
        const py = Math.floor(ty);
        if (px >= 0 && py >= 0 && px < size && py < size) out[py * size + px] = 1;
      }
    }
    return out;
  }
  function descriptorDistance2(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i += 1) {
      let x = a[i] ^ b[i];
      while (x) {
        d += x & 1;
        x >>= 1;
      }
    }
    return d;
  }
  function buildPhoneticFamilies(inputs, maxDistance = 24) {
    const families = [];
    const descOf = /* @__PURE__ */ new Map();
    for (const i of inputs) descOf.set(i.char, i.descriptor);
    for (const item of inputs) {
      let placed = false;
      for (const fam of families) {
        const tooFar = fam.members.some((m) => {
          const d = descOf.get(m.char);
          return d ? descriptorDistance2(item.descriptor, d) > maxDistance : false;
        });
        if (tooFar) continue;
        fam.members.push({ char: item.char, semantic: item.semantic, side: item.side });
        fam.size = fam.members.length;
        placed = true;
        break;
      }
      if (!placed) {
        families.push({
          representative: item.char,
          members: [{ char: item.char, semantic: item.semantic, side: item.side }],
          size: 1,
          spread: 0
        });
      }
    }
    for (const fam of families) {
      let spread = 0;
      for (const m of fam.members) {
        const src = descOf.get(m.char);
        if (!src) continue;
        for (const other of fam.members) {
          const o = descOf.get(other.char);
          if (!o) continue;
          spread = Math.max(spread, descriptorDistance2(src, o));
        }
      }
      fam.spread = spread;
    }
    return families.sort((a, b) => b.size - a.size || a.representative.localeCompare(b.representative));
  }
  function descriptorOf(glyph, pathIndices) {
    return componentDescriptor(glyph, pathIndices);
  }
  function inkOf(mask) {
    return countInk(mask);
  }

  // src/data/types.ts
  var SCRIPT_META = {
    oracle: { name: "\u7532\u9AA8\u6587", vertical: false },
    bronze: { name: "\u91D1\u6587", vertical: false },
    seal: { name: "\u7BC6\u4E66", vertical: false },
    clerical: { name: "\u96B6\u4E66", vertical: false },
    chuanchao: { name: "\u50B3\u6284\u53E4\u6587", vertical: false },
    chu: { name: "\u695A\u7B80", vertical: false }
  };
  function parseJsonl(text) {
    const out = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed));
      } catch {
      }
    }
    return out;
  }

  // src/index.ts
  var VERSION = "0.1.0";
  return __toCommonJS(index_exports);
})();
