/** 逐个请求打时间：单发 vs 并发，看慢在哪。 */
export {};
const port = Number(process.argv[2] ?? 8129);
const mode = process.argv[3] ?? "seq";
const n = Number(process.argv[4] ?? 8);
const url = process.argv[5] ?? "/dist/index.js";

async function one(i: number) {
  const t = Date.now();
  const r = await fetch(`http://127.0.0.1:${port}${url}`);
  const txt = await r.text();
  return { i, ms: Date.now() - t, len: txt.length };
}

if (mode === "seq") {
  for (let i = 0; i < n; i += 1) {
    const r = await one(i);
    console.log(`#${r.i} ${r.ms}ms ${r.len}B`);
  }
} else {
  const t0 = Date.now();
  const rs = await Promise.all(Array.from({ length: n }, (_, i) => one(i)));
  console.log(`并发 ${n} 个，总耗时 ${Date.now() - t0}ms`);
  for (const r of rs) console.log(`  #${r.i} ${r.ms}ms ${r.len}B`);
}
