import type { MetadataRoute } from "next";

// PWA manifest — installable, standalone, dark-primary (handoff/HANDOFF.md · PWA notes).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chief",
    short_name: "Chief",
    description: "A chief of staff in your pocket. Chief proposes; you approve.",
    start_url: "/",
    display: "standalone",
    background_color: "#131513",
    theme_color: "#131513",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Full-bleed background, monogram inside the safe zone — same art works maskable.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
