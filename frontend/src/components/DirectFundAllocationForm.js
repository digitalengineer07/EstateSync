"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { Coins, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

export default function DirectFundAllocationForm({ onAllocationSuccess }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    targetUserId: "",
    amount: "",
    fundMode: "LIQUID",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/users/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickAmount = (val) => {
    setFormData({ ...formData, amount: val.toString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/fund-requests/allocate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: data.message || "Funds successfully allocated!"
        });
        setFormData({ targetUserId: "", amount: "", fundMode: "LIQUID", description: "" });
        fetchUsers();
        if (onAllocationSuccess) onAllocationSuccess();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to allocate funds."
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred during allocation." });
    }
    setSubmitting(false);
  };

  const selectedUser = users.find(u => u.id === formData.targetUserId);

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 flex flex-col justify-between h-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Direct Fund Allocation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Push funds directly from the organization reserve into a manager or team member wallet.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 shrink-0">
          Admin Only
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipient (Manager / Team Member)
            </label>
            <select
              name="targetUserId"
              value={formData.targetUserId}
              onChange={handleChange}
              required
              disabled={loadingUsers}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 bg-slate-50/50 outline-none transition"
            >
              <option value="" disabled>
                {loadingUsers ? "Loading users..." : "Select recipient to allocate funds..."}
              </option>
              {users.map((u) => {
                const balance = u.wallet?.availableBalance
                  ? parseFloat(u.wallet.availableBalance).toLocaleString('en-IN')
                  : "0";
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.name || "User"}) — Current Balance: ₹{balance}
                  </option>
                );
              })}
            </select>
            {selectedUser && (
              <div className="text-xs text-slate-500 mt-1.5 flex gap-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span>
                  Liquid:{" "}
                  <span className="font-bold text-slate-800">
                    ₹{parseFloat(selectedUser.wallet?.availableBalanceLiquid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </span>
                <span>
                  Cash:{" "}
                  <span className="font-bold text-slate-800">
                    ₹{parseFloat(selectedUser.wallet?.availableBalanceCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Allocation Mode
              </label>
              <select
                name="fundMode"
                value={formData.fundMode}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 bg-slate-50/50 outline-none transition"
              >
                <option value="LIQUID">Liquid (Online / Bank)</option>
                <option value="CASH">Cash (Physical)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Allocation Amount (₹)
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <span className="text-slate-400 font-bold text-sm">₹</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  placeholder="50000.00"
                  className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 font-medium outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
              {[10000, 25000, 50000, 100000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200/80 transition active:scale-95"
                >
                  +₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Allocation Notes
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. Q3 Sales Team operational budget top-up"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 outline-none transition"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || loadingUsers}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-150 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{submitting ? "Allocating Funds..." : "Confirm & Allocate Funds"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
