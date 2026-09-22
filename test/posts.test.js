import { describe, it, expect } from "vitest";
import { posts } from "../src/content/posts.js";

// The restored posts come from an old Typecho export. These assertions lock the
// migration decisions so a later edit cannot silently change the author's text,
// renumber slugs or republish a draft.
//
// Slugs are publication numbers, not the values from the archive: the first
// published post is "1", the second "2", and so on. They are written by hand in
// posts.js rather than derived from the date, so backfilling an older post later
// cannot shift the URLs of posts that are already published.

const published = posts.filter((p) => p.published !== false);

describe("posts — restored entries", () => {
  it("numbers published posts in publication order", () => {
    const byDate = [...published].sort((a, b) => (a.date < b.date ? -1 : 1));
    expect(byDate.map((p) => p.slug)).toEqual(["1", "2"]);
  });

  it("uses the Typecho created date", () => {
    const byslug = Object.fromEntries(published.map((p) => [p.slug, p]));
    expect(byslug["1"].date).toBe("2026-01-29");
    expect(byslug["2"].date).toBe("2026-02-02");
  });

  it("keeps the original titles", () => {
    const byslug = Object.fromEntries(published.map((p) => [p.slug, p]));
    expect(byslug["1"].title).toBe("对抗无聊");
    expect(byslug["2"].title).toBe("1");
  });

  it("leaves tags empty", () => {
    published.forEach((p) => expect(p.tags, p.slug).toEqual([]));
  });

  it("strips the markdown comment marker from the body", () => {
    posts.forEach((p) => expect(p.body, p.slug).not.toContain("<!--markdown-->"));
  });

  it("keeps the body text intact (spot checks against the source)", () => {
    const byslug = Object.fromEntries(published.map((p) => [p.slug, p]));
    // First and last visible lines of each restored post, verbatim.
    expect(byslug["1"].body).toContain("多接触日光，少接触能够快速大量产生多巴胺的活动");
    expect(byslug["1"].body).toContain("[IMDB TOP 250](http://www.imdb.com/chart/top)开始看电影");
    expect(byslug["1"].body.split("\n")).toHaveLength(8);
    expect(byslug["2"].body).toContain("1.  **1.30：** 2.74km");
    expect(byslug["2"].body).toContain("23. **3.10：** 3.17km");
    expect(byslug["2"].body.split("\n").filter(Boolean)).toHaveLength(23);
  });

  it("exposes exactly the expected slug set", () => {
    // Only these entries belong in the content model right now. Asserting the
    // exact set keeps anything else from being added without a deliberate edit.
    expect(posts.map((p) => p.slug).sort()).toEqual(["1", "2", "building-a-digital-presence"]);
  });
});

describe("posts — summaries", () => {
  // The 80-character rule applies to the posts restored from the Typecho
  // export. The pre-existing draft keeps its author-written summary.
  const restored = posts.filter((p) => p.slug === "1" || p.slug === "2");

  it("are at most 80 characters plus an ellipsis", () => {
    restored.forEach((p) => {
      expect(p.summary.length, p.slug).toBeLessThanOrEqual(81);
    });
  });

  it("append an ellipsis only when truncated", () => {
    restored.forEach((p) => {
      const truncated = p.summary.endsWith("…");
      expect(truncated, p.slug).toBe(p.summary.length === 81);
    });
  });

  it("contain no markdown structure markers", () => {
    restored.forEach((p) => {
      expect(p.summary, p.slug).not.toMatch(/^\s*[-*+]\s/);
      expect(p.summary, p.slug).not.toMatch(/#{1,6}\s/);
      expect(p.summary, p.slug).not.toContain("**");
    });
  });
});

describe("posts — draft handling", () => {
  it("keeps the pre-existing draft unpublished", () => {
    const draft = posts.find((p) => p.slug === "building-a-digital-presence");
    expect(draft).toBeDefined();
    expect(draft.published).toBe(false);
  });
});

describe("blog ordering", () => {
  // Mirrors the sort applied in BlogPage: newest date first.
  const byNewest = (list) =>
    list
      .filter((p) => p.published !== false)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  it("lists published posts newest first", () => {
    const ordered = byNewest(posts).map((p) => p.date);
    expect(ordered).toEqual([...ordered].sort().reverse());
  });

  it("puts a newer post ahead of an older one", () => {
    const ordered = byNewest(posts);
    expect(ordered[0].date >= ordered[ordered.length - 1].date).toBe(true);
  });

  it("excludes drafts from the ordering", () => {
    expect(byNewest(posts).every((p) => p.published !== false)).toBe(true);
  });

  it("is stable for equal dates", () => {
    const a = { slug: "a", date: "2026-01-01", published: true };
    const b = { slug: "b", date: "2026-01-01", published: true };
    expect(byNewest([a, b]).map((p) => p.slug)).toEqual(["a", "b"]);
  });
});
