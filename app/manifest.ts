import type { MetadataRoute } from "next";

// Lets people add the app to their home screen, which iPhones require before
// they allow phone notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Collect Savar",
    short_name: "Savar",
    description: "Capture the stray cats and dogs you spot, and help the ones that need it.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
