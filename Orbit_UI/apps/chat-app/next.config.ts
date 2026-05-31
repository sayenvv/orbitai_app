import type { NextConfig } from "next";
import path from "path";

const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.16", "172.20.10.2"],
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
  },
  transpilePackages: ["@orbit/ui", "@orbit/types"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxy}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
