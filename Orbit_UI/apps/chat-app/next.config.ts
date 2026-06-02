import type { NextConfig } from "next";
import path from "path";
import { withSecurityHeaders } from "@orbit/security/next-config";
import { buildAllowedDevOrigins } from "../../scripts/allowed-dev-origins";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = withSecurityHeaders({
  devIndicators: false,
  allowedDevOrigins: buildAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
    resolveAlias: {
      konva: "./apps/chat-app/node_modules/konva",
    },
  },
  transpilePackages: ["@orbit/ui", "@orbit/types", "@orbit/clovai-apps", "@orbit/security"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxy}/api/:path*`,
      },
    ];
  },
});

export default nextConfig;
