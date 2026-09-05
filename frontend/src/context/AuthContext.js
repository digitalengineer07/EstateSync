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
      setUser(JSON.parse(storedUser));
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

      const data = await response.json();

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
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Network error" };
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
