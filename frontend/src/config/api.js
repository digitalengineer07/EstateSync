// API_URL must be empty so all fetch() calls use relative paths like /api/v1/auth/login
// The Next.js server proxy (next.config.ts rewrites) then forwards these to the real backend.
// DO NOT set this to the backend URL - that would bypass the proxy and cause CORS errors!
export const API_URL = "";
