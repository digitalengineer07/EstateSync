"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Building2, ShieldCheck, Layers, Landmark, Wallet, LogOut, Users } from "lucide-react";
import { hasPermission, hasAnyPermission } from "@/utils/permissions";

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Loading EstateSync Platform...</p>
      </div>
    );
  }

  const navItems = [
    { 
      name: "Admin Hub", 
      path: "/dashboards/admin", 
      visible: user.role === "ADMIN", 
      icon: ShieldCheck 
    },
    { 
      name: "Manager Hub", 
      path: "/dashboards/manager", 
      visible: ["ADMIN", "MANAGER"].includes(user.role), 
      icon: Layers 
    },
    { 
      name: "Accounting Hub", 
      path: "/dashboards/accounting", 
      visible: ["ADMIN", "ACCOUNTING"].includes(user.role), 
      icon: Landmark 
    },
    { 
      name: "Employees", 
      path: "/dashboards/employees", 
      visible: hasPermission(user, "employee.view"), 
      icon: Users 
    },
    { 
      name: "My Wallet & Expenses", 
      path: "/dashboards/wallet", 
      visible: true, 
      icon: Wallet 
    },
  ];

  const visibleNav = navItems.filter(item => item.visible);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased">
      {/* Floating Island Header with Rounded Edges */}
      <div className="sticky top-0 z-40 pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 w-full pointer-events-none">
        <header className="pointer-events-auto w-full max-w-[1800px] mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-[22px] shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06)] px-4 sm:px-6 py-2.5 transition-all">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Left: Brand Logo & Navigation */}
            <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-start">
              <div 
                onClick={() => router.push("/dashboards/wallet")}
                className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-0.5 leading-none">
                    Estate<span className="text-indigo-600 font-extrabold">Sync</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                    Treasury & Accounting
                  </span>
                </div>
              </div>

              {/* Subtle vertical divider */}
              <div className="hidden lg:block h-6 w-px bg-slate-200/80"></div>

              {/* Navigation Tabs */}
              <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs font-semibold">
                {visibleNav.map((nav) => {
                  const isActive = pathname === nav.path;
                  const Icon = nav.icon;
                  return (
                    <button
                      key={nav.path}
                      onClick={() => router.push(nav.path)}
                      className={`px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap text-xs ${
                        isActive
                          ? "bg-slate-900 text-white font-bold shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>{nav.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right: User Profile Chip & Logout */}
            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
              <div className="flex items-center gap-2.5 bg-slate-50/80 px-3 py-1 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shadow-2xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 text-xs leading-none">{user.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{user.role}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                title="Logout session"
              >
                <span>Logout</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </header>
      </div>

      {/* Main Fluid Content Container */}
      <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {children}
      </main>
    </div>
  );
}
