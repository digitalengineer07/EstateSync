"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/api";
import { Receipt, ShieldCheck, Clock, Coins, Info, CheckCircle2, Zap } from "lucide-react";

export default function FundRequestForm() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [walletStats, setWalletStats] = useState(null);
  const [priority, setPriority] = useState("NORMAL");
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    managerId: "",
    fundMode: "LIQUID"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/v1/users/managers`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setManagers(data.managers);
        }
      } catch (error) {
        console.error("Failed to fetch managers", error);
      }
    };

    const fetchWalletStats = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/v1/stats/wallet`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.stats) {
          setWalletStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch wallet stats", error);
      }
    };

    fetchManagers();
    fetchWalletStats();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payloadReason = priority === "URGENT"
      ? `[URGENT] ${formData.reason.trim()}`
      : formData.reason.trim();

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/fund-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          reason: payloadReason
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Fund requisition submitted successfully! Routed to manager queue." });
        setFormData({ amount: "", reason: "", managerId: "", fundMode: "LIQUID" });
        setPriority("NORMAL");
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit request." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-5 flex flex-col justify-between">
      {/* Header & Wallet Balance Snapshot */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Request Wallet Top-Up</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submit a fund requisition to management for your operational wallet balance.</p>
            </div>
          </div>
        </div>

        {/* Live Wallet Context Strip */}
        <div className="mt-4 p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Your Current Balance:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-[11px]">
              Liquid: <strong className="text-slate-900 font-digital font-bold text-xs">₹{Number(walletStats?.availableBalanceLiquid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 text-[11px]">
              Cash: <strong className="text-slate-900 font-digital font-bold text-xs">₹{Number(walletStats?.availableBalanceCash || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs flex flex-col gap-0.5 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span className="font-bold flex items-center gap-1.5">
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
            {message.type === 'error' ? 'Request Failed' : 'Requisition Dispatched'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Approver Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Approver (Manager / Admin) <span className="text-rose-500">*</span>
            </label>
            <select
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
            >
              <option value="" disabled>Select approver (Manager / Admin)...</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.name} ({mgr.role?.name || "Authority"}) — {mgr.email}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Fund Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
                placeholder="e.g. 50000.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Fund Mode</label>
              <select
                name="fundMode"
                value={formData.fundMode}
                onChange={handleChange}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              >
                <option value="LIQUID">Liquid (Online / Bank)</option>
                <option value="CASH">Cash (Physical Currency)</option>
              </select>
            </div>
          </div>

          {/* Priority Pill Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Requisition Urgency
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPriority("NORMAL")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  priority === "NORMAL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Standard (24-48h)</span>
              </button>
              <button
                type="button"
                onClick={() => setPriority("URGENT")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  priority === "URGENT"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Urgent (Site Emergency)</span>
              </button>
            </div>
          </div>

          {/* Reason for Request (Multi-line Textarea) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason & Purpose for Requisition <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              placeholder="e.g. Fuel advance for client site tours, civil testing calibration, emergency site hardware..."
            />
          </div>
        </div>

        {/* Policy & Operational Guidelines Card (Fills Blank Space) */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5 text-indigo-700">
              <Info className="w-4 h-4" /> Requisition & Approval Policy
            </span>
            <span className="text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70 font-mono">
              PRD §14 Wallet
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Routing</span>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-snug">
                Sent to manager's approval queue with priority indicator.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Credit</span>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-snug">
                Funds are immediately credited to your wallet balance on approval.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Settlement</span>
              </div>
              <p className="text-[10.5px] text-slate-500 leading-snug">
                Record receipts under "Expenses" to reconcile utilized funds.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{loading ? "Submitting Requisition..." : "Submit Requisition"}</span>
          </button>
          <span className="text-[11px] text-slate-400 text-center sm:text-right">
            🔒 Dispatches directly to approver dashboard
          </span>
        </div>
      </form>
    </div>
  );
}
