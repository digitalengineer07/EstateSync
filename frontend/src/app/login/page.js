"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Users,
  Layers,
  ChevronRight,
  Headphones,
  X,
  Phone,
  Clock,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";

function EstateSyncLogoMark({ className = "w-10 h-10" }) {
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const msg = sessionStorage.getItem("authMessage") || "";
    if (msg) sessionStorage.removeItem("authMessage");
    return msg;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [policyModal, setPolicyModal] = useState({ open: false, title: "", content: "" });

  const { login } = useAuth();

  // Retrieve remembered email on initial mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("estatesync_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage access issues
    }
  }, []);

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setIsLoading(true);
    setError("");
    setSessionMessage("");

    // Manage client-side Remember Me persistence
    try {
      if (rememberMe && email) {
        localStorage.setItem("estatesync_remembered_email", email.trim());
      } else {
        localStorage.removeItem("estatesync_remembered_email");
      }
    } catch {
      // Ignore storage errors
    }

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const featureItems = [
    {
      icon: TrendingUp,
      title: "Real-time",
      subtitle: "Financial Insights",
    },
    {
      icon: ShieldCheck,
      title: "Secure",
      subtitle: "& Role Based Access",
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
    <main className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#0c1015] relative flex items-center justify-center p-2 sm:p-4 lg:p-5 xl:p-6 lg:overflow-hidden font-sans selection:bg-[#ff6b12]/30 selection:text-white">
      {/* Ambient background blur elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 scale-105 filter blur-xl"
          style={{ backgroundImage: "url('/images/login/luxury-office-sunset.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
      </div>

      {/* Main Split-Screen Container - Wider & Viewport-Constrained */}
      <div className="relative z-10 w-full max-w-[1560px] 2xl:max-w-[1680px] lg:h-[min(840px,93vh)] xl:h-[min(810px,91vh)] rounded-[22px] sm:rounded-[28px] lg:rounded-[32px] overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.7)] grid grid-cols-1 lg:grid-cols-[1.22fr_1fr] bg-[#12161f]">
        
        {/* ================================================================ */}
        {/* LEFT VISUAL PANEL (Corporate Office Skyline + Feature Highlights) */}
        {/* ================================================================ */}
        <section className="relative hidden lg:flex flex-col justify-between p-6 sm:p-8 lg:p-8 xl:p-10 overflow-hidden select-none min-h-0">
          {/* Background image */}
          <div
            role="img"
            aria-label="EstateSync corporate executive workspace overlooking sunset skyline"
            className="absolute inset-0 bg-cover bg-center transform scale-[1.01] transition-transform duration-1000 ease-out"
            style={{
              backgroundImage: "url('/images/login/luxury-office-sunset.jpg')",
            }}
          />

          {/* Dark gradient & atmospheric overlays to guarantee contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent pointer-events-none" />

          {/* Top Row: Brand Header + Micro Navigation */}
          <header className="relative z-10 flex items-center justify-between">
            {/* EstateSync Logo */}
            <div className="flex items-center gap-3">
              <div className="shadow-lg shadow-orange-950/40 rounded-xl overflow-hidden flex-shrink-0">
                <EstateSyncLogoMark className="w-10 h-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl lg:text-2xl font-black tracking-tight text-white leading-none">
                  Estate<span className="text-[#ff6b12]">Sync</span>
                </span>
                <span className="text-[9.5px] font-bold tracking-[0.24em] text-zinc-300 uppercase mt-1">
                  TREASURY & ACCOUNTING
                </span>
              </div>
            </div>

            {/* Micro Navigation */}
            <nav
              aria-label="Core Values"
              className="text-[10px] lg:text-[10.5px] font-semibold text-zinc-300/80 tracking-[0.22em] flex items-center gap-2 uppercase select-none"
            >
              <span className="hover:text-white transition-colors">TRUST</span>
              <span className="text-zinc-500/80">|</span>
              <span className="hover:text-white transition-colors">TRANSPARENCY</span>
              <span className="text-zinc-500/80">|</span>
              <span className="hover:text-white transition-colors">GROWTH</span>
            </nav>
          </header>

          {/* Middle Section: Main Headline + Platform Description + 4 Features */}
          <div className="relative z-10 my-auto py-3 lg:py-4">
            <h1 className="text-3xl lg:text-[38px] xl:text-[43px] font-black text-white leading-[1.14] tracking-tight">
              Turning<br />
              Real Estate Vision<br />
              into <span className="text-[#ff6b12]">Financial Clarity</span>
            </h1>

            <p className="text-xs lg:text-[13.5px] text-zinc-200/90 font-normal leading-relaxed max-w-lg mt-3.5">
              A unified platform for treasury management, customer collections, property acquisitions,
              expenses and double-entry accounting.
            </p>

            {/* 2x2 Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5 lg:gap-3 mt-5 lg:mt-6 max-w-[500px]">
              {featureItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    className="group bg-black/40 hover:bg-black/55 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-xl lg:rounded-2xl p-2.5 lg:p-3 flex items-center gap-3 transition-all duration-200"
                  >
                    <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-[#ff6b12]/15 border border-[#ff6b12]/25 flex items-center justify-center text-[#ff6b12] flex-shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] lg:text-[10.5px] font-medium text-zinc-300/80 leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[11px] lg:text-xs font-bold text-white leading-tight mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Statement Quote */}
          <footer className="relative z-10 pt-2">
            <p className="text-xs lg:text-[13px] font-semibold text-zinc-200 italic tracking-wide">
              &ldquo;Strong Finances. Stronger Foundations.&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-5 h-[2px] bg-[#ff6b12] rounded-full inline-block" />
              <span className="text-[11px] font-bold text-zinc-400 tracking-wider">EstateSync</span>
            </div>
          </footer>
        </section>

        {/* ================================================================ */}
        {/* RIGHT AUTHENTICATION PANEL (Clean Light Aesthetic)               */}
        {/* ================================================================ */}
        <section className="relative flex flex-col justify-between p-5 sm:p-7 lg:p-7 xl:p-9 bg-[#fdfdfd] overflow-hidden min-h-0">
          {/* Light wave abstract background */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: "url('/images/login/auth-card-wave-bg.jpg')" }}
          />

          {/* Orange wave ribbon decoration at bottom */}
          <div
            className="absolute -bottom-2 left-0 right-0 h-32 pointer-events-none opacity-40 bg-bottom bg-no-repeat bg-contain"
            style={{ backgroundImage: "url('/images/login/orange-wave-ribbon.png')" }}
          />

          {/* Top Brand Header for Authentication */}
          <div className="relative z-10">
            {/* Mobile-only logo display */}
            <div className="flex lg:hidden items-center gap-3 mb-4">
              <EstateSyncLogoMark className="w-8 h-8" />
              <div>
                <span className="text-lg font-black text-zinc-950">
                  Estate<span className="text-[#ff6b12]">Sync</span>
                </span>
                <span className="block text-[8.5px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                  TREASURY & ACCOUNTING
                </span>
              </div>
            </div>

            <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
              WELCOME TO
            </div>
            <div className="mt-0.5">
              <span className="text-2xl lg:text-[28px] font-black text-zinc-950 tracking-tight leading-none">
                Estate<span className="text-[#ff6b12]">Sync</span>
              </span>
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-zinc-400 mt-0.5">
              TREASURY & ACCOUNTING
            </div>

            {/* Subtle orange divider */}
            <div className="w-8 h-[3px] bg-[#ff6b12] rounded-full mt-2.5 mb-2" />

            <p className="text-xs text-zinc-600 font-medium">
              Sign in to access your organizational dashboard.
            </p>

            {/* Session notice */}
            {sessionMessage && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{sessionMessage}</span>
              </div>
            )}

            {/* Backend error notice */}
            {error && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="relative z-10 my-auto py-2 space-y-3">
            {/* Email Address */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-[11px] font-bold text-zinc-700 mb-1 uppercase tracking-[0.08em]"
              >
                Email Address
              </label>
              <div className="relative flex items-center rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-xs transition shadow-xs focus-within:border-[#ff6b12] focus-within:ring-2 focus-within:ring-[#ff6b12]/20">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="email-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@estatesync.local"
                  className="w-full h-11 pl-10 pr-4 text-xs lg:text-sm text-zinc-900 placeholder:text-zinc-400 bg-transparent rounded-xl outline-none font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password-input"
                  className="text-[11px] font-bold text-zinc-700 uppercase tracking-[0.08em]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-[11px] font-bold text-[#ff6b12] hover:text-[#ea580c] transition cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-xs transition shadow-xs focus-within:border-[#ff6b12] focus-within:ring-2 focus-within:ring-[#ff6b12]/20">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-10 pr-10 text-xs lg:text-sm text-zinc-900 placeholder:text-zinc-400 bg-transparent rounded-xl outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-700 transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-[#ff6b12] focus:ring-[#ff6b12] accent-[#ff6b12] cursor-pointer"
                />
                <span className="text-xs font-semibold text-zinc-700">Remember me</span>
              </label>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] lg:h-[48px] rounded-xl bg-gradient-to-r from-[#ff6b12] to-[#ff5100] hover:from-[#f25f05] hover:to-[#e64700] text-white font-bold text-xs lg:text-sm tracking-wide shadow-[0_10px_22px_-6px_rgba(255,107,18,0.7)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>

            {/* OR Divider */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="border-t border-zinc-200/90 w-full" />
              <span className="absolute bg-[#f9f9fa] px-3 text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                OR
              </span>
            </div>

            {/* Support Action Button */}
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="w-full h-[42px] lg:h-[44px] rounded-xl border border-zinc-200/90 bg-white/80 hover:bg-white text-zinc-700 hover:text-zinc-950 font-semibold text-xs transition flex items-center justify-between px-3.5 shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:text-[#ff6b12] transition-colors">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>Need Help? Contact Support</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Footer Area */}
          <footer className="relative z-10 pt-2 border-t border-zinc-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-zinc-500">
            <div>
              <p className="text-[10.5px] font-bold text-zinc-700">
                A Product of Devoxa Technologies Pvt. Ltd.
              </p>
              <p className="text-[9.5px] text-zinc-400 mt-0.5">
                © {new Date().getFullYear()} All rights reserved. | EstateSync®
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] font-medium text-zinc-500">
              <button
                type="button"
                onClick={() =>
                  setPolicyModal({
                    open: true,
                    title: "Privacy Policy",
                    content:
                      "EstateSync respects your organizational privacy. All financial records, customer collections, and treasury balances are stored securely in compliant enterprise vaults with strict RBAC boundaries.",
                  })
                }
                className="hover:text-zinc-900 transition underline-offset-2 hover:underline cursor-pointer"
              >
                Privacy
              </button>
              <span className="text-zinc-300">|</span>
              <button
                type="button"
                onClick={() =>
                  setPolicyModal({
                    open: true,
                    title: "Terms of Service",
                    content:
                      "Access to the EstateSync Treasury & Accounting platform is authorized exclusively for verified personnel of licensed organizations. Traceable double-entry auditing applies to all operational entries.",
                  })
                }
                className="hover:text-zinc-900 transition underline-offset-2 hover:underline cursor-pointer"
              >
                Terms
              </button>
              <span className="text-zinc-300">|</span>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="hover:text-zinc-900 transition underline-offset-2 hover:underline cursor-pointer"
              >
                Support
              </button>
            </div>
          </footer>
        </section>
      </div>



      {/* ================================================================ */}
      {/* SUPPORT DESK MODAL                                               */}
      {/* ================================================================ */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ff6b12] text-white flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">EstateSync Support Desk</h3>
                  <p className="text-[11px] text-zinc-300 font-medium">Devoxa Technologies Team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-zinc-700">
              <p className="text-xs text-zinc-600 leading-relaxed">
                For login assistance, credential reset, or role assignments, please contact our
                technical support team directly:
              </p>

              <div className="space-y-2.5">
                <a
                  href="mailto:devoxatechnologies@gmail.com"
                  className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-orange-50 hover:border-orange-200 transition flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff6b12] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email Support</div>
                    <div className="text-xs font-bold text-zinc-900 group-hover:text-[#ff6b12] transition">
                      devoxatechnologies@gmail.com
                    </div>
                  </div>
                </a>

                <a
                  href="tel:+918544005858"
                  className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-orange-50 hover:border-orange-200 transition flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff6b12] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Direct Helpline</div>
                    <div className="text-xs font-bold text-zinc-900 group-hover:text-[#ff6b12] transition">
                      +91 8544005858
                    </div>
                  </div>
                </a>

                <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Operational Hours</div>
                    <div className="text-xs font-semibold text-zinc-700">Mon &ndash; Sat, 9:00 AM &ndash; 7:00 PM IST</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TERMS & PRIVACY POLICY MODAL                                     */}
      {/* ================================================================ */}
      {policyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden">
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">{policyModal.title}</h3>
              <button
                type="button"
                onClick={() => setPolicyModal({ open: false, title: "", content: "" })}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-6 text-xs text-zinc-600 leading-relaxed">
              {policyModal.content}
            </div>
            <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPolicyModal({ open: false, title: "", content: "" })}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
