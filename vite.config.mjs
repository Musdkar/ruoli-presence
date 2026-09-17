import { resolve, join, sep } from "node:path";
import { readdir, rm } from "node:fs/promises";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Artifact families this SPA ships. Anything else a misconfigured publicDir
// or an added copy step drops into the output is removed after the build.
const ALLOWED_PREFIXES = ["index.html", "assets/"];

function buildGuard() {
  let outDir = "";
  return {
    name: "ruoli-build-guard",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      if (outDir === "") return;
      const keepFile = (rel) =>
        ALLOWED_PREFIXES.some((p) =>
          p.endsWith(sep) ? rel.startsWith(p) : rel === p
        );
      const walk = async (dir, rel = "") => {
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const nextRel = rel ? join(rel, entry.name) : entry.name;
          if (entry.isDirectory()) {
            const keepDir = ALLOWED_PREFIXES.some(
              (p) => p.endsWith(sep) && nextRel.startsWith(p.slice(0, -1))
            );
            if (keepDir === false) {
              await rm(join(dir, entry.name), { recursive: true, force: true });
              continue;
            }
            await walk(join(dir, entry.name), nextRel);
            continue;
          }
          if (keepFile(nextRel) === false) await rm(join(dir, entry.name), { force: true });
        }
      };
      await walk(outDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), buildGuard()],
});
