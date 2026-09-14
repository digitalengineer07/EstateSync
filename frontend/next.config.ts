import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix Next.js monorepo workspace root warning on Render
  outputFileTracingRoot: path.join(__dirname, "../"),
};

export default nextConfig;
