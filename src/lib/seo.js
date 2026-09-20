// Lightweight per-route document metadata.
//
// This is a client-side SPA: titles/descriptions are updated after React mounts,
// which improves the browser tab, history entries and any crawler that executes
// JS. It is NOT a substitute for server-side rendering or static generation, and
// social scrapers (which do not run JS) still see the static index.html tags.

export const SITE_URL = "https://kalieri.com";
export const OG_IMAGE_URL = SITE_URL + "/assets/avatar.webp";
export const SITE_NAME = "ruoli";
export const DEFAULT_DESCRIPTION =
  "The live presence of Kalieri — a personal homepage for status, weather, music, photos, notes and the software behind them.";

// Resolve the metadata for a pathname. Pure and synchronous so it can be unit
// tested without a DOM.
export function metadataFor(pathname, { posts = [] } = {}) {
  const path = pathname || "/";

  if (path === "/") {
    return { title: "ruoli — presence", description: DEFAULT_DESCRIPTION, path: "/" };
  }
  if (path === "/blog") {
    return {
      title: "ruoli — notes",
      description: "Longer notes on software, security, VR and experiments.",
      path: "/blog",
    };
  }
  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length);
    const post = posts.find((item) => item.slug === slug && item.published !== false);
    if (post) {
      return {
        title: post.title + " — ruoli",
        description: post.summary || DEFAULT_DESCRIPTION,
        path: "/blog/" + post.slug,
      };
    }
    return {
      title: "Post not found — ruoli",
      description: DEFAULT_DESCRIPTION,
      path: "/blog",
      noindex: true,
    };
  }
  if (path === "/photo" || path === "/photos") {
    return { title: "ruoli — photo", description: "A visual archive of moments.", path: "/photo" };
  }
  if (path === "/uses") {
    return {
      title: "ruoli — uses",
      description: "The software and tools behind the screen time.",
      path: "/uses",
    };
  }
  return {
    title: "Not found — ruoli",
    description: DEFAULT_DESCRIPTION,
    path: "/",
    noindex: true,
  };
}

// Apply resolved metadata to the live document. Kept separate from the pure
// resolver so tests never need a DOM.
export function applyMetadata(meta, doc = document) {
  if (!meta) return;
  doc.title = meta.title;

  const ensure = (selector, create) => {
    let el = doc.head.querySelector(selector);
    if (!el) {
      el = create();
      doc.head.appendChild(el);
    }
    return el;
  };
  const metaTag = (name) =>
    ensure(`meta[name="${name}"]`, () => {
      const el = doc.createElement("meta");
      el.setAttribute("name", name);
      return el;
    });
  const ogTag = (property) =>
    ensure(`meta[property="${property}"]`, () => {
      const el = doc.createElement("meta");
      el.setAttribute("property", property);
      return el;
    });

  metaTag("description").setAttribute("content", meta.description);
  // Not-found views must not be indexed; normal pages explicitly restore
  // index,follow so navigating away from a 404 does not leave a stale noindex.
  metaTag("robots").setAttribute("content", meta.noindex ? "noindex,follow" : "index,follow");
  ogTag("og:title").setAttribute("content", meta.title);
  ogTag("og:description").setAttribute("content", meta.description);
  ogTag("og:url").setAttribute("content", SITE_URL + meta.path);
  ogTag("og:image").setAttribute("content", OG_IMAGE_URL);

  const canonical = ensure('link[rel="canonical"]', () => {
    const el = doc.createElement("link");
    el.setAttribute("rel", "canonical");
    return el;
  });
  canonical.setAttribute("href", SITE_URL + meta.path);
}
