import { photos, photoSrc } from "./data/photos";

// The archive is stored newest-last in src/data/photos.js; the album and the
// Home card both read it newest-first, and `config.photos[0]` is the latest
// frame. Sorting a copy keeps the authored file order intact.
const archivePhotos = photos
  .map((photo) => ({
    src: photoSrc(photo),
    fileName: photo.file + ".webp",
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    taken: photo.taken,
  }))
  .sort((a, b) => (a.taken < b.taken ? 1 : a.taken > b.taken ? -1 : 0));

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
    { label: "GH", name: "GitHub", href: "https://github.com/Musdkar" },
    { label: "VR", name: "VRChat", href: import.meta.env.VITE_VRCHAT_URL || "" },
    { label: "DC", name: "Discord", href: import.meta.env.VITE_DISCORD_URL || "" },
    // In-app contact page; the address lives there Base64-encoded.
    { label: "@", name: "Contact", href: "/email" },
  ],
  // Newest first. Home shows photos[0]; Photo renders the whole list.
  photos: archivePhotos,
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
