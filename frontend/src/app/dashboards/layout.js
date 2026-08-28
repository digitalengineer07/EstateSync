"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardsLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-indigo-200">Loading EstateSync Platform...</p>
      </div>
    );
  }

  const navItems = [
    { name: "Admin Hub", path: "/dashboards/admin", roles: ["ADMIN"] },
    { name: "Manager Hub", path: "/dashboards/manager", roles: ["ADMIN", "MANAGER"] },
    { name: "Accounting Hub", path: "/dashboards/accounting", roles: ["ADMIN", "ACCOUNTING"] },
    { name: "My Wallet & Expenses", path: "/dashboards/wallet", roles: ["ADMIN", "MANAGER", "SALES", "MARKETING", "ACCOUNTING", "OTHER"] },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col antialiased">
      {/* Premium Top Navbar */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border-b border-indigo-900/60 backdrop-blur-md">
        <div className="w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Logo & Navigation */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 w-full md:w-auto justify-between md:justify-start">
            <div 
              onClick={() => router.push("/dashboards/wallet")}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 p-0.5 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                <span className="text-white text-base font-black">🏢</span>
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                  Estate<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-300">Sync</span>
                </div>
                <div className="text-[10px] text-indigo-200/80 font-medium tracking-wider uppercase -mt-1">
                  Treasury & Accounting
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {visibleNav.map((nav) => {
                const isActive = pathname === nav.path;
                return (
                  <button
                    key={nav.path}
                    onClick={() => router.push(nav.path)}
                    className={`px-3.5 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-900/50 ring-1 ring-white/20 font-bold"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {nav.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 sm:gap-4 self-end md:self-auto">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/10 shadow-inner text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-400 to-teal-300 flex items-center justify-center text-slate-900 font-bold text-[11px] shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-left">
                <div className="font-bold text-white leading-tight">{user.name}</div>
                <div className="text-[10px] text-indigo-200 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
              title="Logout session"
            >
              <span>Logout</span>
              <span className="text-xs">➔</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Fluid Content Container (Maximized Width & Visibility) */}
      <main className="flex-grow w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
