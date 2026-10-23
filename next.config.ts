import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off: almost every screen is per-user and loads its
  // data in the browser through Supabase, so there is little to prerender.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
