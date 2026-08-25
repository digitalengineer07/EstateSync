"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardsLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-6">
            <div className="text-xl font-bold tracking-tight">EstateSync</div>
            <nav className="flex items-center space-x-2 text-sm">
              {user.role === "ADMIN" && (
                <button
                  onClick={() => router.push("/dashboards/admin")}
                  className="px-3 py-1.5 rounded-md hover:bg-indigo-600 font-medium transition"
                >
                  Admin Hub
                </button>
              )}
              {["ADMIN", "MANAGER"].includes(user.role) && (
                <button
                  onClick={() => router.push("/dashboards/manager")}
                  className="px-3 py-1.5 rounded-md hover:bg-indigo-600 font-medium transition"
                >
                  Manager Hub
                </button>
              )}
              {["ADMIN", "ACCOUNTING"].includes(user.role) && (
                <button
                  onClick={() => router.push("/dashboards/accounting")}
                  className="px-3 py-1.5 rounded-md hover:bg-indigo-600 font-medium transition"
                >
                  Accounting Hub
                </button>
              )}
              <button
                onClick={() => router.push("/dashboards/wallet")}
                className="px-3 py-1.5 rounded-md hover:bg-indigo-600 font-medium transition"
              >
                My Wallet & Expenses
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-semibold">{user.name}</span>{" "}
              <span className="text-indigo-200 text-xs font-mono bg-indigo-800/60 px-2 py-0.5 rounded">
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="bg-indigo-800 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
