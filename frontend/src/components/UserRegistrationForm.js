"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { UserPlus, Wallet, CheckCircle2, XCircle } from "lucide-react";

export default function UserRegistrationForm() {
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/v1/users/roles`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setRoles(data.roles);
        } else {
          console.error("Failed to fetch roles:", data.message);
          setMessage({ type: "error", text: `Error loading roles: ${data.message}` });
        }
      } catch (error) {
        console.error("Failed to fetch roles", error);
        setMessage({ type: "error", text: `Network error loading roles: ${error.message}` });
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "User profile & operational wallet registered successfully!" });
        setFormData({ name: "", email: "", password: "", roleId: "" });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to register user." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 flex flex-col justify-between h-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Register New User</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a new user profile and automatically provision their financial wallet.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 shrink-0">
          System Provisioning
        </span>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 outline-none transition"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 outline-none transition"
                placeholder="jane@estatesync.local"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 outline-none transition"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                name="roleId"
                value={formData.roleId}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 bg-slate-50/50 outline-none transition"
              >
                <option value="" disabled>Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} — {role.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Automatic Wallet Provisioning Notice to balance card height */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Auto-Wallet Provisioning:</span> When a new user profile is created, active Liquid and Cash financial wallets are automatically initialized with 0 starting balance, ready for direct fund allocations.
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-150 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? "Registering..." : "Create User"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
