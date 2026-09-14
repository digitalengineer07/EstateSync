"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/api";
import { CreditCard } from "lucide-react";

export default function ExpenseUploadForm() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [wallet, setWallet] = useState({ liquid: 0, cash: 0 });
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    vendorId: "",
    reference: "",
    fundMode: "LIQUID"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        // 1. Fetch Categories
        const catRes = await fetch(`${API_URL}/api/v1/expenses/categories`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories);
        }

        // 2. Fetch User Wallet Balances
        const walletRes = await fetch(`${API_URL}/api/v1/dashboard/wallet`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const walletData = await walletRes.json();
        if (walletData.success && walletData.stats) {
          const liquid = parseFloat(walletData.stats.availableBalanceLiquid || 0);
          const cash = parseFloat(walletData.stats.availableBalanceCash || 0);
          setWallet({ liquid, cash });
          // If liquid is 0 but cash is available, automatically select CASH mode!
          if (liquid <= 0 && cash > 0) {
            setFormData(prev => ({ ...prev, fundMode: "CASH" }));
          }
        }
      } catch (error) {
        console.error("Failed to load initial data for expense form", error);
      }
    };
    fetchInitialData();
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
      const res = await fetch(`${API_URL}/api/v1/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Expense recorded successfully!" });
        setFormData(prev => ({
          ...prev,
          amount: "",
          description: "",
          reference: ""
        }));
        // Update local wallet estimate and trigger global dashboard refresh
        const amt = parseFloat(formData.amount || 0);
        if (formData.fundMode === "CASH") {
          setWallet(prev => ({ ...prev, cash: Math.max(0, prev.cash - amt) }));
        } else {
          setWallet(prev => ({ ...prev, liquid: Math.max(0, prev.liquid - amt) }));
        }
        window.dispatchEvent(new Event("estatesync:data-refresh"));
      } else {
        setMessage({ type: "error", text: data.message || "Failed to record expense." });
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
          <CreditCard className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Record Wallet Expense</h3>
          <p className="text-xs text-slate-500 mt-0.5">Submit personal expenditure against your active petty cash or liquid wallet.</p>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs flex flex-col gap-0.5 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span className="font-bold">{message.type === 'error' ? 'Transaction Failed' : 'Success'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₹)</label>
              {parseFloat(formData.amount || 0) > (formData.fundMode === 'CASH' ? wallet.cash : wallet.liquid) && (
                <span className="text-[10.5px] font-bold text-rose-600">
                  Exceeds {formData.fundMode === 'CASH' ? 'Cash' : 'Liquid'}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              placeholder="e.g. 1500.00"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Mode</label>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                Avail: ₹{(formData.fundMode === 'CASH' ? wallet.cash : wallet.liquid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <select
              name="fundMode"
              value={formData.fundMode}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium font-sans"
            >
              <option value="LIQUID">Liquid (Online / Bank) — ₹{wallet.liquid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</option>
              <option value="CASH">Cash (Physical) — ₹{wallet.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</option>
            </select>
            {formData.fundMode === 'LIQUID' && wallet.liquid === 0 && wallet.cash > 0 && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                💡 Tip: You have ₹{wallet.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in Cash. Select "Cash (Physical)" to spend.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Category</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
            >
              <option value="" disabled>Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              placeholder="What was this expense for? (e.g. Travel, Client Lunch, Office Stationary)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Reference / Invoice # (Optional)</label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              placeholder="e.g. INV-10294 / Bill ref"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Recording Expense..." : "Submit Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
