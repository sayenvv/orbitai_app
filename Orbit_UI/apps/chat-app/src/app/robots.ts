import type { MetadataRoute } from "next";
import { chatConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = chatConfig.url.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / authenticated surfaces should not be indexed.
      disallow: ["/c", "/c/", "/apps/*/workspace"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
