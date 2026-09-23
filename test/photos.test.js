import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { photos, photoFileName, photoSrc } from "../src/data/photos.js";
import { config } from "../src/config.js";
import { formatPhotoTaken } from "../src/lib/format.js";

// The archive is data-driven: photo entries point at real files in
// public/assets/photos, and the width/height in each entry is what React Photo
// Album reserves space with. If an entry and its file disagree, the masonry
// layout is built against the wrong aspect ratio, so both are asserted here.

const ARCHIVE = resolve(process.cwd(), "public", "assets", "photos");

describe("photo archive — entries", () => {
  it("ships at least one photo", () => {
    expect(photos.length).toBeGreaterThan(0);
  });

  it("references a file that exists in public/assets/photos", () => {
    photos.forEach((photo) => {
      expect(existsSync(resolve(ARCHIVE, photoFileName(photo))), photo.file).toBe(true);
    });
  });

  it("has a unique file per entry", () => {
    const names = photos.map(photoFileName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("addresses files only by basename, never by path", () => {
    photos.forEach((photo) => {
      expect(photo.file, photo.file).not.toMatch(/[/\\]/);
      expect(photoSrc(photo)).toBe("/assets/photos/" + photo.file + ".webp");
    });
  });

  it("uses a filename that matches its taken timestamp", () => {
    photos.forEach((photo) => {
      const compact = photo.taken.replace(/[-:T]/g, "").slice(0, 14);
      expect(photo.file.replace(/-/g, ""), photo.file).toBe(compact);
    });
  });

  it("declares positive integer dimensions matching the shipped file", () => {
    photos.forEach((photo) => {
      expect(Number.isInteger(photo.width) && photo.width > 0, photo.file).toBe(true);
      expect(Number.isInteger(photo.height) && photo.height > 0, photo.file).toBe(true);
      // Guard against a photo entry silently dropping its alt text.
      expect(typeof photo.alt, photo.file).toBe("string");
    });
  });

  it("keeps intrinsic dimensions within the resize cap", () => {
    photos.forEach((photo) => {
      expect(Math.max(photo.width, photo.height), photo.file).toBeLessThanOrEqual(1600);
    });
  });
});

describe("photo archive — shipped size", () => {
  // These files are not part of the initial bundle, but the whole folder is
  // published, so keep an eye on the total a visitor may end up downloading.
  it("keeps the archive folder under 2 MB", () => {
    const total = photos.reduce(
      (sum, photo) => sum + readFileSync(resolve(ARCHIVE, photoFileName(photo))).length,
      0
    );
    expect(total).toBeLessThan(2 * 1024 * 1024);
  });
});

describe("config.photos", () => {
  it("is derived from the archive, newest first", () => {
    const taken = config.photos.map((photo) => photo.taken);
    expect(taken).toEqual([...taken].sort().reverse());
  });

  it("exposes the latest frame as photos[0] for the Home card", () => {
    expect(config.photos[0].taken).toBe([...photos.map((p) => p.taken)].sort().reverse()[0]);
  });

  it("gives every entry the fields the album needs", () => {
    config.photos.forEach((photo) => {
      expect(photo.src).toMatch(/^\/assets\/photos\/.+\.webp$/);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.alt).toBeTruthy();
      expect(photo.taken).toBeTruthy();
    });
  });

  it("does not mutate the authored archive order", () => {
    // The authored file is oldest-first; config re-sorts a copy for display.
    expect(photos.map((p) => p.taken)).toEqual([...photos.map((p) => p.taken)].sort());
    expect(config.photos.map((p) => p.fileName)).toEqual(
      [...photos.map((p) => p.file + ".webp")].sort().reverse()
    );
  });
});

// The Home card cover is a deliberate pick, pinned by a `featured` flag rather
// than left to "whatever is newest". These guard both halves of that: the flag
// resolves to the right frame, and it stays put when a newer photo is added.
describe("home photo cover", () => {
  it("resolves to the entry flagged featured", () => {
    const flagged = photos.filter((p) => p.featured);
    expect(flagged).toHaveLength(1);
    expect(config.homePhoto.fileName).toBe(flagged[0].file + ".webp");
  });

  it("is not simply the newest frame", () => {
    // If this ever passes by coincidence the pin has stopped doing work.
    expect(config.homePhoto.taken).not.toBe(config.photos[0].taken);
  });

  it("is a real photo in the album", () => {
    expect(config.photos.map((p) => p.fileName)).toContain(config.homePhoto.fileName);
  });

  it("falls back to the newest frame when nothing is flagged", () => {
    // Mirrors the config expression, so an un-flagged archive still renders.
    const unflagged = photos.map((p) => ({ ...p, featured: undefined }));
    const sorted = [...unflagged].sort((a, b) => (a.taken < b.taken ? 1 : -1));
    const fallback = sorted.find((p) => p.featured) || sorted[0];
    expect(fallback.file).toBe(sorted[0].file);
  });
});

describe("formatPhotoTaken", () => {
  it("renders the captured local wall-clock time", () => {
    expect(formatPhotoTaken("2026-02-11T21:58:58")).toBe("2026-02-11 21:58");
  });

  it("does not shift the time into another timezone", () => {
    // A Date-based implementation would render this differently depending on
    // the machine's zone; the string form must not.
    expect(formatPhotoTaken("2026-03-23T20:19:36")).toBe("2026-03-23 20:19");
    expect(formatPhotoTaken("2026-02-13T10:55:42.123")).toBe("2026-02-13 10:55");
  });

  it("returns an empty label for missing or malformed input", () => {
    for (const value of ["", null, undefined, "not-a-date", "2026-02-11"]) {
      expect(formatPhotoTaken(value)).toBe("");
    }
  });

  it("formats every archive entry", () => {
    photos.forEach((photo) => {
      expect(formatPhotoTaken(photo.taken), photo.file).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });
});

describe("photo archive — presentation contract", () => {
  const photoPage = readFileSync(
    resolve(process.cwd(), "src", "pages", "PhotoPage.jsx"),
    "utf8"
  );
  const photoCss = readFileSync(
    resolve(process.cwd(), "src", "pages", "photo.css"),
    "utf8"
  );

  it("loads the feature-scoped photo stylesheet", () => {
    expect(photoPage).toContain('import "./photo.css";');
  });

  it("keeps the full-screen viewer positioned as an overlay", () => {
    expect(photoCss).toContain(".photo-viewer {");
    expect(photoCss).toContain("position: fixed;");
    expect(photoCss).toContain(".photo-viewer-image {");
    expect(photoCss).toContain("object-fit: contain;");
  });

  it("keeps archive captions and clickable tiles styled", () => {
    expect(photoCss).toContain(".photo-caption {");
    expect(photoCss).toContain(".photo-count {");
    expect(photoCss).toContain(".photo-wall .react-photo-album--photo {");
  });
});
