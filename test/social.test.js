import { describe, it, expect } from "vitest";
import { siGithub, siVrchat, siTelegram } from "simple-icons";
import { config } from "../src/config.js";
import { hasSocialIcon, socialIconPath, socialIconPaths } from "../src/components/SocialIcon.jsx";

// Every entry in the Connect rail renders an <svg> looked up by `icon`. A typo
// or a missing key would silently render an empty tile rather than fail the
// build, so the wiring is asserted here.

describe("connect rail — icons", () => {
  it("has at least one link", () => {
    expect(config.socialLinks.length).toBeGreaterThan(0);
  });

  it("gives every link an icon that exists", () => {
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
});

// The brand paths are copied out of simple-icons rather than imported, so the
// copies can drift when the dependency is bumped. Pin them to the package: if
// an upstream mark changes, this fails and the literals get refreshed instead
// of the site quietly serving a stale logo.
//
// The rail draws outline marks, which are not byte-identical to the filled
// package artwork, so this compares the filled copies. Those are the ones tied
// to the package; the outlines are derived from them.
describe("connect rail — brand paths match simple-icons", () => {
  it.each([
    ["github", siGithub],
    ["vrchat", siVrchat],
    ["telegram", siTelegram],
  ])("%s is byte-identical to the official mark", (key, official) => {
    expect(socialIconPath(key)).toBe(official.path);
  });

  it("never substitutes a brand mark for the in-app contact tile", () => {
    // The @ tile opens /email, not a mail provider, so it must not wear a
    // Gmail/Proton-style logo. It is the one hand-drawn glyph.
    expect(socialIconPath("mail")).toBeUndefined();
  });

  it("draws every rail icon as an outline, not a filled brand mark", () => {
    // The rail follows the reference design: stroke icons in a thin circle.
    // A filled path here would render as a solid blob at 19px.
    for (const key of ["github", "vrchat", "telegram", "mail"]) {
      expect(Array.isArray(socialIconPaths(key)), `${key} should be stroke paths`).toBe(true);
      for (const d of socialIconPaths(key)) {
        expect(d.length).toBeGreaterThan(0);
        // Filled brand marks start at the canvas origin and trace a solid
        // shape; these all start with a move or arc command.
        expect(d).toMatch(/^[Mm]/);
      }
    }
  });
});
