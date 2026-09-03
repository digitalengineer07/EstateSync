"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/api";
import { Receipt } from "lucide-react";

export default function FundRequestForm() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
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
    fetchManagers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/fund-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Fund request submitted to manager!" });
        setFormData({ amount: "", reason: "", managerId: "", fundMode: "LIQUID" });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit request." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Receipt className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Request Wallet Top-Up</h3>
          <p className="text-xs text-slate-500 mt-0.5">Submit a fund requisition to management for your operational wallet balance.</p>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs flex flex-col gap-0.5 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span className="font-bold">{message.type === 'error' ? 'Request Failed' : 'Success'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Approver (Manager / Admin)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
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
                <option value="CASH">Cash (Physical)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Reason for Request</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              placeholder="e.g. Client travel to Mumbai, Project audit..."
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Submitting Request..." : "Submit Requisition"}
          </button>
        </div>
      </form>
    </div>
  );
}
