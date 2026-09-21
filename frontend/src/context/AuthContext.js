"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { API_URL } from "@/config/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // On mount, check if there's a token (in a real app, you'd check HttpOnly cookies or validate with backend)
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.email === "manager@estatesync.local" && (parsed?.name === "Sales Manager" || !parsed?.name)) {
          parsed.name = "Operations Manager";
          localStorage.setItem("user", JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (e) {
        // We suppress the error log here because Next.js dev server 
        // intercepts console.error and shows an overlay even for caught errors.
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
      }
    }
    setLoading(false);

    // Prevent mouse wheel from inadvertently changing values in number inputs while scrolling
    const handleWheel = () => {
      if (document.activeElement?.tagName === "INPUT" && document.activeElement?.type === "number") {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error("[AuthContext] JSON parse error:", jsonErr);
        return { 
          success: false, 
          message: `Server returned invalid response (HTTP ${response.status}). Please check backend status.` 
        };
      }

      if (data.success) {
        setUser(data.user);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirect based on role
        if (data.user.role === "ADMIN") {
          router.push("/dashboards/admin");
        } else if (data.user.role === "MANAGER") {
          router.push("/dashboards/manager");
        } else if (data.user.role === "ACCOUNTING") {
          router.push("/dashboards/accounting");
        } else {
          router.push("/dashboards/wallet");
        }
        return { success: true };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      console.error("[AuthContext] Fetch network error:", error);
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const hint = isLocal 
        ? "Cannot connect to local backend (http://localhost:4000). Please ensure your backend is running ('npm start' in backend directory)."
        : "Cannot connect to backend server. Please verify backend status or network connection.";
      return { success: false, message: error.message === "Failed to fetch" ? hint : (error.message || "Network error") };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const logoutWithMessage = (message = "You have been logged out.") => {
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    sessionStorage.setItem("authMessage", message);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutWithMessage }}>
      {children}
    </AuthContext.Provider>
  );
};
