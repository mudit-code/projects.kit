import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "projects.kit",
    name: "projects.kit",
    short_name: "projects.kit",
    description: "Academic Project Lifecycle & Evaluation Suite",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui", "fullscreen"],
    orientation: "portrait",
    background_color: "#F6F5F2",
    theme_color: "#0B2A6F",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "My Forms",
        short_name: "Forms",
        description: "Open available project registration forms",
        url: "/?tab=forms&source=pwa",
        icons: [{ src: "/icon-192.svg", sizes: "192x192" }],
      },
    ],
  };
}
