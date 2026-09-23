import { photos, photoSrc } from "./data/photos";

// The archive is stored newest-last in src/data/photos.js; the album reads it
// newest-first, and `homePhoto` is the cover the Home card shows. Sorting a
// copy keeps the authored file order intact.
const archivePhotos = photos
  .map((photo) => ({
    src: photoSrc(photo),
    fileName: photo.file + ".webp",
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    taken: photo.taken,
    featured: Boolean(photo.featured),
  }))
  .sort((a, b) => (a.taken < b.taken ? 1 : a.taken > b.taken ? -1 : 0));

// Cover for the Home card: the entry flagged `featured`, falling back to the
// newest frame if nothing is flagged. Pinning it this way means adding a later
// photo does not silently change the Home page.
const homePhoto = archivePhotos.find((photo) => photo.featured) || archivePhotos[0] || null;

export const config = {
  // No Discord id here: presence is proxied by /api/presence using the
  // server-side LANYARD_USER_ID, so nothing about it belongs in the bundle.
  whatPulseHeatmapUrl: import.meta.env.VITE_WHATPULSE_HEATMAP_URL || "",
  whatPulseProfileUrl: import.meta.env.VITE_WHATPULSE_PROFILE_URL || "",
  name: "Kalieri",
  nameJa: "カリエリ",
  greeting: "Haiii!",
  about: "A student learning computer science and engineering.",
  tagline: "mostly online.",
  funFacts: [
    "19 years old",
    "MBTI: INTJ-A",
    "amateur VRChat dancer, mostly chatting on desktop",
    "learning Japanese",
  ],
  city: "Wuhan",
  region: "Hubei",
  country: "China",
  lat: 30.5928,
  lng: 114.3055,
  weatherLat: 30.537,
  weatherLng: 114.361,
  timezone: "Asia/Shanghai",
  avatar: "/assets/avatar.webp",
  mapAvatar: "/assets/map-avatar.webp",
  fitness: { stepGoal: 6000 },
  socialLinks: [
    { label: "GH", icon: "github", name: "GitHub", href: "https://github.com/Musdkar" },
    { label: "VR", icon: "vrchat", name: "VRChat", href: import.meta.env.VITE_VRCHAT_URL || "" },
    // Telegram. The invite URL is not configured yet, so this renders as
    // "not linked" until VITE_TELEGRAM_URL is set.
    {
      label: "TG",
      icon: "telegram",
      name: "Telegram",
      href: import.meta.env.VITE_TELEGRAM_URL || "",
    },
    // In-app contact page; the address lives there Base64-encoded.
    { label: "@", icon: "mail", name: "Contact", href: "/email" },
  ],
  // Newest first. Home shows the featured frame; Photo renders the whole list.
  photos: archivePhotos,
  homePhoto,
  software: [
    {
      group: "Development",
      note: "things I build with",
      items: [
        { name: "VS Code", meta: "editor", icon: "vscode.png" },
        { name: "PyCharm", meta: "Python IDE", icon: "pycharm.png" },
        { name: "Ghostty", meta: "terminal", icon: "ghostty.png" },
        { name: "Git", meta: "version control", icon: "git.png" },
      ],
    },
    {
      group: "AI",
      note: "thinking + coding",
      items: [
        { name: "ChatGPT", meta: "research + work", icon: "chatgpt.png" },
        { name: "Claude Code", meta: "coding", icon: "claude.png" },
      ],
    },
    {
      group: "VR",
      note: "social + PCVR",
      items: [
        { name: "VRChat", meta: "social VR", icon: "vrchat.png" },
        { name: "VRCX", meta: "VRChat companion", icon: "vrcx.png" },
        { name: "Virtual Desktop", meta: "Quest streaming", icon: "virtualdesktop.png" },
      ],
    },
    {
      group: "Daily",
      note: "notes + utilities",
      items: [
        { name: "Obsidian", meta: "notes", icon: "obsidian.png" },
        { name: "Notion", meta: "workspace", icon: "notion.png" },
        { name: "Microsoft Edge", meta: "browser", icon: "edge.png" },
        { name: "MarkEdit", meta: "Markdown", icon: "markedit.png" },
        { name: "Maccy", meta: "clipboard", icon: "maccy.png" },
      ],
    },
  ],
};
