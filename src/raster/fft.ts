/**
 * 基 2 快速傅里叶变换（复数，原地）。
 *
 * 用途只有一个：把「模板在整图里逐位比对」从 O(W·H·w·h) 降到 O(W·H·log)，
 * 使部首定位可以在全字范围内搜索位置。
 *
 * 实数 FFT（rfft2）的两倍速优化暂时不做——先保证正确性；实测规模
 * （200×200 图、十几档尺度）用朴素复数 FFT 已足够快。
 */

/** 一维基 2 FFT，原地修改 `re` / `im`。长度必须是 2 的幂。 */
export function fft1d(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT 长度必须是 2 的幂，收到 ${n}`);
  }

  // 位反转置换
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len * (inverse ? 1 : -1);
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

/** 二维 FFT，原地修改 `re` / `im`（尺寸为 `rows × cols`，两轴都须是 2 的幂）。 */
export function fft2d(
  re: Float64Array,
  im: Float64Array,
  rows: number,
  cols: number,
  inverse: boolean,
): void {
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

/** 向上取整到 2 的幂。 */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
