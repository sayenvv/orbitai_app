import type { MetadataRoute } from "next";
import { visibleAppsCatalog } from "@orbit/clovai-apps";
import { chatConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = chatConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/welcome`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/apps`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/plans`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const appRoutes: MetadataRoute.Sitemap = visibleAppsCatalog.flatMap((app) => [
    {
      url: `${base}/apps/${app.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${base}/apps/${app.id}/help`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ]);

  return [...staticRoutes, ...appRoutes];
}
