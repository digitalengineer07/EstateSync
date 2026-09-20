import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: { "@": "./src" },
  },
  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, "@": path.join(__dirname, "src") };
    return config;
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
