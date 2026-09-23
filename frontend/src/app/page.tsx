"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Users,
  Layers,
  MoreHorizontal,
  Home,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

/**
 * Official EstateSync Logo Mark
 */
function EstateSyncLogoMark({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#ff6b12" />
      {/* Central main tower */}
      <path
        d="M10 26V7a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 22 7v19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left wing */}
      <path
        d="M10 16H8a1.5 1.5 0 0 0-1.5 1.5V24A1.5 1.5 0 0 0 8 25.5h2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right wing */}
      <path
        d="M22 13h2a1.5 1.5 0 0 1 1.5 1.5V24a1.5 1.5 0 0 1-1.5 1.5h-2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Window lines */}
      <line x1="13.5" y1="10" x2="18.5" y2="10" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="14" x2="18.5" y2="14" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="18" x2="18.5" y2="18" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="22" x2="18.5" y2="22" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const featureItems = [
    {
      icon: TrendingUp,
      title: "Real-time",
      subtitle: "Financial Insights",
    },
    {
      icon: ShieldCheck,
      title: "Secure",
      subtitle: "Role Based Access",
    },
    {
      icon: Users,
      title: "Better",
      subtitle: "Team Collaboration",
    },
    {
      icon: Layers,
      title: "Accurate",
      subtitle: "Accounting & Audit",
    },
  ];

  return (
    <div className="relative min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#F7F6F2] text-slate-900 font-sans overflow-x-hidden lg:overflow-hidden flex flex-col justify-between selection:bg-[#ff6b12]/20 selection:text-[#ff6b12]">
      
      {/* ========================================================================= */}
      {/* DESKTOP HERO ARCHITECTURAL BACKGROUND (Right 55% with Organic S-Curve)    */}
      {/* ========================================================================= */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Architectural Image aligned to top matching exact 16:9 crop */}
        <div
          role="img"
          aria-label="EstateSync luxury rooftop terrace overlooking sunset skyline"
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/landing/luxury-terrace-sunset.jpg')",
            backgroundPosition: "center top",
          }}
        />

        {/* Subtle dusk atmosphere vignette on the extreme right */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-transparent" />

        {/* ===================================================================== */}
        {/* ORGANIC ARCHITECTURAL S-CURVE TRANSITION OVERLAY                      */}
        {/* Multi-layered organic division with luminous aura and ambient depth   */}
        {/* ===================================================================== */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Ambient Dual-Stage Drop Shadow */}
            <filter id="organicCurveShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="18" dy="0" stdDeviation="28" floodColor="#080c14" floodOpacity="0.22" />
              <feDropShadow dx="6" dy="0" stdDeviation="14" floodColor="#ff7a1a" floodOpacity="0.14" />
              <feDropShadow dx="2" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.4" />
            </filter>

            {/* Soft Frosted Wave Glow Filter */}
            <filter id="softFrostedGlow" x="-20%" y="-20%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="16" />
            </filter>

            {/* Translucent Aura Gradient along the curve */}
            <linearGradient id="curveAuraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#fff3e6" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#ffeedd" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Top Right Ethereal Flare Gradient */}
            <linearGradient id="topFlareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#ffeedd" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Luminous Edge Highlight Gradient */}
            <linearGradient id="edgeLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#ffe8d1" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Layer 1: Ethereal Top-Right Translucent Flare (arcs gracefully past Contact) */}
          <path
            d="M 960 160 C 1040 90 1150 30 1300 0 L 1120 0 C 1030 50 980 110 960 160 Z"
            fill="url(#topFlareGradient)"
            filter="url(#softFrostedGlow)"
          />

          {/* Layer 2: Wide Translucent Outer Aura Wave extending into the photo */}
          <path
            d="M 0 0 L 1180 0 C 1060 180 820 380 800 600 C 780 800 1020 950 1110 1080 L 0 1080 Z"
            fill="url(#curveAuraGradient)"
            filter="url(#softFrostedGlow)"
          />

          {/* Layer 3: Secondary Mid-range Frosted Ribbon Contour */}
          <path
            d="M 0 0 L 1145 0 C 1025 180 785 380 765 600 C 745 800 985 950 1075 1080 L 0 1080 Z"
            fill="rgba(255, 255, 255, 0.42)"
          />

          {/* Layer 4: Primary Solid Warm Off-White Organic S-Curve Panel */}
          <path
            d="M 0 0 L 1120 0 C 1000 180 760 380 740 600 C 720 800 960 950 1050 1080 L 0 1080 Z"
            fill="#F7F6F2"
            filter="url(#organicCurveShadow)"
          />

          {/* Layer 5: Luminous Ultra-Crisp Architectural Rim Highlight */}
          <path
            d="M 1120 0 C 1000 180 760 380 740 600 C 720 800 960 950 1050 1080"
            stroke="url(#edgeLineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Layer 6: Delicate Warm Golden Rim Accent (1.5px) */}
          <path
            d="M 1120 0 C 1000 180 760 380 740 600 C 720 800 960 950 1050 1080"
            stroke="rgba(255, 122, 26, 0.35)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR                                                        */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full max-w-[1720px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 pt-3 sm:pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group select-none">
            <div className="shadow-md shadow-orange-900/10 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
              <EstateSyncLogoMark className="w-9 h-9" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-[19px] font-black tracking-tight text-slate-900 leading-none">
                Estate<span className="text-[#ff6b12]">Sync</span>
              </span>
              <span className="text-[9px] font-extrabold tracking-[0.2em] text-slate-400 uppercase mt-1">
                BY DEVOXA TECHNOLOGIES
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 lg:gap-9 text-[13px] font-semibold tracking-wide"
          >
            <Link
              href="/"
              className="relative text-slate-900 font-bold transition-colors py-1 after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-[#ff6b12] after:rounded-full"
            >
              Home
            </Link>
            <a
              href="#features"
              className="text-slate-600 hover:text-slate-950 transition-colors py-1"
            >
              Features
            </a>
            <a
              href="#solutions"
              className="text-slate-600 hover:text-slate-950 transition-colors py-1"
            >
              Solutions
            </a>
            <a
              href="#resources"
              className="text-slate-600 hover:text-slate-950 transition-colors py-1"
            >
              Resources
            </a>
            <a
              href="#contact"
              className="text-slate-600 hover:text-slate-950 transition-colors py-1"
            >
              Contact
            </a>
          </nav>

          {/* Right Controls: Dark Mode Toggle & Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Pill Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme Mode"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101522] hover:bg-[#1a2236] text-white text-[11.5px] font-semibold tracking-wide border border-white/10 shadow-sm transition active:scale-95"
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-orange-50 text-[#ff6b12]"
              >
                Home
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Features
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Solutions
              </a>
              <a
                href="#resources"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Resources
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Contact
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#ff6b12] rounded-xl shadow-xs"
              >
                Sign In to Portal →
              </Link>
              <Link
                href="/dashboards"
                className="w-full py-2.5 text-center text-xs font-bold text-slate-800 bg-slate-100 rounded-xl"
              >
                View Dashboards
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* MAIN HERO SECTION (Single Viewport Frame, No Scrolling on Desktop)        */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-[1720px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 flex-1 flex flex-col justify-between py-1 lg:py-2 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
          
          {/* ===================================================================== */}
          {/* LEFT CONTENT AREA (Zoomed out & adjusted to fit single frame)         */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center max-w-[500px] xl:max-w-[540px] py-1">
            
            {/* Eyebrow Label */}
            <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
              <span className="w-4 h-[2px] bg-[#ff6b12] rounded-full inline-block" />
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                REAL ESTATE TREASURY PLATFORM
              </p>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[44px] 2xl:text-[48px] font-black text-slate-900 tracking-tight leading-[1.06]">
              Properties<br />
              create value.<br />
              <span className="text-[#ff6b12]">Clarity</span> keeps it<br />
              growing.
            </h1>

            {/* Value Proposition Description */}
            <p className="mt-3 sm:mt-3.5 text-xs sm:text-sm lg:text-[14px] xl:text-[15px] text-slate-600 leading-relaxed max-w-[480px]">
              EstateSync unifies property collections, land acquisitions, expenses, staff wallets and double-entry accounting — so your team can manage everything with confidence.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 h-10 sm:h-11 px-6 rounded-xl bg-[#ff6b12] text-white font-extrabold text-xs sm:text-[13px] shadow-[0_10px_24px_-8px_rgba(255,107,18,0.7)] hover:bg-[#f25f05] hover:shadow-[0_14px_28px_-8px_rgba(255,107,18,0.85)] hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                href="/dashboards"
                className="inline-flex items-center justify-center h-10 sm:h-11 px-6 rounded-xl bg-white border border-slate-300 text-slate-800 font-extrabold text-xs sm:text-[13px] hover:bg-slate-50 hover:border-slate-400 hover:-translate-y-0.5 transition-all duration-200 shadow-2xs"
              >
                View Dashboards
              </Link>
            </div>

            {/* 4 Feature Highlights Strip */}
            <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-slate-200/80">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2.5 lg:gap-3.5">
                {featureItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex flex-col group">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 border border-orange-200/70 text-[#ff6b12] flex items-center justify-center mb-1.5 transition-transform duration-150 group-hover:scale-105 shadow-2xs">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 leading-tight">
                        {item.title}
                      </span>
                      <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brand Quote */}
            <div className="mt-4 sm:mt-4.5 pt-2 border-l-2 border-[#ff6b12] pl-3">
              <p className="text-[11px] sm:text-xs text-slate-600 italic font-medium leading-normal">
                “Data today. Stronger developments tomorrow.”
              </p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                — EstateSync
              </p>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT VISUAL AREA (Floating Metrics & Brand Accents)                  */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 relative w-full flex flex-col justify-between min-h-[340px] sm:min-h-[420px] lg:min-h-[500px] p-2 sm:p-4">
            
            {/* Mobile/Tablet Fallback Image Card (<lg screens) */}
            <div className="lg:hidden relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-xl border border-slate-200 mb-4">
              <div
                role="img"
                aria-label="EstateSync luxury rooftop terrace overlooking sunset skyline"
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{
                  backgroundImage: "url('/images/landing/luxury-terrace-sunset.jpg')",
                  backgroundPosition: "center top",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Top Right Label on mobile image */}
              <div className="absolute top-3.5 right-3.5">
                <span className="text-[9.5px] font-extrabold tracking-[0.2em] text-white/90 uppercase drop-shadow-md">
                  LAND | PEOPLE | FINANCE | GROWTH
                </span>
              </div>

              {/* Overlaid metric card on mobile */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-xl p-3 text-white shadow-lg">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-300">Total Portfolio Value</span>
                  <span className="font-bold text-emerald-400">↗ +12.5%</span>
                </div>
                <div className="mt-0.5 text-xl font-black font-digital text-white">
                  ₹ 102.4 Cr
                </div>
              </div>
            </div>

            {/* Desktop Top Right Label */}
            <div className="hidden lg:flex justify-end pr-2 pt-0.5">
              <span className="text-[10.5px] font-extrabold tracking-[0.22em] text-slate-200/90 uppercase drop-shadow-md select-none">
                LAND &nbsp;|&nbsp; PEOPLE &nbsp;|&nbsp; FINANCE &nbsp;|&nbsp; GROWTH
              </span>
            </div>

            {/* Desktop Floating Metric Cards Container */}
            <div className="hidden lg:flex flex-col items-end space-y-3.5 my-auto pr-1 xl:pr-4">
              
              {/* Metric Card 1: Total Portfolio Value */}
              <div className="w-full max-w-[260px] xl:max-w-[275px] bg-slate-900/65 backdrop-blur-md border border-white/25 rounded-2xl p-3.5 sm:p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition duration-200 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#ff6b12] flex items-center justify-center text-white shadow-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11.5px] font-semibold text-slate-300 tracking-wide">
                      Total Portfolio Value
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-2.5 text-xl xl:text-2xl font-black text-white font-digital tracking-tight">
                  ₹ 102.4 Cr
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span>↗ +12.5%</span>
                  <span className="text-[10px] text-slate-400 font-normal">vs last quarter</span>
                </div>
              </div>

              {/* Metric Card 2: Total Properties */}
              <div className="w-full max-w-[260px] xl:max-w-[275px] bg-slate-900/65 backdrop-blur-md border border-white/25 rounded-2xl p-3.5 sm:p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition duration-200 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#ff6b12] flex items-center justify-center text-white shadow-sm">
                      <Home className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11.5px] font-semibold text-slate-300 tracking-wide">
                      Total Properties
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-2.5 text-xl xl:text-2xl font-black text-white tracking-tight">
                  500+
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span>↗ +8%</span>
                  <span className="text-[10px] text-slate-400 font-normal">vs last quarter</span>
                </div>
              </div>
            </div>

            {/* Lower-right Brand Statement */}
            <div className="hidden lg:flex flex-col items-end text-right pr-2 pb-0.5 select-none">
              <span className="text-[9.5px] font-black tracking-[0.24em] text-white/95 uppercase leading-tight drop-shadow-md">
                BUILDING<br />
                A BRIGHTER<br />
                TOMORROW
              </span>
              <span className="w-7 h-[2px] bg-[#ff6b12] rounded-full mt-1 inline-block" />
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER INDICATORS (Carousel Numbers & Scroll Down Cue)                    */}
        {/* ========================================================================= */}
        <div className="pt-2.5 pb-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          
          {/* Subtle Carousel Indicator */}
          <div className="flex items-center gap-3.5 font-mono font-bold tracking-wider select-none text-[11px]">
            <span className="relative text-slate-900 font-extrabold pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#ff6b12]">
              01
            </span>
            <span className="text-slate-400 hover:text-slate-700 transition cursor-pointer pb-0.5">
              02
            </span>
            <span className="text-slate-400 hover:text-slate-700 transition cursor-pointer pb-0.5">
              03
            </span>
          </div>

          {/* Scroll Down Cue */}
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold select-none group cursor-pointer hover:text-slate-800 transition">
            {/* Custom Mouse SVG Icon */}
            <svg
              className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#ff6b12] transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="2" width="14" height="20" rx="7" />
              <path d="M12 6v4" />
            </svg>
            <span className="text-[10.5px] uppercase tracking-wider">Scroll Down</span>
            <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>
      </main>

    </div>
  );
}
