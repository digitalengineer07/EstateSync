"use client";

import { useState } from "react";
import Link from "next/link";
import {
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
  const [activeSlide, setActiveSlide] = useState(1);

  return (
    <div className="relative min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#FAF9F7] text-slate-900 font-sans overflow-x-hidden lg:overflow-hidden flex flex-col justify-between selection:bg-[#ff6b12]/20 selection:text-[#ff6b12]">
      
      {/* ========================================================================= */}
      {/* DESKTOP HERO ARCHITECTURAL BACKGROUND (Pixel-matched composite backdrop) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          role="img"
          aria-label="EstateSync luxury penthouse terrace overlooking sunset skyline with organic division"
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: "url('/images/landing/hero-composite-bg.jpg')",
            backgroundPosition: "right center",
            backgroundSize: "cover",
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR                                                        */}
      {/* ========================================================================= */}
      <header className="relative z-30 w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 pt-4 sm:pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          
          {/* Left Header Group: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-7 lg:gap-10 xl:gap-14">
            
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center gap-3.5 group select-none">
              <div className="rounded-2xl overflow-hidden shadow-[0_8px_20px_-2px_rgba(255,107,18,0.45)] transition-transform duration-200 group-hover:scale-105">
                <EstateSyncLogoMark className="w-10 h-10 sm:w-11 sm:h-11" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-[22px] font-black tracking-tight text-slate-900 leading-none">
                  Estate<span className="text-[#ff6b12]">Sync</span>
                </span>
                <span className="text-[8px] sm:text-[8.5px] font-extrabold tracking-[0.24em] text-slate-400 uppercase mt-1">
                  BY DEVOXA TECHNOLOGIES
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-6 lg:gap-7 xl:gap-9 text-[13px] sm:text-[13.5px] font-semibold tracking-wide"
            >
              <Link
                href="/"
                className="relative text-slate-900 font-bold transition-colors py-1 after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-[2.5px] after:bg-[#ff6b12] after:rounded-full"
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
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
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
      <main className="relative z-10 w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 flex-1 flex flex-col justify-between py-1 lg:py-2 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 my-auto">
          
          {/* ===================================================================== */}
          {/* LEFT CONTENT AREA (Exact Pixel Alignment Matching Uploaded Image)     */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center max-w-[490px] xl:max-w-[530px] 2xl:max-w-[560px] py-1">
            
            {/* Eyebrow Label with Orange Accent Dash */}
            <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3">
              <span className="w-7 h-[2.5px] bg-[#ff6b12] rounded-full inline-block" />
              <p className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                REAL ESTATE TREASURY PLATFORM
              </p>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] 2xl:text-[52px] font-black text-slate-950 tracking-tight leading-[1.04]">
              Properties<br />
              create value.<br />
              <span className="text-[#ff6b12]">Clarity</span> keeps it<br />
              growing.
            </h1>

            {/* Value Proposition Description */}
            <p className="mt-3 sm:mt-3.5 text-xs sm:text-[13px] lg:text-[13.5px] xl:text-[14.5px] text-slate-500 leading-relaxed font-normal max-w-[460px] xl:max-w-[490px]">
              EstateSync unifies property collections, land acquisitions, expenses, staff wallets and double-entry accounting — so you can manage everything with confidence.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-4 sm:mt-5 flex items-center gap-3 sm:gap-3.5">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 h-11 sm:h-11.5 px-6 sm:px-7 rounded-xl bg-[#ff6b12] text-white font-extrabold text-xs sm:text-[13px] shadow-[0_12px_24px_-4px_rgba(255,107,18,0.55)] hover:bg-[#f25f05] hover:shadow-[0_16px_28px_-4px_rgba(255,107,18,0.7)] hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <span>Sign In to Portal</span>
                <span className="text-sm font-bold group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              
              <Link
                href="/dashboards"
                className="inline-flex items-center justify-center h-11 sm:h-11.5 px-6 sm:px-7 rounded-xl bg-white border border-slate-300 text-slate-800 font-extrabold text-xs sm:text-[13px] hover:bg-slate-50 hover:border-slate-400 hover:-translate-y-0.5 transition-all duration-200 shadow-2xs"
              >
                View Dashboards
              </Link>
            </div>

            {/* 4 Feature Highlights Row (No divider line, soft peach squircle icons) */}
            <div className="mt-5 sm:mt-6">
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5 xl:gap-4">
                
                {/* 1: Real-time Financial Insights */}
                <div className="flex flex-col group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF6ED] border border-orange-200/70 text-[#ff6b12] flex items-center justify-center mb-1.5 transition-transform duration-150 group-hover:scale-105 shadow-[0_4px_12px_rgba(255,107,18,0.12)]">
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 19v-4" />
                      <path d="M12 19v-9" />
                      <path d="M18 19v-14" />
                    </svg>
                  </div>
                  <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight">
                    Real-time
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Financial Insights
                  </span>
                </div>

                {/* 2: Secure Role Based Access */}
                <div className="flex flex-col group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF6ED] border border-orange-200/70 text-[#ff6b12] flex items-center justify-center mb-1.5 transition-transform duration-150 group-hover:scale-105 shadow-[0_4px_12px_rgba(255,107,18,0.12)]">
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight">
                    Secure
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Role Based Access
                  </span>
                </div>

                {/* 3: Better Team Collaboration */}
                <div className="flex flex-col group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF6ED] border border-orange-200/70 text-[#ff6b12] flex items-center justify-center mb-1.5 transition-transform duration-150 group-hover:scale-105 shadow-[0_4px_12px_rgba(255,107,18,0.12)]">
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight">
                    Better
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Team Collaboration
                  </span>
                </div>

                {/* 4: Accurate Accounting & Audit */}
                <div className="flex flex-col group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF6ED] border border-orange-200/70 text-[#ff6b12] flex items-center justify-center mb-1.5 transition-transform duration-150 group-hover:scale-105 shadow-[0_4px_12px_rgba(255,107,18,0.12)]">
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 2 9 4.5-9 4.5-9-4.5z" />
                      <path d="m3 11.5 9 4.5 9-4.5" />
                      <path d="m3 16.5 9 4.5 9-4.5" />
                    </svg>
                  </div>
                  <span className="text-[11.5px] sm:text-[12px] font-black text-slate-900 leading-tight">
                    Accurate
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Accounting & Audit
                  </span>
                </div>
              </div>
            </div>

            {/* Brand Quote (2 Lines, Vertical Accent) */}
            <div className="mt-4 sm:mt-5 border-l-[2.5px] border-[#ff6b12] pl-3.5 sm:pl-4">
              <p className="text-[11px] sm:text-[12px] text-slate-600 italic font-medium leading-snug">
                “Data today.<br />Stronger developments tomorrow.”
              </p>
              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-semibold tracking-wide mt-1 flex items-center gap-1.5">
                <span>—</span>
                <span>EstateSync</span>
              </p>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT VISUAL AREA (Clean backdrop on desktop, responsive for mobile) */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 relative w-full flex flex-col justify-between min-h-0 pointer-events-none">
            
            {/* Mobile/Tablet Fallback Card (<lg screens) */}
            <div className="lg:hidden relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden shadow-xl border border-slate-200 my-4 pointer-events-auto">
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
              
              <div className="absolute top-3.5 right-3.5">
                <span className="text-[9.5px] font-extrabold tracking-[0.2em] text-white/90 uppercase drop-shadow-md">
                  IDEAS | INVESTMENTS | PEOPLE | PROGRESS
                </span>
              </div>

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

          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER INDICATORS (No dividing line, Carousel Numbers & Scroll Down Cue)  */}
        {/* ========================================================================= */}
        <div className="pb-3 sm:pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 shrink-0">
          
          {/* Carousel Slide Indicators */}
          <div className="flex items-center gap-4 font-mono font-bold tracking-wider select-none text-[11px] sm:text-xs">
            <button
              onClick={() => setActiveSlide(1)}
              className={`relative pb-1 transition cursor-pointer ${
                activeSlide === 1
                  ? "text-slate-900 font-black after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ff6b12] after:rounded-full"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              01
            </button>
            <button
              onClick={() => setActiveSlide(2)}
              className={`relative pb-1 transition cursor-pointer ${
                activeSlide === 2
                  ? "text-slate-900 font-black after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ff6b12] after:rounded-full"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              02
            </button>
            <button
              onClick={() => setActiveSlide(3)}
              className={`relative pb-1 transition cursor-pointer ${
                activeSlide === 3
                  ? "text-slate-900 font-black after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#ff6b12] after:rounded-full"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              03
            </button>
          </div>

          {/* Scroll Down Cue */}
          <div className="flex items-center gap-2 text-slate-500 font-semibold select-none group cursor-pointer hover:text-slate-900 transition">
            {/* Custom Mouse SVG Icon with downward chevron */}
            <div className="flex flex-col items-center">
              <svg
                className="w-3.5 h-4 text-slate-500 group-hover:text-[#ff6b12] transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="2" width="12" height="18" rx="6" />
                <line x1="12" y1="6" x2="12" y2="9" />
              </svg>
              <ChevronDown className="w-3 h-3 -mt-0.5 text-slate-400 group-hover:text-[#ff6b12] transition-colors" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">Scroll Down</span>
            <span className="text-[11px] text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </main>

    </div>
  );
}
