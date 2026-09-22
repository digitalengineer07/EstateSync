"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardProvider, useDashboardNav } from "@/context/DashboardContext";
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
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
  MapPin,
  NotebookPen,
} from "lucide-react";
import { API_URL } from "@/config/api";

function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const dashboardNav = useDashboardNav();

  // Dropdowns & Modals State
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'settings' | 'help' | null

  // Live Enterprise Spotlight Search Effect (Debounced 250ms)
  useEffect(() => {
    if (!searchOpen) return;
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.results);
          } else {
            setSearchResults({ customers: [], transactions: [], employees: [], properties: [], notes: [] });
          }
        } else {
          setSearchResults({ customers: [], transactions: [], employees: [], properties: [], notes: [] });
        }
      } catch (err) {
        console.warn("Search error:", err.message);
        setSearchResults({ customers: [], transactions: [], employees: [], properties: [], notes: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K to open, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchResultClick = (item) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    if (item.targetTab && dashboardNav?.handleSelect) {
      dashboardNav.handleSelect(item.targetTab);
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  // Settings & Security State
  const [settingsTab, setSettingsTab] = useState("security"); // 'security' | 'preferences'
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    try {
      setPasswordLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update password.");
      }

      setPasswordSuccess(data.message || "Password changed successfully! Your credentials are up to date.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err.message || "Something went wrong while updating password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Live Notifications State
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("estatesync_read_notifs") || "[]");
    } catch {
      return [];
    }
  });

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.warn("Could not fetch notifications:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const combined = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(combined);
    try {
      localStorage.setItem("estatesync_read_notifs", JSON.stringify(combined));
    } catch {}
  };

  const handleNotificationClick = (n) => {
    if (!readNotifIds.includes(n.id)) {
      const updated = [...readNotifIds, n.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem("estatesync_read_notifs", JSON.stringify(updated));
      } catch {}
    }
    setNotificationsOpen(false);

    if (n.targetTab && dashboardNav?.handleSelect) {
      dashboardNav.handleSelect(n.targetTab);
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case "Collections":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Approvals":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Treasury":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Expenses":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Period":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mt-1">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          <Bell className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">All caught up!</p>
                          <p className="text-[11px] mt-0.5">No recent notifications</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isUnread = !readNotifIds.includes(n.id);
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer ${
                                isUnread ? "bg-orange-50/40" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                                  {n.category && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getCategoryBadgeClass(
                                        n.category
                                      )}`}
                                    >
                                      {n.category}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.desc}</p>
                            </div>
                          );
                        })
                      )}
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
                        setSettingsTab("security");
                        setPasswordError("");
                        setPasswordSuccess("");
                        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        setActiveModal("settings");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Settings & Security</span>
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
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
            {/* Input Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-white">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger vouchers, UTR, customer files, plot #, staff, land..."
                className="w-full text-sm outline-hidden text-slate-900 placeholder:text-slate-400 bg-transparent"
              />
              {searchLoading && (
                <Loader2 className="w-4 h-4 text-[#ff6b12] animate-spin shrink-0" />
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
                  title="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition shrink-0"
              >
                ESC
              </button>
            </div>

            {/* Results Container / Quick Suggestions */}
            <div className="overflow-y-auto p-3 space-y-4 max-h-[60vh]">
              {/* If user hasn't typed enough */}
              {!searchQuery || searchQuery.trim().length < 2 ? (
                <div className="p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Search Hints
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div
                      onClick={() => setSearchQuery("Plot")}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-200 cursor-pointer transition flex items-center gap-2.5"
                    >
                      <span className="p-1.5 rounded-lg bg-white text-[#ff6b12] shadow-2xs">
                        <Users className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">Customer & Plot Files</span>
                        <span className="text-[10px] text-slate-500">Search by plot #, customer name, contact</span>
                      </div>
                    </div>

                    <div
                      onClick={() => setSearchQuery("UTR")}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-200 cursor-pointer transition flex items-center gap-2.5"
                    >
                      <span className="p-1.5 rounded-lg bg-white text-emerald-600 shadow-2xs">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">Transactions & UTR</span>
                        <span className="text-[10px] text-slate-500">Search by UTR number, voucher receipt</span>
                      </div>
                    </div>

                    <div
                      onClick={() => setSearchQuery("EMP")}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-200 cursor-pointer transition flex items-center gap-2.5"
                    >
                      <span className="p-1.5 rounded-lg bg-white text-indigo-600 shadow-2xs">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">Staff & Workforce</span>
                        <span className="text-[10px] text-slate-500">Search employee code, designation</span>
                      </div>
                    </div>

                    <div
                      onClick={() => setSearchQuery("Land")}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-200 cursor-pointer transition flex items-center gap-2.5"
                    >
                      <span className="p-1.5 rounded-lg bg-white text-amber-600 shadow-2xs">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">Land Acquisitions</span>
                        <span className="text-[10px] text-slate-500">Search by land owner, khata number</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : searchResults &&
                (searchResults.customers?.length > 0 ||
                  searchResults.transactions?.length > 0 ||
                  searchResults.employees?.length > 0 ||
                  searchResults.properties?.length > 0 ||
                  searchResults.notes?.length > 0) ? (
                <div className="space-y-3">
                  {/* Customers Section */}
                  {searchResults.customers?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <Users className="w-3 h-3 text-[#ff6b12]" />
                        <span>Customers & Plot Files ({searchResults.customers.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSearchResultClick(c)}
                            className="p-2.5 rounded-xl hover:bg-orange-50/60 border border-transparent hover:border-orange-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-[#ff6b12] truncate">
                                {c.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{c.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              {c.extra}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions Section */}
                  {searchResults.transactions?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <ArrowLeftRight className="w-3 h-3 text-emerald-600" />
                        <span>Transactions & UTR Vouchers ({searchResults.transactions.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.transactions.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleSearchResultClick(t)}
                            className="p-2.5 rounded-xl hover:bg-emerald-50/60 border border-transparent hover:border-emerald-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                                {t.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{t.subtitle}</p>
                            </div>
                            <span className="text-xs font-black text-emerald-600 shrink-0">
                              {t.extra}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employees Section */}
                  {searchResults.employees?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <User className="w-3 h-3 text-indigo-600" />
                        <span>Staff Directory ({searchResults.employees.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.employees.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => handleSearchResultClick(e)}
                            className="p-2.5 rounded-xl hover:bg-indigo-50/60 border border-transparent hover:border-indigo-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                                {e.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{e.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                              {e.extra}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Properties Section */}
                  {searchResults.properties?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>Land & Property Acquisitions ({searchResults.properties.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.properties.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSearchResultClick(p)}
                            className="p-2.5 rounded-xl hover:bg-amber-50/60 border border-transparent hover:border-amber-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
                                {p.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{p.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              {p.extra}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {searchResults.notes?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <NotebookPen className="w-3 h-3 text-[#ff6b12]" />
                        <span>Cash Diary & Notes ({searchResults.notes.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.notes.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleSearchResultClick(n)}
                            className="p-2.5 rounded-xl hover:bg-orange-50/60 border border-transparent hover:border-orange-200 transition cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-[#ff6b12] truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{n.subtitle}</p>
                            </div>
                            {n.extra && (
                              <span className="text-xs font-bold text-slate-700 shrink-0">
                                {n.extra}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : !searchLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">No records found</p>
                  <p className="text-slate-400">
                    No customers, vouchers, staff, or plots matched &ldquo;{searchQuery}&rdquo;.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>Press <b>Esc</b> to exit</span>
                <span>•</span>
                <span><b>Ctrl+K</b> to open</span>
              </span>
              <span className="font-bold text-slate-600">EstateSync Enterprise Search</span>
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
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveModal("settings");
                  setSettingsTab("security");
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#ff6b12] hover:bg-orange-50 border border-slate-200 transition active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & CHANGE PASSWORD MODAL */}
      {activeModal === "settings" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6b12] flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Account & System Settings</h3>
                  <p className="text-[11px] text-slate-500">Manage security credentials and workspace preferences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 px-5 pt-2 bg-white">
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("security");
                  setPasswordError("");
                }}
                className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition -mb-px ${
                  settingsTab === "security"
                    ? "border-[#ff6b12] text-[#ff6b12]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Security & Password</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("preferences")}
                className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition -mb-px ${
                  settingsTab === "preferences"
                    ? "border-[#ff6b12] text-[#ff6b12]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Workspace Preferences</span>
              </button>
            </div>

            {/* Modal Body */}
            {settingsTab === "security" ? (
              <form onSubmit={handleChangePassword}>
                <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
                  {/* Profile Summary Badge */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{roleDisplay.title}</p>
                      <p className="text-[11px] text-slate-500">{user?.email || "user@estatesync.local"}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-[#ff6b12] border border-orange-200">
                      Self-Service Security
                    </span>
                  </div>

                  {/* Feedback Banners */}
                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-2 text-xs animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {/* Current Password Field */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        placeholder="Enter your current password"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff6b12] transition"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPasswords.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        placeholder="Minimum 6 characters"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff6b12] transition"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPasswords.new ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Must be at least 6 characters and different from your current password.
                    </p>
                  </div>

                  {/* Confirm New Password Field */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        placeholder="Re-enter your new password"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-[#ff6b12] transition"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security Tab Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b12] text-white rounded-xl text-xs font-bold hover:bg-[#e05a0b] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xs transition cursor-pointer"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div>
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
                    className="px-4 py-2 bg-[#ff6b12] text-white rounded-xl text-xs font-bold hover:bg-[#e05a0b] transition active:scale-95 cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
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
