import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  const publicRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/paniers", priority: 0.9, changeFrequency: "hourly" },
    { path: "/inscription", priority: 0.8, changeFrequency: "monthly" },
    { path: "/connexion", priority: 0.5, changeFrequency: "monthly" },
    { path: "/mot-de-passe-oublie", priority: 0.2, changeFrequency: "yearly" },
    { path: "/conditions-utilisation", priority: 0.2, changeFrequency: "yearly" },
    { path: "/politique-de-confidentialite", priority: 0.2, changeFrequency: "yearly" },
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    priority: route.priority,
    changeFrequency: route.changeFrequency,
  }));
}
