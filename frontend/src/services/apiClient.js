import { fetchWithTimeout } from "@/utils/http";
import { API_URL } from "../config/api.js";

/**
 * Generate a client-side idempotency key for safe mutating requests.
 */
export function generateIdempotencyKey(prefix = "req") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Universal API Request Handler for EstateSync Frontend Services.
 * Automatically attaches JWT authentication, serializes query params and JSON bodies,
 * manages idempotency headers, and normalizes backend error structures.
 */
export async function apiRequest(endpoint, {
  method = "GET",
  body = null,
  params = null,
  idempotencyKey = null,
  headers = {}
} = {}) {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") : null;

  // Build query string if params supplied
  let urlPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (params && typeof params === "object") {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      urlPath += (urlPath.includes("?") ? "&" : "?") + queryString;
    }
  }

  const fullUrl = urlPath.startsWith("http") ? urlPath : `${API_URL}${urlPath}`;

  const requestHeaders = {
    ...headers
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Supply idempotency key for state-mutating requests if provided or auto-generated
  if (idempotencyKey) {
    requestHeaders["Idempotency-Key"] = idempotencyKey;
    requestHeaders["x-idempotency-key"] = idempotencyKey;
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: requestHeaders
  };

  if (body) {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetchWithTimeout(fullUrl, fetchOptions);
  } catch (networkErr) {
    const error = new Error(`Network connectivity error: ${networkErr.message}`);
    error.status = 0;
    error.code = "NETWORK_ERROR";
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error(`Server returned an invalid response (HTTP ${response.status}). Please try again.`);
    error.status = response.status;
    throw error;
  }

  // Handle account deactivation: immediately purge session and redirect to login
  if (response.status === 403 && data?.isDeactivated) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("user");
      sessionStorage.setItem(
        "authMessage",
        data.message || "Your account has been deactivated. Please contact your system administrator."
      );
      window.location.href = "/login";
    }
    throw Object.assign(new Error(data.message || 'Account deactivated'), { status: 403 });
  }

  // Handle token expiry: redirect to login instead of crashing
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("user");
      sessionStorage.setItem("authMessage", "Your session has expired. Please log in again.");
      window.location.href = "/login";
    }
    // Return a never-resolving promise so no downstream code runs after redirect
    throw Object.assign(new Error('Please sign in again'), { status: 401 });
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || `HTTP ${response.status}: Request failed`);
    error.status = response.status;
    error.code = data.code || `HTTP_${response.status}`;
    error.data = data;
    error.originalMessage = data.message;
    throw error;
  }

  return data;
}
