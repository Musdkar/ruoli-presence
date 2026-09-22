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
    { label: "@", name: "Contact", href: import.meta.env.VITE_CONTACT_URL || "" },
  ],
  photos: [
    {
      src: "/assets/vrchat.webp",
      width: 1600,
      height: 900,
      alt: "VRChat screenshot",
      title: "VRChat · 2026",
    },
  ],
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
