"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardProvider } from "@/context/DashboardContext";
import { hasPermission } from "@/utils/permissions";
import {
  Building2,
  ShieldCheck,
  Layers,
  Landmark,
  Wallet,
  Users,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Check,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Sparkles,
} from "lucide-react";

function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Dropdowns & Modals State
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'settings' | 'help' | null

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Corporate Treasury Disbursement",
      desc: "Monthly payroll batch recorded and balanced with bank statement.",
      time: "12m ago",
      unread: true,
      category: "Treasury",
    },
    {
      id: 2,
      title: "Customer Collection Received",
      desc: "₹12,50,000 received for Palm Residency Plot #42 (UTR: HDFC882910).",
      time: "1h ago",
      unread: true,
      category: "Collections",
    },
    {
      id: 3,
      title: "Accounting Period Active",
      desc: "September 2026 reconciliation cycle open for entry submission.",
      time: "3h ago",
      unread: true,
      category: "Period",
    },
  ]);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userRole = (typeof user?.role === "object" ? user?.role?.name : user?.role) || "";
  const isAdmin = userRole === "ADMIN";

  // Role display details matching screenshot
  const roleDisplay = useMemo(() => {
    if (userRole === "ACCOUNTING") return { title: "Accounting Officer", dept: "Treasury & Accounting" };
    if (userRole === "MANAGER" || user?.email === "manager@estatesync.local") return { title: "Operations Manager", dept: "Operations & Management" };
    if (userRole === "SALES") return { title: "Sales Specialist", dept: "Sales & Client Growth" };
    if (userRole === "MARKETING") return { title: "Marketing Specialist", dept: "Marketing & Campaigns" };
    if (userRole === "ADMIN") return { title: "System Administrator", dept: "Enterprise Governance" };
    return { title: user?.name || "Accounting Officer", dept: "AG Homes" };
  }, [userRole, user]);

  // Available primary hubs
  const hubItems = [
    {
      name: "Admin Hub",
      path: "/dashboards/admin",
      visible: isAdmin,
      icon: ShieldCheck,
      desc: "System governance & treasury audits",
    },
    {
      name: "Operations Hub",
      path: "/dashboards/manager",
      visible: ["ADMIN", "MANAGER"].includes(userRole),
      icon: Layers,
      desc: "Approvals & team operations",
    },
    {
      name: "Accounting Hub",
      path: "/dashboards/accounting",
      visible: ["ADMIN", "ACCOUNTING"].includes(userRole),
      icon: Landmark,
      desc: "Treasury, ledger & collections",
    },
    {
      name: "Employees",
      path: "/dashboards/employees",
      visible: hasPermission(user, "employee.view"),
      icon: Users,
      desc: "Staff directory & payroll governance",
    },
    {
      name: isAdmin
        ? "Approvals & Expenses"
        : userRole === "SALES"
        ? "Sales Panel"
        : userRole === "MARKETING"
        ? "Marketing Panel"
        : userRole === "MANAGER"
        ? "Operations Wallet"
        : "My Wallet & Expenses",
      path: "/dashboards/wallet",
      visible: true,
      icon: ["SALES", "MARKETING"].includes(userRole) ? Users : Wallet,
      desc: "Personal wallet, bookings & expense claims",
    },
  ];

  const visibleHubs = hubItems.filter((item) => item.visible);
  const currentHub = visibleHubs.find((h) => h.path === pathname) || visibleHubs[0];
  const HubIcon = currentHub?.icon || Landmark;

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      {/* FLOATING TOP NAVBAR */}
      <div className="sticky top-0 z-40 pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 w-full pointer-events-none">
        <header className="pointer-events-auto w-full max-w-[1800px] mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-[22px] shadow-[0_4px_24px_-6px_rgba(0,0,0,0.06)] px-3.5 sm:px-6 py-2 transition-all">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* LEFT: BRAND LOGO & PRIMARY HUB NAVIGATION */}
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div
                onClick={() => router.push("/dashboards/accounting")}
                className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
                title="EstateSync Platform"
              >
                <div className="w-8 h-8 rounded-xl bg-[#ff6b12] flex items-center justify-center text-white shadow-xs group-hover:bg-[#e05a0b] transition">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-0.5 leading-none">
                    Estate<span className="text-[#ff6b12] font-black">Sync</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                    {roleDisplay.dept}
                  </span>
                </div>
              </div>

              {/* Vertical subtle divider */}
              <div className="hidden md:block h-6 w-px bg-slate-200/80 shrink-0"></div>

              {/* Primary Hub Navigation Tabs (Aligned on Left Hand Side) */}
              <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {visibleHubs.map((hub) => {
                  const Icon = hub.icon;
                  const isActive = hub.path === pathname;
                  return (
                    <button
                      key={hub.path}
                      type="button"
                      onClick={() => router.push(hub.path)}
                      className={`px-3 sm:px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs whitespace-nowrap select-none cursor-pointer active:scale-95 hover:scale-[1.02] ${
                        isActive
                          ? "bg-[#fff4ed] text-[#ff6b12] border border-orange-300 font-bold shadow-xs ring-1 ring-orange-200/60"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? "text-[#ff6b12] scale-105" : "text-slate-400"}`} />
                      <span>{hub.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* RIGHT: SEARCH, NOTIFICATIONS & PROFILE DROPDOWN */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* Search Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs"
                title="Search ledger, vouchers, customers... (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-2xs"
                  title="System notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ff5222] text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[11px] text-[#ff6b12] hover:underline font-bold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer ${
                            n.unread ? "bg-orange-50/40" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900">{n.title}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Button & Dropdown (Matching Screenshot) */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 transition select-none"
                >
                  {/* Dark Avatar Circle with Letter */}
                  <div className="w-7 h-7 rounded-full bg-slate-950 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {(roleDisplay.title.charAt(0) || "A").toUpperCase()}
                  </div>

                  {/* Name & AG Homes */}
                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-slate-900">
                      {roleDisplay.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      AG Homes
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Profile Popover Menu (Matching screenshot) */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1 sm:hidden">
                      <p className="text-xs font-bold text-slate-900">{roleDisplay.title}</p>
                      <p className="text-[10px] text-slate-400">{user?.email || "AG Homes India Pvt. Ltd."}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setActiveModal("profile");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setActiveModal("settings");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setActiveModal("help");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Help & Support</span>
                    </button>

                    <div className="h-px bg-slate-100 my-1"></div>

                    {/* Logout in Vibrant Orange */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#ff6b12] hover:bg-orange-50 flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-4 h-4 text-[#ff6b12]" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </header>
      </div>

      {/* SEARCH SPOTLIGHT MODAL */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger vouchers, transactions, customer files, staff..."
                className="w-full text-sm outline-hidden text-slate-900 placeholder:text-slate-400 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>Press <b>Esc</b> to exit</span>
              <span>EstateSync Enterprise Search</span>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {activeModal === "profile" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-950 text-white font-black text-sm flex items-center justify-center">
                  {(roleDisplay.title.charAt(0) || "A").toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{roleDisplay.title}</h3>
                  <p className="text-xs text-slate-500">{user?.email || "user@estatesync.local"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department</span>
                <span className="font-bold text-slate-900">{roleDisplay.dept}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Legal Entity</span>
                <span className="font-bold text-slate-900">AG Homes India Pvt. Ltd.</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Platform Role</span>
                <span className="font-bold text-[#ff6b12]">{userRole || "ACCOUNTING"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff6b12] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Workspace Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Number Formatting</p>
                  <p className="text-[11px] text-slate-500">Indian Lakhs & Crores (₹)</p>
                </div>
                <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Real-time Sound Alerts</p>
                  <p className="text-[11px] text-slate-500">Chime on inbound customer payments</p>
                </div>
                <span className="px-2 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Double-Entry Balance Check</p>
                  <p className="text-[11px] text-slate-500">Strict debit=credit verification</p>
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold">Enforced</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-[#ff6b12] text-white rounded-xl text-xs font-bold hover:bg-[#e05a0b] transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & SUPPORT MODAL */}
      {activeModal === "help" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff6b12] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Help & Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Need assistance with ledger reconciliation, customer vouchers, or staff disbursements? Contact the AG Homes Technical Support Desk.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">Internal Support Desk</p>
                <p className="text-slate-500">Email: support@estatesync.local</p>
                <p className="text-slate-500">Helpline: +91 11 4982 3000</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardsLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="w-10 h-10 border-3 border-[#ff6b12] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Loading EstateSync Platform...
        </p>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased">
        <DashboardHeader />

        {/* Main Fluid Content */}
        <main className="flex-grow w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-2">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-[22px] shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] px-5 sm:px-8 py-4 sm:py-5 transition-all">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Product & Entity */}
              <div className="flex items-center gap-3.5 text-center md:text-left">
                <div className="w-9 h-9 rounded-xl bg-[#ff6b12] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="text-sm font-bold text-slate-900 tracking-tight">
                      Estate<span className="text-[#ff6b12] font-extrabold">Sync</span>™
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="text-xs font-semibold text-slate-600">
                      A Product of <span className="font-bold text-slate-900">Devoxa Technologies Pvt. Ltd.</span>
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      Registered Trademark ®
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Enterprise Real Estate Treasury, Double-Entry General Ledger & Workforce Governance Platform
                  </p>
                </div>
              </div>

              {/* Status & Copyright */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-right">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-slate-600">System v2.4 Enterprise</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  © {new Date().getFullYear()} <span className="font-semibold text-slate-700">Devoxa Technologies Pvt. Ltd.</span> All rights reserved.
                </div>
              </div>

            </div>
          </div>
        </footer>
      </div>
    </DashboardProvider>
  );
}
