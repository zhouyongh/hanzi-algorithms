/** 原始 TCP 看响应头（尤其是 content-length / transfer-encoding）。 */
import { connect } from "node:net";

const port = Number(process.argv[2] ?? 8129);
const path = process.argv[3] ?? "/dist/index.js";

const sock = connect(port, "127.0.0.1", () => {
  sock.write(
    `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n` +
    `Accept: */*\r\nSec-Fetch-Dest: script\r\n\r\n`,
  );
});

let buf = Buffer.alloc(0);
const started = Date.now();
sock.on("data", (c) => {
  buf = Buffer.concat([buf, c]);
  const sep = buf.indexOf("\r\n\r\n");
  if (sep >= 0) {
    const head = buf.subarray(0, sep).toString("utf8");
    console.log("--- 响应头（首个数据包后）---");
    console.log(head);
    console.log(`--- ${Date.now() - started}ms 时已收到 ${buf.length} 字节 ---`);
    sock.destroy();
    process.exit(0);
  }
});
sock.on("end", () => console.log("连接结束，未见响应头分隔符"));
sock.on("error", (e) => console.log("ERR", e.message));
setTimeout(() => {
  console.log(`10s 内未收到完整响应头，已收到 ${buf.length} 字节`);
  process.exit(1);
}, 10000);
