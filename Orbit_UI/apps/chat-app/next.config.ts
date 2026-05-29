import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.16"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@orbit/ui", "@orbit/types"],
};

export default nextConfig;
