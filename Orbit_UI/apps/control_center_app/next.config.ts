import type { NextConfig } from "next";
import path from "path";
import { withSecurityHeaders } from "@orbit/security/next-config";

const nextConfig: NextConfig = withSecurityHeaders({
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@orbit/ui", "@orbit/security"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
});

export default nextConfig;
