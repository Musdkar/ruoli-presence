import { describe, it, expect } from "vitest";
import { config } from "../src/config.js";
import { hasSocialIcon, socialIconKeys } from "../src/components/SocialIcon.jsx";

// The Connect rail renders an icon looked up by `icon` on each config entry. A
// typo there renders an empty tile rather than failing the build, so the wiring
// is asserted here.

describe("connect rail — icons", () => {
  it("has at least one link", () => {
    expect(config.socialLinks.length).toBeGreaterThan(0);
  });

  it("gives every link an icon that resolves", () => {
    for (const link of config.socialLinks) {
      expect(link.icon, `${link.name} is missing an icon key`).toBeTruthy();
      expect(hasSocialIcon(link.icon), `${link.name} -> unknown icon "${link.icon}"`).toBe(true);
    }
  });

  it("keeps the label as a stable React key and accessible fallback", () => {
    const labels = config.socialLinks.map((l) => l.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) expect(label).toBeTruthy();
  });

  it("names every link for its title and aria-label", () => {
    for (const link of config.socialLinks) expect(link.name).toBeTruthy();
  });

  it("still exposes the in-app contact route", () => {
    // "/email" is a client-side route, not an external URL; the sidebar picks
    // <Link> vs <a> by this leading slash.
    expect(config.socialLinks.some((l) => l.href.startsWith("/"))).toBe(true);
  });

  it("maps each service to a distinct glyph", () => {
    // Four tiles all showing the same icon would still pass the checks above.
    const keys = config.socialLinks.map((l) => l.icon);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ships no unused icon keys", () => {
    // Dead entries here mean a renamed service left an orphan behind.
    const used = new Set(config.socialLinks.map((l) => l.icon));
    for (const key of socialIconKeys()) {
      expect(used.has(key), `icon "${key}" is defined but unused`).toBe(true);
    }
  });
});
