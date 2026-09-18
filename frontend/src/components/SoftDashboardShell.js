"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardNav } from "@/context/DashboardContext";
import DashboardStats from "@/components/DashboardStats";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Layers,
  Zap,
  Target,
  DollarSign,
  HeartHandshake,
  Sparkles,
  Megaphone,
  Scale,
  Users,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";

export default function SoftDashboardShell({
  title,
  eyebrow = "Pages / Dashboard",
  description,
  navItems = [],
  activeId,
  onSelect,
  statsType,
  children,
}) {
  const { user } = useAuth();
  const dashboardNav = useDashboardNav();

  // Register sub-panels with the global top navigation bar
  useEffect(() => {
    if (dashboardNav?.registerPanels) {
      dashboardNav.registerPanels({
        items: navItems,
        activeId,
        onSelect,
        title,
      });
    }
  }, [dashboardNav, navItems, activeId, onSelect, title]);

  const userRole = (typeof user?.role === "object" ? user?.role?.name : user?.role) || "";

  // Dynamic greeting based on time of day
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    
    let roleLabel = "Accounting Officer";
    if (userRole === "MANAGER") roleLabel = "Operations Manager";
    else if (userRole === "SALES") roleLabel = "Sales Specialist";
    else if (userRole === "MARKETING") roleLabel = "Marketing Specialist";
    else if (userRole === "ADMIN") roleLabel = "System Administrator";
    else if (user?.name) roleLabel = user.name;

    return `${timeGreeting}, ${roleLabel}`;
  }, [userRole, user]);

  // Role display details
  const roleDetails = useMemo(() => {
    if (userRole === "MANAGER" || title?.toLowerCase().includes("operation") || title?.toLowerCase().includes("management")) {
      return {
        roleTitle: "Operations Manager",
        department: "AG Homes India Pvt. Ltd.",
        cycleName: "Current Operational Cycle",
        quote: "Operational excellence. Stronger foundations.",
        badges: [
          { icon: Zap, label: "High Velocity", color: "text-amber-600 bg-amber-50 border-amber-200" },
          { icon: Target, label: "Team Alignment", color: "text-blue-600 bg-blue-50 border-blue-200" },
          { icon: TrendingUp, label: "Real-time Insights", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        ],
      };
    }

    if (userRole === "SALES" || title?.toLowerCase().includes("sales")) {
      return {
        roleTitle: "Sales Specialist",
        department: "AG Homes India Pvt. Ltd.",
        cycleName: "Current Sales Cycle",
        quote: "Connecting aspirations with landmark estates.",
        badges: [
          { icon: DollarSign, label: "Revenue Focused", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { icon: HeartHandshake, label: "Customer First", color: "text-orange-600 bg-orange-50 border-orange-200" },
          { icon: TrendingUp, label: "Real-time Insights", color: "text-blue-600 bg-blue-50 border-blue-200" },
        ],
      };
    }

    if (userRole === "MARKETING" || title?.toLowerCase().includes("marketing")) {
      return {
        roleTitle: "Marketing Specialist",
        department: "AG Homes India Pvt. Ltd.",
        cycleName: "Current Campaign Period",
        quote: "Building brands. Inspiring communities.",
        badges: [
          { icon: Sparkles, label: "Brand Elevation", color: "text-purple-600 bg-purple-50 border-purple-200" },
          { icon: Megaphone, label: "Active Outreach", color: "text-pink-600 bg-pink-50 border-pink-200" },
          { icon: TrendingUp, label: "Real-time Insights", color: "text-blue-600 bg-blue-50 border-blue-200" },
        ],
      };
    }

    if (userRole === "ADMIN" || title?.toLowerCase().includes("governance") || title?.toLowerCase().includes("admin")) {
      return {
        roleTitle: "System Administrator",
        department: "AG Homes India Pvt. Ltd.",
        cycleName: "Current Fiscal Cycle",
        quote: "Total governance. Uncompromising integrity.",
        badges: [
          { icon: ShieldCheck, label: "Enterprise Governed", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { icon: Scale, label: "Audit Compliant", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { icon: TrendingUp, label: "Real-time Insights", color: "text-blue-600 bg-blue-50 border-blue-200" },
        ],
      };
    }

    if (title?.toLowerCase().includes("workforce") || title?.toLowerCase().includes("staff") || title?.toLowerCase().includes("employee")) {
      return {
        roleTitle: "Workforce Administrator",
        department: "AG Homes India Pvt. Ltd.",
        cycleName: "Current Payroll Cycle",
        quote: "Empowering teams to achieve great milestones.",
        badges: [
          { icon: Users, label: "People First", color: "text-blue-600 bg-blue-50 border-blue-200" },
          { icon: CheckCircle2, label: "Compliance Ready", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { icon: TrendingUp, label: "Real-time Insights", color: "text-purple-600 bg-purple-50 border-purple-200" },
        ],
      };
    }

    // Default: Accounting Officer (as in screenshot)
    return {
      roleTitle: "Accounting Officer",
      department: "AG Homes India Pvt. Ltd.",
      cycleName: "Current Accounting Period",
      quote: "Accurate records. Stronger foundations.",
      badges: [
        { icon: ShieldCheck, label: "Financially Accurate", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        { icon: TrendingUp, label: "Real-time Insights", color: "text-teal-600 bg-teal-50 border-teal-200" },
        { icon: Layers, label: "Better Decisions", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
      ],
    };
  }, [userRole, title]);

  // Formatted date period (e.g., "01 Sept 2026 - 30 Sept 2026")
  const formattedPeriod = useMemo(() => {
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return `01 ${monthName} ${year} - ${lastDay} ${monthName} ${year}`;
  }, []);

  const activeItem = navItems.find((item) => item.id === activeId) || navItems[0];
  const ActiveIcon = activeItem?.icon || LayoutDashboard;

  // Horizontal Scroll Navigation Controls
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, navItems]);

  useEffect(() => {
    if (scrollRef.current && activeId) {
      const activeEl = scrollRef.current.querySelector(`[data-nav-id="${activeId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  }, [activeId]);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full space-y-5 antialiased">
      {/* 1. PANORAMIC LUXURY HERO BANNER */}
      <section className="relative w-full rounded-2xl sm:rounded-[24px] overflow-hidden border border-slate-200/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] bg-slate-900">
        {/* Estate Background Image */}
        <img
          src="/images/luxury_estate_banner.jpg"
          alt="EstateSync Luxury Architecture"
          className="absolute inset-0 w-full h-full object-cover object-right md:object-center select-none"
        />

        {/* Left-to-Right Glassmorphism & Translucent Fade Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-50% to-white/20 sm:to-transparent"></div>

        {/* Decorative Blue Vertical Pill / Notch */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-[#0284c7] rounded-r-full hidden sm:block"></div>

        {/* Content Container (Symmetric, compact vertical padding eliminating empty bottom space) */}
        <div className="relative z-10 px-5 sm:px-7 py-4 sm:py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          
          {/* Left Hero Text Column */}
          <div className="max-w-2xl">
            {/* Greeting */}
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
              <span>{greetingText}</span>
              <span className="animate-wiggle">👋</span>
            </div>

            {/* Bold Title */}
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-black text-slate-900 tracking-tight leading-tight mt-0.5">
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-xs sm:text-[13px] text-slate-600 mt-1 leading-relaxed max-w-xl">
                {description}
              </p>
            )}

            {/* 3 Value Feature Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {roleDetails.badges.map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200/80 text-[11px] font-bold text-slate-700 shadow-2xs"
                  >
                    <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{badge.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Center Quote (Desktop View) */}
          <div className="hidden xl:flex flex-col justify-center px-5 border-l border-slate-300/60 max-w-[220px]">
            <p className="text-xs italic font-semibold text-slate-700 leading-snug">
              “{roleDetails.quote}”
            </p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-[#ff6b12] font-black">—</span> EstateSync
            </p>
          </div>

          {/* Right Floating Frosted Cards */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 self-start lg:self-center">
            {/* Period Card */}
            <div className="flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-white/90 rounded-2xl px-3.5 py-2 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.10)] min-w-[230px] transition hover:shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 tracking-tight leading-none">
                    <span>{formattedPeriod}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-none">
                    {roleDetails.cycleName}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Profile Identity Card (Without "Your Role" text) */}
            <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-white/90 rounded-2xl px-3.5 py-2 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.10)] min-w-[230px] transition hover:shadow-md">
              <div className="w-7 h-7 rounded-xl bg-[#ff6b12] text-white flex items-center justify-center shadow-xs shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                  {roleDetails.roleTitle}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                  {roleDetails.department}
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HORIZONTAL SUB-NAVIGATION BAR (With Scroll Left / Right Buttons & Zero Gap at Start) */}
      {navItems.length > 0 && (
        <div className="relative w-full bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
          {/* Scroll Left Button - Appears only when scrolled right, leaving zero empty space at start */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={handleScrollLeft}
              aria-label="Scroll navigation left"
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ff6b12] border border-slate-200/90 shadow-xs cursor-pointer hover:scale-105 active:scale-90 active:bg-orange-100 transition-all duration-150 select-none animate-in fade-in zoom-in-75 duration-200"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Scrollable Sub-Navigation Tabs */}
          <nav
            ref={scrollRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-0.5"
            aria-label="Panel Navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon || LayoutDashboard;
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  data-nav-id={item.id}
                  type="button"
                  onClick={() => onSelect && onSelect(item.id)}
                  className={`group relative px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap text-xs sm:text-[13px] select-none cursor-pointer active:scale-95 hover:scale-[1.02] ${
                    isActive
                      ? "bg-[#fff4ed] text-[#ff6b12] border border-orange-300 font-bold shadow-[0_4px_14px_-2px_rgba(255,107,18,0.25)] ring-2 ring-orange-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium"
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-[#ff6b12] scale-105" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.shortLabel || item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#ff6b12] rounded-full animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Scroll Right Button - Appears only when content overflows to the right */}
          {canScrollRight && (
            <button
              type="button"
              onClick={handleScrollRight}
              aria-label="Scroll navigation right"
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ff6b12] border border-slate-200/90 shadow-xs cursor-pointer hover:scale-105 active:scale-90 active:bg-orange-100 transition-all duration-150 select-none animate-in fade-in zoom-in-75 duration-200"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 3. OPTIONAL METRIC STATS */}
      {statsType && <DashboardStats type={statsType} />}

      {/* 4. ACTIVE PANEL CONTENT CONTAINER */}
      <section className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-[22px] shadow-[0_12px_36px_-18px_rgba(0,0,0,0.06)] p-5 sm:p-6 lg:p-7 transition-all">
        {/* Sleek Active Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <ActiveIcon className="w-4 h-4 text-[#ff6b12]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                {activeItem?.label || "Workspace Panel"}
              </h2>
              {activeItem?.description && (
                <p className="text-xs text-slate-500 mt-0.5">{activeItem.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live View
            </span>
          </div>
        </div>

        {/* Embedded Panel Views & Tables */}
        <div className="pt-5">{children}</div>
      </section>
    </div>
  );
}
