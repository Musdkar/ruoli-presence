import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Post-build assertions. These run via `npm run test:dist` AFTER `npm run build`
// so a clean CI runner genuinely verifies the final dist/ output. Unlike the old
// skipIf variant, a missing dist/ FAILS here — skipping silently would hide a
// broken gate.
const dist = resolve(process.cwd(), "dist");
const read = (name) => readFileSync(resolve(dist, name), "utf8");

beforeAll(() => {
  if (!existsSync(resolve(dist, "index.html"))) {
    throw new Error("dist/index.html not found — run `npm run build` before `npm run test:dist`.");
  }
});

describe("dist artifacts — presence", () => {
  it("keeps robots.txt", () => {
    expect(existsSync(resolve(dist, "robots.txt"))).toBe(true);
  });

  it("keeps sitemap.xml", () => {
    expect(existsSync(resolve(dist, "sitemap.xml"))).toBe(true);
  });
});

describe("dist artifacts — production URL", () => {
  it("never leaks the wrong domain in shipped files", () => {
    for (const file of ["index.html", "robots.txt", "sitemap.xml"]) {
      expect(read(file), file).not.toContain("ruoli.presence");
    }
  });

  it("index.html canonical and og:url point at kalieri.com", () => {
    const html = read("index.html");
    expect(html).toMatch(/rel="canonical" href="https:\/\/kalieri\.com\/"/);
    expect(html).toMatch(/property="og:url" content="https:\/\/kalieri\.com\/"/);
  });

  it("index.html og:image / twitter:image are absolute production URLs", () => {
    const html = read("index.html");
    expect(html).toMatch(
      /property="og:image" content="https:\/\/kalieri\.com\/assets\/avatar\.webp"/
    );
    expect(html).toMatch(
      /name="twitter:image" content="https:\/\/kalieri\.com\/assets\/avatar\.webp"/
    );
  });

  it("robots.txt advertises the production sitemap", () => {
    expect(read("robots.txt")).toContain("Sitemap: https://kalieri.com/sitemap.xml");
  });

  it("sitemap lists only kalieri.com routes", () => {
    const xml = read("sitemap.xml");
    for (const loc of ["/", "/blog", "/photo", "/uses"]) {
      expect(xml).toContain("<loc>https://kalieri.com" + loc + "</loc>");
    }
    expect(xml).not.toContain("ruoli.presence");
  });
});

describe("dist artifacts — index.html static head", () => {
  it("ships static description/canonical/OG/twitter tags", () => {
    const html = read("index.html");
    expect(html).toMatch(/name="description"/);
    expect(html).toMatch(/rel="canonical"/);
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/name="twitter:card"/);
  });
});
