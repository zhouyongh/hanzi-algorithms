import { describe, expect, it } from "vitest";
import { fft1d, fft2d, nextPow2 } from "../src/raster/fft.ts";

describe("fft1d", () => {
  it("正变换再逆变换回到原信号", () => {
    const n = 64;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i += 1) re[i] = Math.sin((2 * Math.PI * 3 * i) / n) + 0.5 * Math.cos((2 * Math.PI * 7 * i) / n);

    fft1d(re, im, false);
    fft1d(re, im, true);

    for (let i = 0; i < n; i += 1) {
      expect(re[i]).toBeCloseTo(Math.sin((2 * Math.PI * 3 * i) / n) + 0.5 * Math.cos((2 * Math.PI * 7 * i) / n), 8);
      expect(im[i]).toBeCloseTo(0, 8);
    }
  });

  it("常数信号的正变换只有直流分量", () => {
    const n = 32;
    const re = new Float64Array(n).fill(3);
    const im = new Float64Array(n);
    fft1d(re, im, false);
    expect(re[0]).toBeCloseTo(3 * n, 8);
    for (let i = 1; i < n; i += 1) {
      expect(Math.hypot(re[i], im[i])).toBeCloseTo(0, 8);
    }
  });

  it("拒绝非 2 的幂长度", () => {
    const re = new Float64Array(6);
    const im = new Float64Array(6);
    expect(() => fft1d(re, im, false)).toThrow();
  });
});

describe("fft2d", () => {
  it("二维正逆变换可逆", () => {
    const rows = 16;
    const cols = 16;
    const re = new Float64Array(rows * cols);
    const im = new Float64Array(rows * cols);
    const original = new Float64Array(rows * cols);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const v = Math.sin((2 * Math.PI * 2 * x) / cols) * Math.cos((2 * Math.PI * 3 * y) / rows);
        original[y * cols + x] = v;
        re[y * cols + x] = v;
      }
    }
    fft2d(re, im, rows, cols, false);
    fft2d(re, im, rows, cols, true);
    for (let i = 0; i < re.length; i += 1) {
      expect(re[i]).toBeCloseTo(original[i], 8);
    }
  });
});

describe("nextPow2", () => {
  it("向上取整到 2 的幂", () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(3)).toBe(4);
    expect(nextPow2(200)).toBe(256);
    expect(nextPow2(256)).toBe(256);
  });
});
