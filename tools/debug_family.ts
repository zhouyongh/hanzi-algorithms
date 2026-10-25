import { parseGlyphSvg } from "../src/glyph.ts";
import { componentDescriptor, descriptorDistance } from "../src/teaching/family.ts";
import type { Glyph } from "../src/glyph.ts";

type Pt = [number, number];

function synth(strokes: Pt[][]): Glyph {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + strokes.map((pts) => {
      const d = pts.map((p: Pt, i: number) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
      return `<path d="${d}" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>`;
    }).join("")
    + "</svg>";
  return parseGlyphSvg(svg);
}

const g1 = synth([[[10, 20], [30, 20]], [[60, 20], [90, 20]], [[75, 20], [75, 90]]]);
const g2 = synth([[[10, 20], [30, 20]], [[58, 22], [90, 22]], [[74, 22], [74, 88]]]);
const g3 = synth([[[10, 20], [30, 20]], [[55, 70], [90, 70]]]);

const d1 = componentDescriptor(g1, [1, 2]);
const d2 = componentDescriptor(g2, [1, 2]);
const d3 = componentDescriptor(g3, [1]);

const show = (d: Uint8Array): string => {
  const rows: string[] = [];
  for (let y = 0; y < 16; y += 1) {
    let line = "";
    for (let x = 0; x < 16; x += 1) {
      const bit = y * 16 + x;
      line += (d[bit >> 3] >> (bit & 7)) & 1 ? "#" : ".";
    }
    rows.push(line);
  }
  return rows.join("\n");
};

console.log("d1:\n" + show(d1));
console.log("d2:\n" + show(d2));
console.log("d3:\n" + show(d3));
console.log("d1~d2 =", descriptorDistance(d1, d2));
console.log("d1~d3 =", descriptorDistance(d1, d3));
