import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    // dist-artifacts.test.js needs a built dist/ and is run separately via
    // `npm run test:dist` after `npm run build`.
    exclude: ["**/node_modules/**", "**/dist/**", "test/dist-artifacts.test.js"],
    environment: "node",
    globals: false,
  },
});
