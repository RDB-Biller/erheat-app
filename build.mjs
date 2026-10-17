// Bundles the app with esbuild. No framework tooling: React + one bundle + one stylesheet.
import { build, context } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const BILLER = (process.env.ERHEAT_BILLER_URL || process.env.VITE_BILLER_URL || "https://hnnbiller.xchangeinsure.com").replace(/\/$/, "");
const serve = process.argv.includes("--serve");
const opts = {
  entryPoints: { app: "src/main.tsx" },
  bundle: true, outdir: "dist", format: "esm", target: "es2020",
  minify: !serve, sourcemap: serve, jsx: "automatic", loader: { ".svg": "text" },
  define: { __BILLER_URL__: JSON.stringify(BILLER), "process.env.NODE_ENV": JSON.stringify(serve ? "development" : "production") },
  logLevel: "info",
};
function shell() {
  mkdirSync("dist", { recursive: true });
  cpSync("public", "dist", { recursive: true });
  writeFileSync("dist/index.html", readFileSync("index.html", "utf8"));
}
rmSync("dist", { recursive: true, force: true });
if (serve) {
  shell();
  const ctx = await context(opts);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "dist", port: Number(process.env.PORT) || 5173 });
  console.log(`ER HEAT dev server on http://localhost:${port} (Biller: ${BILLER})`);
} else {
  await build(opts); shell();
  console.log(`built dist/ (Biller: ${BILLER})`);
}
