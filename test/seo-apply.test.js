import { describe, it, expect } from "vitest";
import { applyMetadata } from "../src/lib/seo.js";

// A minimal fake document — just enough DOM surface for applyMetadata. Keeps
// this test dependency-free (no jsdom) while still exercising the real code.
function fakeDoc() {
  const head = { children: [] };
  const makeEl = (tag) => ({
    tag,
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k] in this.attrs ? this.attrs[k] : null;
    },
  });
  return {
    title: "",
    head,
    createElement: makeEl,
  };
}
// Attach the small query surface applyMetadata uses.
function withHead(doc) {
  doc.head.querySelector = (selector) => {
    const m = /^meta\[(name|property)="(.+)"\]$/.exec(selector);
    if (!m) {
      if (selector === 'link[rel="canonical"]') {
        return (
          doc.head.children.find((el) => el.tag === "link" && el.attrs.rel === "canonical") || null
        );
      }
      return null;
    }
    const [, key, value] = m;
    return doc.head.children.find((el) => el.tag === "meta" && el.attrs[key] === value) || null;
  };
  doc.head.appendChild = (el) => {
    doc.head.children.push(el);
    return el;
  };
  return doc;
}
const tag = (doc, key, value) =>
  doc.head.children.find((el) => el.tag === "meta" && el.attrs[key] === value);

describe("applyMetadata — robots meta", () => {
  it("writes noindex for a not-found view", () => {
    const doc = withHead(fakeDoc());
    applyMetadata({ title: "Not found — ruoli", description: "x", path: "/", noindex: true }, doc);
    expect(tag(doc, "name", "robots").attrs.content).toBe("noindex,follow");
  });

  it("writes index,follow for a normal view", () => {
    const doc = withHead(fakeDoc());
    applyMetadata({ title: "ruoli — presence", description: "x", path: "/" }, doc);
    expect(tag(doc, "name", "robots").attrs.content).toBe("index,follow");
  });

  it("clears a stale noindex after navigating to a normal page", () => {
    const doc = withHead(fakeDoc());
    applyMetadata({ title: "Not found — ruoli", description: "x", path: "/", noindex: true }, doc);
    expect(tag(doc, "name", "robots").attrs.content).toBe("noindex,follow");
    applyMetadata({ title: "ruoli — uses", description: "y", path: "/uses" }, doc);
    expect(tag(doc, "name", "robots").attrs.content).toBe("index,follow");
  });

  it("sets canonical and og:url from SITE_URL", () => {
    const doc = withHead(fakeDoc());
    applyMetadata({ title: "ruoli — uses", description: "y", path: "/uses" }, doc);
    const canonical = doc.head.children.find((el) => el.tag === "link");
    expect(canonical.attrs.href).toBe("https://kalieri.com/uses");
    expect(tag(doc, "property", "og:url").attrs.content).toBe("https://kalieri.com/uses");
  });
});
