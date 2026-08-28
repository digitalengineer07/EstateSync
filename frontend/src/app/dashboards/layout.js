"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Building2, ShieldCheck, Layers, Landmark, Wallet, LogOut, ArrowUpRight } from "lucide-react";

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
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Loading EstateSync Platform...</p>
      </div>
    );
  }

  const navItems = [
    { name: "Admin Hub", path: "/dashboards/admin", roles: ["ADMIN"], icon: ShieldCheck },
    { name: "Manager Hub", path: "/dashboards/manager", roles: ["ADMIN", "MANAGER"], icon: Layers },
    { name: "Accounting Hub", path: "/dashboards/accounting", roles: ["ADMIN", "ACCOUNTING"], icon: Landmark },
    { name: "My Wallet & Expenses", path: "/dashboards/wallet", roles: ["ADMIN", "MANAGER", "SALES", "MARKETING", "ACCOUNTING", "OTHER"], icon: Wallet },
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col antialiased">
      {/* Top Enterprise Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800/80 shadow-md">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Brand Logo & Navigation */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 w-full md:w-auto justify-between md:justify-start">
            <div 
              onClick={() => router.push("/dashboards/wallet")}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-inner group-hover:bg-indigo-500 transition">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1 leading-none">
                  Estate<span className="text-indigo-400 font-extrabold">Sync</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
                  Accounting & Treasury
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 text-xs font-semibold">
              {visibleNav.map((nav) => {
                const isActive = pathname === nav.path;
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.path}
                    onClick={() => router.push(nav.path)}
                    className={`px-3.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 ${
                      isActive
                        ? "bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>{nav.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-[11px]">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-200 text-xs leading-none">{user.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Logout session"
            >
              <span>Logout</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Fluid Content Container */}
      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
