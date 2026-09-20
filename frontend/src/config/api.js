// API_URL is empty by default so all fetch() calls use relative paths (e.g. /api/v1/auth/login).
// The Next.js server proxy (/api/[...path]/route.js) forwards these to the backend server-to-server,
// bypassing browser CORS and Hostinger/Render WAF blocks entirely.
// To bypass the proxy and make direct calls, set NEXT_PUBLIC_DIRECT_API_URL.
export const API_URL = process.env.NEXT_PUBLIC_DIRECT_API_URL || "";

