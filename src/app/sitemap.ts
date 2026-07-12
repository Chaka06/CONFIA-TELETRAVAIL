import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  const publicRoutes = [
    { path: "/", priority: 1 },
    { path: "/paniers", priority: 0.9 },
    { path: "/inscription", priority: 0.8 },
    { path: "/connexion", priority: 0.5 },
    { path: "/conditions-utilisation", priority: 0.2 },
    { path: "/politique-de-confidentialite", priority: 0.2 },
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    priority: route.priority,
  }));
}
