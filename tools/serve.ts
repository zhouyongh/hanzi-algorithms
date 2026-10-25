/**
 * 本地静态服务器 + 字形查询 API（给演示页用）。
 *
 * 为什么需要 API：字形索引表全部加起来有 22 MB（六层书体、9.5 万条记录），
 * 让浏览器一次性拉全再自己筛，会把页面卡死。改成由服务器筛好再给。
 *
 * 端点：
 * - `GET /api/rows?layer=seal&char=日`  取该书体里这个字的索引行（JSON 数组）
 * - `GET /api/chars?layer=seal`          取该书体的现代字列表（换行分隔）
 * - `GET /api/radicals`                  取说文 540 部登记表（全量，11,328 行约 1.6 MB）
 * - 其余路径按静态文件处理
 *
 * 用法：
 *   node tools/serve.ts            # 默认 8080 端口
 *   node tools/serve.ts --port 9000
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { REPO_ROOT } from "./lib/store.ts";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/** 索引表缓存：路径 → 解析好的表。 */
const tableCache = new Map<string, { header: string[]; rows: string[][] }>();

/** 读并解析 CSV（带缓存）。 */
function readTable(path: string): { header: string[]; rows: string[][] } {
  const hit = tableCache.get(path);
  if (hit) return hit;
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = (lines[0] ?? "").split(",").map((h) => h.replace(/^﻿/, ""));
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: string[] = [];
    for (let c = 0; c < header.length; c += 1) row.push(cells[c] ?? "");
    return row;
  });
  const table = { header, rows };
  tableCache.set(path, table);
  return table;
}

function json(res: import("node:http").ServerResponse, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    // 本地开发服务器：一律不发缓存。no-cache 在没有 ETag/Last-Modified 的情况下
    // 仍可能让浏览器沿用旧副本（实测演示页因此加载了过期的打包产物）。
    "cache-control": "no-store",
  });
  // 不设 content-length：与静态文件一样走 chunked。实测带 content-length 的
  // 响应在浏览器里迟迟不结束（服务器已发完，浏览器仍显示 pending）
  res.end(body);
}

function text(res: import("node:http").ServerResponse, body: string): void {
  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

/** 处理查询端点。 */
function handleApi(res: import("node:http").ServerResponse, url: URL): boolean {
  const layer = url.searchParams.get("layer") ?? "seal";

  if (url.pathname === "/api/chars") {
    const path = join(REPO_ROOT, "assets", "glyphs", layer, "index.csv");
    if (!existsSync(path)) return false;
    const { header, rows } = readTable(path);
    const ci = header.indexOf("modern_char");
    if (ci < 0) return false;
    const seen = new Set<string>();
    for (const r of rows) {
      const c = r[ci];
      if (c) seen.add(c);
    }
    text(res, [...seen].join("\n"));
    return true;
  }

  if (url.pathname === "/api/rows") {
    const char = url.searchParams.get("char") ?? "";
    const cp = url.searchParams.get("codepoint") ?? "";
    const path = join(REPO_ROOT, "assets", "glyphs", layer, "index.csv");
    if (!existsSync(path)) return false;
    const { header, rows } = readTable(path);
    const ci = header.indexOf("modern_char");
    const cpi = header.indexOf("codepoint");
    const out: Array<Record<string, string>> = [];
    for (const r of rows) {
      if (char && r[ci] !== char) continue;
      if (cp && cpi >= 0 && r[cpi].replace(/^U\+/, "") !== cp.replace(/^U\+/, "")) continue;
      const rec: Record<string, string> = {};
      header.forEach((h, i) => { rec[h] = r[i]; });
      out.push(rec);
    }
    json(res, out);
    return true;
  }

  if (url.pathname === "/api/radicals") {
    const path = join(REPO_ROOT, "assets", "glyphs", "seal", "external.csv");
    if (!existsSync(path)) return false;
    const cp = url.searchParams.get("codepoint");
    const { header, rows } = readTable(path);
    const out: Array<Record<string, string>> = [];
    for (const r of rows) {
      if (cp && r[0].replace(/^U\+/, "") !== cp.replace(/^U\+/, "")) continue;
      const rec: Record<string, string> = {};
      header.forEach((h, i) => { rec[h] = r[i]; });
      out.push(rec);
    }
    json(res, out);
    return true;
  }

  return false;
}

function parseArgs(argv: string[]): { port: number } {
  let port = 8080;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--port") port = Number(argv[++i] ?? port);
  }
  return { port };
}

const { port } = parseArgs(process.argv.slice(2));
const ROOT = REPO_ROOT;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (process.env.SERVE_VERBOSE) {
    console.log(`→ ${new Date().toISOString().slice(11, 23)} ${req.method} ${req.url}`);
  }

  // 长连接：短连接会在本机留下大量 TIME_WAIT，把端口耗光
  server.keepAliveTimeout = 60000;

  if (url.pathname === "/api/ping") {
    text(res, "pong");
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    try {
      if (handleApi(res, url)) return;
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end(String(err));
    }
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/demos/index.html";
  if (rel.endsWith("/")) rel += "index.html";

  // 防目录穿越
  const target = resolve(join(ROOT, normalize(rel)));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end(`404 ${rel}`);
    return;
  }
  const stat = statSync(target);
  // ETag + `no-cache`：浏览器每次都来问一次「变了吗」，没变就回 304（不传 body）。
  //
  // 为什么不用 `no-store`：那样连「变了吗」都不问，改完代码刷新可能还看到旧副本
  // （实测演示页因此加载过期的打包产物）。有了 ETag 就不存在这个问题，
  // 而且单页浏览页来回切 Tab 时，索引和字形都走 304，不用整份重传。
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { etag, "cache-control": "no-cache" }).end();
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[extname(target).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-cache",
    etag,
    // 给明确长度，但**保持连接**：每个请求都关连接的话，浏览器会不断新建 TCP
    // 连接，短连接的 TIME_WAIT 会把本机端口耗光，表现为「新连接建不起来、
    // 请求发出去了但永远收不到响应」。
    "content-length": stat.size,
  });
  res.end(readFileSync(target));
});

server.listen(port, "::", () => {
  console.log(`演示服务器已启动：http://127.0.0.1:${port}/`);
  console.log(`  首页     http://127.0.0.1:${port}/`);
  console.log(`  部首定位 http://127.0.0.1:${port}/demos/01-radical.html`);
  console.log("（Ctrl+C 停止）");
  console.log("提示：用 127.0.0.1 而不是 localhost——浏览器把 localhost 先解析到 ::1，");
  console.log("      只监听 IPv4 时每次请求都要等一次连接超时回退，页面会像卡住。");
});
