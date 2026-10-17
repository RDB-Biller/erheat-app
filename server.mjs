// Zero-dependency static server for Railway. Hash routing, so no rewrite rules are needed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".map": "application/json" };
createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");
  if (url.pathname === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}'); }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (p.endsWith("/")) p += "index.html";
  const headers = { "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY" };
  try {
    const body = await readFile(join(root, p));
    const ext = extname(p);
    res.writeHead(200, { ...headers, "content-type": types[ext] || "application/octet-stream", "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600" });
    res.end(body);
  } catch {
    try { res.writeHead(200, { ...headers, "content-type": types[".html"], "cache-control": "no-cache" }); res.end(await readFile(join(root, "index.html"))); }
    catch { res.writeHead(503); res.end("Not built yet. Run npm run build."); }
  }
}).listen(Number(process.env.PORT) || 3000, () => console.log("ER HEAT serving dist/"));
