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

describe("AFTER HOURS production entry", () => {
  it("publishes the approved homepage instead of the React shell", () => {
    expect(read("index.html")).toContain('id="hero-heading"');
    expect(read("index.html")).toContain('id="vr-world-image"');
    expect(read("index.html")).not.toContain('id="root"');
    expect(read("index.html")).not.toContain("ORIGINAL SITE");
    expect(existsSync(resolve(dist, "classic.html"))).toBe(false);
    for (const file of [
      "main.js",
      "styles.css",
      "assets/earth-day.jpg",
      "assets/map-avatar.webp",
    ]) {
      expect(existsSync(resolve(dist, file)), file).toBe(true);
    }
  });

  it("keeps the compiled React entry and its bundles for existing routes", () => {
    expect(existsSync(resolve(dist, "routes.html"))).toBe(true);
    const html = read("routes.html");
    expect(html).toContain('id="root"');
    const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const match of scripts) expect(existsSync(resolve(dist, match[1].slice(1)))).toBe(true);
  });

  it("ships a working VRChat view module with the canonical privacy filter", async () => {
    expect(existsSync(resolve(dist, "lib/vrchat-presence.mjs"))).toBe(true);
    const { selectVrchatPresence } = await import(resolve(dist, "lib/vrchat-presence.mjs"));
    const now = Date.parse("2026-10-10T08:00:00Z");
    const value = {
      kv: {
        vrchat_presence: {
          status: "online",
          observedAt: new Date(now).toISOString(),
          availability: "busy",
          location: { kind: "world", worldName: "Hidden world", access: "public" },
        },
      },
    };
    expect(selectVrchatPresence(value, now, now)).toMatchObject({
      title: "PRIVATE",
      worldImageUrl: null,
    });
  });
});
