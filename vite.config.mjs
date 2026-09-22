import { resolve, join } from "node:path";
import { readdir, rm } from "node:fs/promises";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { isAllowedBuildArtifact, isAllowedBuildDirectory } from "./scripts/build-artifacts.mjs";

// Artifact families this SPA ships. Anything else a misconfigured publicDir
// or an added copy step drops into the output is removed after the build.

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
      const keepFile = (rel) => isAllowedBuildArtifact(rel);
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
            if (!isAllowedBuildDirectory(nextRel)) {
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

// In production the Azure Functions runtime serves the /api/<function>
// endpoints. The Vite dev server does not run Functions, so a presence read
// would 404 locally. Proxy only the known function endpoints — never the whole
// /api prefix, because shared modules also live under api/ and are served by
// Vite itself (proxying those would send a local file to the deployed site).
// Override with RUOLI_DEV_API_ORIGIN, or set it to "" to disable the proxy.
const DEV_API_ORIGIN = process.env.RUOLI_DEV_API_ORIGIN ?? "https://kalieri.com";
const DEV_API_ENDPOINTS = ["/api/presence", "/api/whatpulse", "/api/music", "/api/health"];

export default defineConfig({
  plugins: [react(), buildGuard()],
  server: DEV_API_ORIGIN
    ? {
        proxy: Object.fromEntries(
          DEV_API_ENDPOINTS.map((endpoint) => [
            endpoint,
            { target: DEV_API_ORIGIN, changeOrigin: true, secure: true },
          ])
        ),
      }
    : undefined,
});
