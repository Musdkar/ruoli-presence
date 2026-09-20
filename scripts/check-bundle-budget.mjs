#!/usr/bin/env node
/*
 * Initial-load performance guard for ruoli-presence.
 *
 * Only assets referenced directly by dist/index.html count toward the hard
 * first-load budget. Lazy chunks are reported separately so route/map growth
 * remains visible without blocking unrelated changes.
 */
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, join } from "node:path";

const DIST = resolve("dist");
const BUDGETS = {
  js: 120 * 1024,
  css: 15 * 1024,
};

if (!existsSync(resolve(DIST, "index.html"))) {
  console.error("performance-budget: dist/index.html not found");
  process.exit(1);
}

const html = readFileSync(resolve(DIST, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
  .map((m) => m[1])
  .filter((ref) => !/^https?:\/\//.test(ref));

const kb = (bytes) => (bytes / 1024).toFixed(1);
const gzipOf = (file) => gzipSync(readFileSync(file)).length;
const totals = { js: 0, css: 0 };

console.log("\nInitial-load performance budget");
for (const ref of refs) {
  const file = resolve(DIST, ref.replace(/^\//, ""));
  const type = ref.endsWith(".js") ? "js" : "css";
  const gzip = gzipOf(file);
  totals[type] += gzip;
  console.log(`  ${ref}: ${kb(statSync(file).size)} kB raw / ${kb(gzip)} kB gzip`);
}
console.log(`  total initial JS:  ${kb(totals.js)} kB gzip / ${kb(BUDGETS.js)} kB budget`);
console.log(`  total initial CSS: ${kb(totals.css)} kB gzip / ${kb(BUDGETS.css)} kB budget`);

const assetsDir = resolve(DIST, "assets");
const initialNames = new Set(refs.map((ref) => ref.replace(/^.*\//, "")));
if (existsSync(assetsDir)) {
  const lazy = readdirSync(assetsDir)
    .filter((name) => name.endsWith(".js") && !initialNames.has(name))
    .map((name) => ({ name, gzip: gzipOf(join(assetsDir, name)) }))
    .sort((a, b) => b.gzip - a.gzip)
    .slice(0, 5);
  if (lazy.length) {
    console.log("  largest on-demand JS chunks:");
    for (const item of lazy) console.log(`    ${item.name}: ${kb(item.gzip)} kB gzip`);
  }
}

let failed = false;
for (const type of Object.keys(BUDGETS)) {
  if (totals[type] > BUDGETS[type]) {
    console.error(
      `  BUDGET EXCEEDED: initial ${type.toUpperCase()} ${kb(totals[type])} kB > ${kb(BUDGETS[type])} kB`
    );
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("  within budget ✓\n");
