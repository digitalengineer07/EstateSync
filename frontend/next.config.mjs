/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use pure JavaScript config so build environments without modern GLIBC (e.g. Hostinger shared hosting)
  // do not fail transpiling next.config.ts on-the-fly.
  reactStrictMode: true,
};

export default nextConfig;
