import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use pure JavaScript config so build environments without modern GLIBC (e.g. Hostinger shared hosting)
  // do not fail transpiling next.config.ts on-the-fly.
  reactStrictMode: false,
  poweredByHeader: false,
  compress: false,
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
    workerThreads: false,
  },
};

export default nextConfig;
