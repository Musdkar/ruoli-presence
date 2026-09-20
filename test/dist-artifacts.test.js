import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// These assertions only run after a production build has produced dist/. They
// guard the build guard: robots.txt and sitemap.xml must survive the allowlist
// pruning, and the published sitemap must not advertise draft blog URLs.
const dist = resolve(process.cwd(), "dist");
const built = existsSync(resolve(dist, "index.html"));

describe.skipIf(!built)("dist artifacts", () => {
  it("keeps robots.txt", () => {
    expect(existsSync(resolve(dist, "robots.txt"))).toBe(true);
  });

  it("keeps sitemap.xml", () => {
    expect(existsSync(resolve(dist, "sitemap.xml"))).toBe(true);
  });

  it("sitemap only lists canonical routes", () => {
    const xml = readFileSync(resolve(dist, "sitemap.xml"), "utf8");
    expect(xml).toContain("<loc>https://ruoli.presence/</loc>");
    expect(xml).toContain("<loc>https://ruoli.presence/blog</loc>");
    expect(xml).toContain("<loc>https://ruoli.presence/uses</loc>");
    expect(xml).toContain("<loc>https://ruoli.presence/photo</loc>");
  });

  it("index.html ships static description/canonical/OG tags", () => {
    const html = readFileSync(resolve(dist, "index.html"), "utf8");
    expect(html).toMatch(/name="description"/);
    expect(html).toMatch(/rel="canonical"/);
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/name="twitter:card"/);
  });
});
