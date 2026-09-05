"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ShieldCheck, Briefcase, Megaphone, Layers, Landmark } from "lucide-react";

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

  const handleSelectDemoUser = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  const demoRoles = [
    { label: "Sales Panel", email: "sales@estatesync.local", icon: Briefcase, color: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
    { label: "Marketing Panel", email: "marketing@estatesync.local", icon: Megaphone, color: "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100" },
    { label: "Admin Hub", email: "admin@estatesync.local", icon: ShieldCheck, color: "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" },
    { label: "Manager Hub", email: "manager@estatesync.local", icon: Layers, color: "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" },
    { label: "Accounting Hub", email: "accounting@estatesync.local", icon: Landmark, color: "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100" }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-md mb-3">
            ES
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Estate<span className="text-indigo-600">Sync</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your organizational portal</p>
        </div>

        {/* Quick Demo Selector */}
        <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Quick Role Sign-In
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Pass: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-slate-700">password123</code>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {demoRoles.map((role) => {
              const Icon = role.icon;
              const isSelected = email === role.email;
              return (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => handleSelectDemoUser(role.email)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition text-left ${
                    isSelected
                      ? "ring-2 ring-indigo-500 " + role.color
                      : role.color
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{role.label}</span>
                </button>
              );
            })}
          </div>
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
