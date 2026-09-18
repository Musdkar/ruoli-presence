#!/usr/bin/env node
/*
* Bundle budget gate for ruoli-presence.
 *
 * Reads dist/index.html, measures the gzip size of every JS/CSS asset that
 * participates in the INITIAL load (i.e. is referenced by index.html), and
 * fails the build if a budget is exceeded.
 *
 * Lazy/on-demand chunks (dynamic import()) are intentionally NOT counted —
 * they do not block first render. Their growth is tracked separately as a
 * warning so a regression there is still visible.
 *
 * Budgets mirror the performance-optimization skill defaults.
 */
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, join } from "node:path";

const DIST = resolve("dist");
const BUDGETS = {
  js: 200 * 1024, // initial JS gzip, bytes
  css: 50 * 1024, // initial CSS gzip, bytes
};

if (!existsSync(resolve(DIST, "index.html"))) {
  console.error("bundle-budget: dist/index.html not found — run `npm run build` first.");
  process.exit(1);
}

const html = readFileSync(resolve(DIST, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
  .map((m) => m[1])
  .filter((ref) => !/^https?:\/\//.test(ref));

const kb = (bytes) => (bytes / 1024).toFixed(1);
const gzipOf = (file) => gzipSync(readFileSync(file)).length;

const totals = { 
js: 0, css: 0 };
console.log("\nInitial-load budget report");
for (const ref of refs) {
  const file = resolve(DIST, ref.replace(/^\//, ""));
  const type = ref.endsWith(".js") ? "js" : "css";
  const gz = gzipOf(file);
  totals[type] += gz;
  console.log(`  ${ref}: ${kb(statSync(file).size)} kB raw / ${kb(gz)} kB gzip`);
}
console.log(`  total initial JS:  ${kb(totals.js)} kB gzip (budget ${kb(BUDGETS.js)} kB)`);
console.log(`  total initial CSS: ${kb(totals.css)} kB gzip (budget ${kb(BUDGETS.css)} kB)`);

// Lazy chunks: report for visibility, but do not fail on them.
const assetsDir = resolve(DIST, "assets");
const initialNames = new Set(refs.map((r) => r.replace(/^.*\//, "")));
if (existsSync(assetsDir)) {
  const lazy = readdirSync(assetsDir)
    .filter((f) => f.endsWith(".js") && !initialNames.has(f))
    .map((f) => ({ f, gz: gzipOf(join(assetsDir, f)) }))
    .sort((a, b) => b.gz - a.gz)
    .slice(0, 5);
  if (lazy.length) {
    console.log("  largest on-demand JS chunks (not counted in initial load):");
    for (const { f, gz } of lazy) console.log(`    ${f}: ${kb(gz)} kB gzip`);
  }
}

let failed = false;
for (const type of Object.keys(BUDGETS )) {
  if (totals[type] > BUDGETS[type]) {
    console.error(`  BUDGET EXCEEDED: initial ${type.toUpperCase()} ${kb(totals[type])} kB > ${kb(BUDGETS[type])} kB` );
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("  within budget ✓\n");
