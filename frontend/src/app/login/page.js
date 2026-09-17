"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Building2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const msg = sessionStorage.getItem("authMessage") || "";
    if (msg) sessionStorage.removeItem("authMessage");
    return msg;
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setIsLoading(true);
    setError("");
    setSessionMessage("");

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 sm:px-6 lg:px-10 py-6 flex items-center">
      <div className="max-w-[1180px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 items-stretch">
        <section className="hidden lg:block relative overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-900 min-h-[640px] shadow-[0_20px_42px_-28px_rgba(20,20,20,0.55)]">
          <div
            aria-label="Real estate property and finance workspace"
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/80 via-zinc-950/35 to-transparent" />
          <div className="absolute top-8 left-8 right-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ff6b12] text-white flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-300">EstateSync</p>
                <h1 className="text-2xl font-black text-white">Treasury Portal</h1>
              </div>
            </div>
          </div>

          <div className="absolute left-8 right-8 bottom-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-5">
              <ShieldCheck className="w-5 h-5 text-[#ff6b12]" />
              <p className="mt-4 text-3xl font-black text-zinc-950">Audit</p>
              <p className="text-sm font-semibold text-zinc-500 mt-1">Role-based access and traceable finance actions</p>
            </div>
            <div className="rounded-2xl bg-[#27272a] p-5 text-white">
              <LockKeyhole className="w-5 h-5 text-[#ff6b12]" />
              <p className="mt-4 text-3xl font-black">Secure</p>
              <p className="text-sm font-semibold text-zinc-300 mt-1">Protected operational login for internal teams</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[24px] border border-zinc-200 shadow-[0_20px_42px_-28px_rgba(20,20,20,0.55)] p-6 sm:p-8 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff6b12] text-white shadow-[0_12px_24px_-14px_rgba(255,107,18,0.9)] mb-5">
              <Building2 className="w-7 h-7" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ff6b12]">Welcome back</p>
            <h2 className="text-4xl font-black text-zinc-950 tracking-tight mt-2">Sign in</h2>
            <p className="text-sm text-zinc-500 mt-2">Access your EstateSync organizational dashboard.</p>
          </div>

          {sessionMessage && (
            <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl text-sm font-bold">
              {sessionMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@estatesync.local"
                className="w-full h-12 px-4 text-sm border border-zinc-200 rounded-xl bg-[#fafafa] focus:ring-2 focus:ring-[#ff6b12]/25 focus:border-[#ff6b12] text-zinc-950 placeholder:text-zinc-400 outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-600 hover:text-[#ff6b12] font-extrabold flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full h-12 px-4 text-sm border border-zinc-200 rounded-xl bg-[#fafafa] focus:ring-2 focus:ring-[#ff6b12]/25 focus:border-[#ff6b12] text-zinc-950 placeholder:text-zinc-400 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#ff6b12] text-white font-extrabold rounded-xl hover:bg-[#f25f05] active:scale-[0.99] transition disabled:opacity-50 shadow-[0_12px_24px_-16px_rgba(255,107,18,0.9)]"
            >
              {isLoading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 font-semibold">
              EstateSync™ by <span className="font-extrabold text-zinc-900">Devoxa Technologies Pvt. Ltd.</span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              © {new Date().getFullYear()} All rights reserved. Registered Trademark ®
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
