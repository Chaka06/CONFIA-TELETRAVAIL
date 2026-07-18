import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // www.confssa.com et confssa.com servaient tous les deux un 200
        // identique sans redirection entre les deux — contenu dupliqué aux
        // yeux de Google (Search Console le signale comme "canonique non
        // sélectionné par l'utilisateur"). confssa.com (sans www) est le
        // domaine canonique utilisé partout ailleurs (métadonnées,
        // sitemap, liens envoyés par e-mail) : www redirige définitivement
        // vers lui, chemin et paramètres conservés.
        source: "/:path*",
        has: [{ type: "host", value: "www.confssa.com" }],
        destination: "https://confssa.com/:path*",
        permanent: true,
      },
    ];
  },
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
