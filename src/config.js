export const config = {
  discordId: import.meta.env.VITE_DISCORD_ID || "",
  whatPulseHeatmapUrl: import.meta.env.VITE_WHATPULSE_HEATMAP_URL || "",
  whatPulseProfileUrl: import.meta.env.VITE_WHATPULSE_PROFILE_URL || "",
  city: "Wuhan",
  region: "Hubei",
  country: "China",
  lat: 30.5928,
  lng: 114.3055,
  timezone: "Asia/Shanghai",
  socials: [
    { label: "GH", title: "GitHub", href: "https://github.com/Musdkar" },
    { label: "VR", title: "VRChat", href: import.meta.env.VITE_VRCHAT_URL || "" },
    { label: "DC", title: "Discord", href: import.meta.env.VITE_DISCORD_URL || "" },
    { label: "@", title: "Contact", href: import.meta.env.VITE_CONTACT_URL || "" }
  ],
  photos: [
    {
      src: "https://ruoli-presence-live-mzi3pei9e-musdkar-6224.vercel.app/vrchat.webp",
      width: 3840,
      height: 2160,
      alt: "VRChat screenshot"
    }
  ]
};
