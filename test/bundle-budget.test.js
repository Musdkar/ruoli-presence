import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const checker = resolve("scripts/check-bundle-budget.mjs");

it("counts versioned entry assets and rejects an oversized versioned stylesheet", () => {
  const root = mkdtempSync(join(tmpdir(), "after-hours-budget-"));
  const dist = join(root, "dist");
  mkdirSync(dist);
  try {
    writeFileSync(
      join(dist, "index.html"),
      '<link href="./styles.css?v=release"><script src="./main.js?v=release#entry"></script>'
    );
    writeFileSync(join(dist, "styles.css"), "body { color: purple; }");
    writeFileSync(join(dist, "main.js"), "console.log('hello');");
    const passing = spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
    expect(passing.status).toBe(0);
    expect(passing.stdout).toContain("./styles.css:");
    expect(passing.stdout).toContain("./main.js:");

    writeFileSync(join(dist, "styles.css"), randomBytes(24 * 1024));
    const oversized = spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
    expect(oversized.status).toBe(1);
    expect(oversized.stderr).toContain("BUDGET EXCEEDED: initial CSS");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
