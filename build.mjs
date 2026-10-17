// Bundles the app with esbuild. No framework tooling: React + one bundle + one stylesheet.
import { build, context } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const BILLER = (process.env.ERHEAT_BILLER_URL || process.env.VITE_BILLER_URL || "https://nextgenhnnbiller-production-bdf1.up.railway.app").replace(/\/$/, "");
const serve = process.argv.includes("--serve");
const opts = {
  entryPoints: { app: "src/main.tsx" },
  bundle: true, outdir: "dist", format: "esm", target: "es2020",
  minify: !serve, sourcemap: serve, jsx: "automatic", loader: { ".svg": "text" },
  define: { __BILLER_URL__: JSON.stringify(BILLER), "process.env.NODE_ENV": JSON.stringify(serve ? "development" : "production") },
  logLevel: "info",
  entryNames: serve ? "[name]" : "[name]-[hash]", // hashed names in production, so a new deploy is never served from a stale cache
  metafile: true,
};
function shell(meta) {
  mkdirSync("dist", { recursive: true });
  cpSync("public", "dist", { recursive: true });
  let html = readFileSync("index.html", "utf8");
  if (meta) for (const out of Object.keys(meta.outputs)) { const f = out.replace(/^dist\//, ""); const plain = f.replace(/-[A-Z0-9]{8}(\.\w+)$/, "$1"); html = html.replace("/" + plain, "/" + f); }
  writeFileSync("dist/config.js", "window.__ERHEAT__={};"); // dev default; server.mjs serves the real one
  writeFileSync("dist/index.html", html);
}
rmSync("dist", { recursive: true, force: true });
if (serve) {
  shell();
  const ctx = await context(opts);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "dist", port: Number(process.env.PORT) || 5173 });
  console.log(`ER HEAT dev server on http://localhost:${port} (Biller: ${BILLER})`);
} else {
  const r = await build(opts); shell(r.metafile);
  console.log(`built dist/ (Biller: ${BILLER})`);
}
