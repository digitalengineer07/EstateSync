"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Read and clear the session-expired message from sessionStorage on mount
  useEffect(() => {
    const msg = sessionStorage.getItem("authMessage");
    if (msg) {
      setSessionMessage(msg);
      sessionStorage.removeItem("authMessage");
    }
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-md mb-3">
            ES
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Estate<span className="text-indigo-600">Sync</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your organizational portal</p>
        </div>

        {/* Session-expired / auth message banner */}
        {sessionMessage && (
          <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm font-medium">
            <span>{sessionMessage}</span>
          </div>
        )}

        {/* Login error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@estatesync.local"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 active:scale-[0.99] transition duration-150 ease-in-out disabled:opacity-50 shadow-md shadow-indigo-600/20"
          >
            {isLoading ? "Signing in..." : "Sign In to Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            EstateSync™ • A Product of <span className="font-semibold text-slate-700">Devoxa Technologies Pvt. Ltd.</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            © {new Date().getFullYear()} All rights reserved. Registered Trademark ®
          </p>
        </div>
      </div>
    </div>
  );
}
