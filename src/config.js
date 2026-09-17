export const config = {
  discordId: import.meta.env.VITE_DISCORD_ID || "",
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
    "learning Japanese"
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
  mapAvatar: "/assets/map-avatar.png",
  socialLinks: [
    { label: "GH", name: "GitHub", href: "https://github.com/Musdkar" },
    { label: "VR", name: "VRChat", href: import.meta.env.VITE_VRCHAT_URL || "" },
    { label: "DC", name: "Discord", href: import.meta.env.VITE_DISCORD_URL || "" },
    { label: "@", name: "Contact", href: import.meta.env.VITE_CONTACT_URL || "" }
  ],
  photos: [
    {
      src: "/assets/vrchat.webp",
      width: 1600,
      height: 900,
      alt: "VRChat screenshot",
      title: "VRChat · 2026"
    }
  ],
  software: [
    {
      group: "Development",
      note: "things I build with",
      items: [
        { name: "VS Code", meta: "editor", icon: "visualstudiocode" },
        { name: "Ghostty", meta: "terminal", monogram: "GT" },
        { name: "GitHub", meta: "code + repos", icon: "github" }
      ]
    },
    {
      group: "AI",
      note: "thinking + coding",
      items: [
        { name: "ChatGPT", meta: "research + work", icon: "openai" },
        { name: "Claude Code", meta: "coding", icon: "anthropic" },
        { name: "Codex", meta: "coding agents", icon: "openai" }
      ]
    },
    {
      group: "VR",
      note: "social + PCVR",
      items: [
        { name: "VRChat", meta: "social VR", icon: "vrchat" },
        { name: "VRCX", meta: "VRChat companion", monogram: "VX" },
        { name: "Virtual Desktop", meta: "Quest streaming", monogram: "VD" }
      ]
    },
    {
      group: "Daily",
      note: "notes + utilities",
      items: [
        { name: "Obsidian", meta: "notes", icon: "obsidian" },
        { name: "Notion", meta: "workspace", icon: "notion" },
        { name: "Maccy", meta: "clipboard", monogram: "MC" }
      ]
    }
  ]
};
