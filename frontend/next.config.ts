import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix Next.js monorepo workspace root warning on Render
  outputFileTracingRoot: path.join(__dirname, "../"),

  async rewrites() {
    // Proxy all /api/... requests to the backend server to bypass CORS completely
    // This runs server-side on Render, so no browser CORS preflight is triggered
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const baseUrl = backendUrl.replace(/\/+$/, "");
    console.log(`[Next.js Proxy] Routing /api/* → ${baseUrl}/api/*`);
    return [
      {
        source: '/api/:path*',
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
