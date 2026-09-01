import { API_URL } from "@/config/api";

export const fetcher = async (url) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem("accessToken") : null;
  
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
  
  if (!res.ok || data.success === false) {
    const error = new Error(data.message || "An error occurred while fetching the data.");
    error.status = res.status;
    throw error;
  }
  
  return data;
};
