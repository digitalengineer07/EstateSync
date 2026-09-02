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
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

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
    response = await fetch(fullUrl, fetchOptions);
  } catch (networkErr) {
    const error = new Error(`Network connectivity error: ${networkErr.message}`);
    error.status = 0;
    error.code = "NETWORK_ERROR";
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    data = { success: response.ok, message: response.statusText };
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
