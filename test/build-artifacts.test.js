import { describe, it, expect } from "vitest";
import {
  normalizeBuildPath,
  isAllowedBuildArtifact,
  isAllowedBuildDirectory,
} from "../scripts/build-artifacts.mjs";

describe("normalizeBuildPath", () => {
  it("converts windows separators to POSIX", () => {
    expect(normalizeBuildPath("assets\\index.js")).toBe("assets/index.js");
    expect(normalizeBuildPath("assets/index.js")).toBe("assets/index.js");
  });
});

describe("isAllowedBuildArtifact", () => {
  it("allows index.html, assets/*, the config and the SEO root files", () => {
    expect(isAllowedBuildArtifact("index.html")).toBe(true);
    expect(isAllowedBuildArtifact("assets/index-abc.js")).toBe(true);
    expect(isAllowedBuildArtifact("staticwebapp.config.json")).toBe(true);
    expect(isAllowedBuildArtifact("robots.txt")).toBe(true);
    expect(isAllowedBuildArtifact("sitemap.xml")).toBe(true);
  });
  it("rejects unexpected files and keeps index.html exact", () => {
    expect(isAllowedBuildArtifact("robots.txt.bak")).toBe(false);
    expect(isAllowedBuildArtifact("index.html.bak")).toBe(false);
    expect(isAllowedBuildArtifact("foo/bar.js")).toBe(false);
  });
  it("does not treat robots.txt as a directory prefix", () => {
    expect(isAllowedBuildArtifact("robots.txt/evil.js")).toBe(false);
  });
  it("works for windows-style input", () => {
    expect(isAllowedBuildArtifact("assets\\software-icons\\vscode.png")).toBe(true);
    expect(isAllowedBuildArtifact("secret\\file.txt")).toBe(false);
  });
});

describe("isAllowedBuildDirectory", () => {
  it("keeps assets and nested dirs, drops others", () => {
    expect(isAllowedBuildDirectory("assets")).toBe(true);
    expect(isAllowedBuildDirectory("assets/software-icons")).toBe(true);
    expect(isAllowedBuildDirectory("")).toBe(false);
    expect(isAllowedBuildDirectory("foo")).toBe(false);
    expect(isAllowedBuildDirectory("assetsx")).toBe(false);
  });
});
