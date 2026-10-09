// Build the game into dist/ (what GitHub Pages serves).
//   node scripts/build.mjs           one build
//   node scripts/build.mjs --serve   build, watch, and serve at http://localhost:8000

import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const serve = process.argv.includes("--serve");

function copyStatic() {
  fs.mkdirSync(dist, { recursive: true });
  fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
  fs.cpSync(path.join(root, "styles"), path.join(dist, "styles"), { recursive: true });
  const assets = path.join(root, "public", "assets");
  if (fs.existsSync(assets)) fs.cpSync(assets, path.join(dist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dist, ".nojekyll"), "");
}

const options = {
  entryPoints: [path.join(root, "src", "main.js")],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  outfile: path.join(dist, "app.js"),
  sourcemap: true,
  minify: !serve,
  logLevel: "info",
};

fs.rmSync(dist, { recursive: true, force: true });
copyStatic();

if (serve) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: "static", setup: (b) => b.onEnd(() => copyStatic()) }],
  });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: dist, port: 8000 });
  console.log(`\n  Crystal Titans: http://localhost:${port}\n`);
} else {
  await esbuild.build(options);
}
