import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./headers";

export function withSecurityHeaders(config: NextConfig): NextConfig {
  const isProd = process.env.NODE_ENV === "production";

  return {
    ...config,
    async headers() {
      const existing = config.headers ? await config.headers() : [];
      const securityHeaders = Object.entries(
        buildSecurityHeaders({ isProd, extraImgSrc: ["https://images.unsplash.com"] }),
      ).map(([key, value]) => ({ key, value }));

      return [
        ...existing,
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
      ];
    },
  };
}
