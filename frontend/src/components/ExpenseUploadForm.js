"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/api";
import { CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ExpenseUploadForm() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
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
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/v1/expenses/categories`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories);
        } else {
          console.error("Failed to fetch categories:", data.message);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
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
        setFormData({ ...formData, amount: "", description: "", reference: "", fundMode: "LIQUID" });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to record expense." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred." });
    }
    setLoading(false);
  };

  const handleQuickAmount = (val) => {
    setFormData(prev => ({ ...prev, amount: val.toString() }));
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-5 flex flex-col justify-between">
      <div className="space-y-4">
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₹)</label>
                {formData.amount && (
                  <span className="font-digital text-xs font-bold text-rose-600">
                    -₹{parseFloat(formData.amount || 0).toLocaleString('en-IN')}
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
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium font-digital"
                placeholder="e.g. 1500.00"
              />
              {/* Quick Expense Preset Chips */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[200, 500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-[10px] font-semibold text-slate-600 border border-slate-200/80 transition"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Payment Mode</label>
              <select
                name="fundMode"
                value={formData.fundMode}
                onChange={handleChange}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-900 font-medium"
              >
                <option value="LIQUID">Liquid (Online / Bank)</option>
                <option value="CASH">Cash (Physical)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {formData.fundMode === "LIQUID" ? "Deducts from active liquid balance" : "Deducts from active cash in hand"}
              </span>
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

          {/* Audit & Compliance Policy Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-800 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Audit & Expense Compliance
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 font-semibold">
                Instant Ledger Posting
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Wallet Balance:</strong> Debited in real-time from your active {formData.fundMode === "LIQUID" ? "Liquid" : "Cash"} balance.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-indigo-600 mt-0.5 shrink-0" />
                <span><strong>Voucher Proof:</strong> Retain original invoices or vendor cash memos for audit review.</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{loading ? "Recording Expense..." : "Submit Expense"}</span>
            </button>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Instant ledger entry
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
