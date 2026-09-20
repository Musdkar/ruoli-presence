import { describe, it, expect } from "vitest";
import { metadataFor, SITE_URL } from "../src/lib/seo.js";

const POSTS = [
  { slug: "published-post", title: "A published post", summary: "Summary here.", published: true },
  { slug: "draft-post", title: "A draft post", summary: "Hidden.", published: false },
];

describe("metadataFor — routes", () => {
  it("home", () => {
    expect(metadataFor("/").title).toBe("ruoli — presence");
    expect(metadataFor("/").path).toBe("/");
  });

  it("blog index", () => {
    expect(metadataFor("/blog").title).toBe("ruoli — notes");
  });

  it("photo (and the /photos alias)", () => {
    expect(metadataFor("/photo").title).toBe("ruoli — photo");
    expect(metadataFor("/photos").path).toBe("/photo");
  });

  it("uses", () => {
    expect(metadataFor("/uses").title).toBe("ruoli — uses");
  });

  it("published blog post uses the post title and summary", () => {
    const meta = metadataFor("/blog/published-post", { posts: POSTS });
    expect(meta.title).toBe("A published post — ruoli");
    expect(meta.description).toBe("Summary here.");
    expect(meta.path).toBe("/blog/published-post");
  });

  it("draft or unknown slug falls back to a not-found title", () => {
    expect(metadataFor("/blog/draft-post", { posts: POSTS }).title).toBe("Post not found — ruoli");
    expect(metadataFor("/blog/nope", { posts: POSTS }).title).toBe("Post not found — ruoli");
  });

  it("unknown routes get a not-found title", () => {
    expect(metadataFor("/totally-unknown").title).toBe("Not found — ruoli");
  });

  it("tolerates a missing pathname", () => {
    expect(metadataFor(undefined).title).toBe("ruoli — presence");
  });

  it("every result carries a description and a path", () => {
    for (const p of ["/", "/blog", "/photo", "/uses", "/nope", "/blog/x"]) {
      const meta = metadataFor(p, { posts: POSTS });
      expect(meta.description, p).toBeTruthy();
      expect(meta.path.startsWith("/"), p).toBe(true);
    }
  });
});

describe("SITE_URL", () => {
  it("has no trailing slash so canonical joins stay clean", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });
});
