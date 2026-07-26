import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/tableau-de-bord", "/pouri", "/api", "/auth", "/bienvenue"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
