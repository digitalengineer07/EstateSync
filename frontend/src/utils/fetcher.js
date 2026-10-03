import { API_URL } from "@/config/api";

export const fetcher = async (url) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem("accessToken") : null;
  
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(fullUrl, {
    method: "GET",
    headers,
  });

  const data = await res.json();
  
  // Handle account deactivation: immediately purge session and redirect to login
  if (res.status === 403 && data?.isDeactivated) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("user");
      sessionStorage.setItem(
        "authMessage",
        data.message || "Your account has been deactivated. Please contact your system administrator."
      );
      window.location.href = "/login";
    }
    return new Promise(() => {});
  }

  // Handle token expiry: redirect to login instead of crashing
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("user");
      sessionStorage.setItem("authMessage", "Your session has expired. Please log in again.");
      window.location.href = "/login";
    }
    return new Promise(() => {});
  }

  if (!res.ok || data.success === false) {
    const error = new Error(data.message || "An error occurred while fetching the data.");
    error.status = res.status;
    throw error;
  }
  
  return data;
};
