import { defineConfig } from "vitest/config";

// Dedicated config for the post-build dist checks. Kept separate so the main
// `vitest.config.mjs` can exclude dist-artifacts.test.js (it needs a real
// dist/) while this run includes ONLY that file and does not skip it.
export default defineConfig({
  test: {
    include: ["test/dist-artifacts.test.js"],
    exclude: ["**/node_modules/**"],
    environment: "node",
    globals: false,
  },
});
