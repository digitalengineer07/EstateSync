/**
 * Global API URL configuration.
 *
 * In production (when accessed via estatesync.devoxa.in or non-local host),
 * requests go directly to the live Hostinger backend API:
 * https://lightcoral-turtle-931044.hostingersite.com
 *
 * This completely avoids the Next.js server double-hop proxy on Hostinger,
 * which was causing LiteSpeed 405 Not Allowed errors and process limit exhaustion.
 *
 * In local development (localhost / 127.0.0.1), requests target http://localhost:4000.
 */

const PRODUCTION_BACKEND_URL = "https://lightcoral-turtle-931044.hostingersite.com";

const getApiUrl = () => {
  // If explicitly configured to a custom remote URL, use that
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PUBLIC_API_URL !== "http://localhost:4000" &&
    process.env.NEXT_PUBLIC_API_URL !== ""
  ) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // Client-side detection (browser)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
    if (isLocal) {
      return (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "http://localhost:4000";
    }
    return PRODUCTION_BACKEND_URL;
  }

  // Server-side (Next.js SSR)
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return PRODUCTION_BACKEND_URL;
  }

  return "http://localhost:4000";
};

export const API_URL = getApiUrl();

