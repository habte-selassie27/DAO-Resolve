import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);
const upstream = "https://studio.genlayer.com";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function proxy(req, res) {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const response = await fetch(`${upstream}${req.url}`, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        accept: req.headers.accept || "application/json",
      },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
      signal: AbortSignal.timeout(60000),
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Studio RPC proxy failed", detail: String(error?.message || error) }));
  }
}

function serve(req, res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  const requested = path.normalize(path.join(dist, pathname));
  const relative = path.relative(dist, requested);
  const inside = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  const safe = inside && fs.existsSync(requested) && fs.statSync(requested).isFile();
  if (!safe && mime[path.extname(pathname).toLowerCase()]) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  const file = safe ? requested : path.join(dist, "index.html");
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "content-type": mime[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    if ((req.url || "").startsWith("/api")) return proxy(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    serve(req, res);
  })
  .listen(port, () => {
    console.log(`DAOResolve frontend on http://127.0.0.1:${port} (proxying /api to ${upstream})`);
  });
