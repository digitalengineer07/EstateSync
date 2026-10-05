"use client";

import { useState } from "react";
import Link from "next/link";
import HomeClock from "@/components/HomeClock";
import {
  Menu,
  X,
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
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

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




            </nav>
          </div>

          {/* Right Header: LAND | PEOPLE | FINANCE | GROWTH (Aligned horizontally with nav links) */}
          <div className="flex items-center gap-3">


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




            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#ff6b12] rounded-xl shadow-xs"
              >
                Sign In to Portal →
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
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between self-stretch max-w-[490px] xl:max-w-[530px] 2xl:max-w-[560px] pt-1 pb-4 sm:pb-5 lg:pb-7 xl:pb-8">

            {/* Top Hero Narrative Group (Shifted downwards while preserving bottom content position) */}
            <div className="flex flex-col pt-5 sm:pt-7 lg:pt-10 xl:pt-12">
              {/* Eyebrow Label with Orange Accent Dash */}
              <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3">
                <span className="w-7 h-[2.5px] bg-[#ff6b12] rounded-full inline-block" />
                <p className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                  AG HOMES INDIA PVT. LTD.
                </p>
              </div>

              {/* Editorial Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] xl:text-[46px] 2xl:text-[52px] font-black text-slate-950 tracking-tight leading-[1.04]">
                EstateSync<br />
                  <span className="text-[#ff6b12]">Workspace</span>
                </h1>

              {/* Value Proposition Description */}
              <p className="mt-3 sm:mt-3.5 text-xs sm:text-[13px] lg:text-[13.5px] xl:text-[14.5px] text-slate-500 leading-relaxed font-normal max-w-[460px] xl:max-w-[490px]">
                The accounts and operations workspace for AG Homes India Pvt. Ltd. Access customer collections, property payments and day-to-day financial records.
              </p>

              <div className="mt-5 max-w-[460px] border-l-2 border-[#ff6b12]/60 pl-4">
                <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-slate-800">Accounts, with every detail in view.</h2>
                <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-500">
                  Review receipts and expenses, follow outstanding balances, and refer to ledger entries and supporting documents as part of your daily accounts work.
                </p>
              </div>
              <HomeClock />

              {/* Primary CTA with Tactile Click Animation & Expanding Ripple */}
              <div className="mt-4 sm:mt-5 flex items-center">
                <Link
                  href="/login"
                  onClick={handleButtonClick}
                  className="relative overflow-hidden inline-flex items-center justify-center gap-2 h-11 sm:h-11.5 px-6 sm:px-7 rounded-xl bg-[#ff6b12] text-white font-extrabold text-xs sm:text-[13px] shadow-[0_12px_24px_-4px_rgba(255,107,18,0.55)] hover:bg-[#f25f05] hover:shadow-[0_16px_28px_-4px_rgba(255,107,18,0.7)] hover:-translate-y-0.5 active:translate-y-1 active:scale-[0.95] active:shadow-[0_4px_10px_-2px_rgba(255,107,18,0.45)] transition-all duration-200 active:duration-75 group select-none cursor-pointer"
                >
                  {/* Expanding Click Ripple Wave */}
                  <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    {ripples.map((ripple) => (
                      <span
                        key={ripple.id}
                        className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/45 animate-btn-ripple pointer-events-none"
                        style={{
                          left: ripple.x,
                          top: ripple.y,
                        }}
                      />
                    ))}
                  </span>

                  <span className="relative z-10 transition-transform duration-150 active:scale-95">Sign In to Portal</span>
                  <span className="relative z-10 text-sm font-bold transition-transform duration-200 group-hover:translate-x-1.5 active:translate-x-2.5">→</span>
                </Link>
              </div>
            </div>

            {/* Bottom Proof & Capabilities Group (Shifted upwards with clean bottom clearance) */}

          </div>

          {/* ===================================================================== */}
          {/* RIGHT VISUAL AREA (Floating Glassmorphic KPI Cards on Desktop)       */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 relative w-full flex flex-col justify-between min-h-0 pointer-events-none self-stretch py-1">

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




            </div>

            {/* Desktop Floating Glassmorphic Metric Cards (Moved upwards & shifted rightwards) */}


            {/* Desktop Lower Right Brand Statement */}


          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER (Left-Hand Side Centered Legal & Support Links)                    */}
        {/* ========================================================================= */}
        <div className="pb-3 sm:pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 shrink-0">

          {/* Left-Hand Side Center: Privacy, Terms & Conditions, Support Buttons (Shifted upwards via transform) */}
          <div className="w-full max-w-[490px] xl:max-w-[530px] 2xl:max-w-[560px] flex items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-[11.5px] font-semibold text-slate-500 select-none transform -translate-y-2 sm:-translate-y-3 lg:-translate-y-4">
            <Link
              href="/privacy"
              className="px-2.5 py-1 rounded-lg hover:bg-black/5 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Privacy
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/terms"
              className="px-2.5 py-1 rounded-lg hover:bg-black/5 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/support"
              className="px-2.5 py-1 rounded-lg hover:bg-black/5 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
