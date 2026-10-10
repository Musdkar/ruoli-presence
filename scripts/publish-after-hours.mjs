// Publish the approved standalone homepage after Vite builds the existing routes.
// Copy a fixed list: never ship server scripts, private config or stale bundles.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import cssnano from "cssnano";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "experiments/after-hours");
const dist = resolve(root, "dist");
await copyFile(resolve(dist, "index.html"), resolve(dist, "routes.html"));
const files = [
  "index.html",
  "main.js",
  "lib/vrchat-presence.mjs",
  "lib/presence-sanitize.mjs",
  "assets/earth-day.jpg",
  "assets/earth-clouds.png",
  "assets/map-avatar.webp",
];
for (const file of files) {
  const target = resolve(dist, file);
  await mkdir(dirname(target), { recursive: true });
  // copyFile dereferences the shared sanitizer symlink into a real browser file.
  await copyFile(resolve(source, file), target);
}
const css = await readFile(resolve(source, "styles.css"), "utf8");
const optimizedCss = await postcss([cssnano({ preset: "default" })]).process(css, {
  from: resolve(source, "styles.css"),
  to: resolve(dist, "styles.css"),
  map: false,
});
await writeFile(resolve(dist, "styles.css"), optimizedCss.css);
console.log("Published AFTER HOURS homepage; existing routes retained in routes.html.");
