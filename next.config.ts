import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aucune page de ce site n'a besoin d'être affichée dans une iframe :
        // interdiction totale, pour empêcher un clickjacking (piéger un
        // utilisateur connecté pour lui faire cliquer "Rejoindre" à son insu
        // via une iframe invisible sur un site tiers).
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
