import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kakisewa",
    short_name: "kakisewa",
    description: "Tenancy CRM for Malaysian real estate agents",
    start_url: "/home",
    display: "standalone",
    background_color: "#1C1C1E",
    theme_color: "#FFFFFF",
    orientation: "portrait-primary",
    lang: "en-MY",
    categories: ["productivity", "business"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
