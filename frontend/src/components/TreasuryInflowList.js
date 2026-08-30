"use client";

import { useState, useEffect } from "react";
import RecordBankInflowModal from "./RecordBankInflowModal";
import { Landmark, Plus, Search, RefreshCw, ArrowDownRight, ShieldCheck, FileCheck } from "lucide-react";
import { API_URL } from "@/config/api";

export default function TreasuryInflowList({ userRole = "ACCOUNTING" }) {
  const [inflows, setInflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchInflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/treasury/inflows`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInflows(data.inflows || []);
      }
    } catch (err) {
      console.error("Failed to load treasury inflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInflows();
  }, []);

  const handleInflowSuccess = (data) => {
    setToastMessage(data.message || "Bank inflow successfully posted to Corporate Treasury.");
    fetchInflows();
    setTimeout(() => setToastMessage(null), 6000);
  };

  const filteredInflows = inflows.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.description?.toLowerCase().includes(q) ||
      item.referenceId?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      item.createdBy?.toLowerCase().includes(q)
    );
  });

  const totalInflowAmount = inflows.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Corporate Treasury & Bank Inflow Audit
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {inflows.length} Deposits Recorded
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank statement vouchers, capital additions, and promoter equity credited directly into Main Organization Treasury.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bank Inflows</span>
            <span className="text-sm font-extrabold text-emerald-700">
              ₹{totalInflowAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Record Bank Statement Inflow</span>
          </button>

          <button
            onClick={fetchInflows}
            disabled={loading}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
            title="Refresh Inflow Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by UTR, Bank Name, Inflow Narration, or User..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Inflows Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Inflow Category</th>
              <th className="px-4 py-3">Bank Reference / UTR</th>
              <th className="px-4 py-3">Description / Narration</th>
              <th className="px-4 py-3 text-right">Inflow Amount (₹)</th>
              <th className="px-4 py-3">Recorded By</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading Corporate Treasury Bank Inflows...
                </td>
              </tr>
            ) : filteredInflows.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-slate-400">
                  <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No Bank Statement Inflows Recorded Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Record Bank Statement Inflow" to deposit capital or bank receipts into the Main Organization Treasury.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInflows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowDownRight className="w-3 h-3" />
                      {item.type === "CAPITAL_INFUSION" ? "Capital Infusion" : item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                    {item.referenceId || "N/A"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 max-w-xs truncate" title={item.description}>
                    {item.description}
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                    +₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-medium text-[11px]">
                    {item.createdBy}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {item.status || "COMPLETED"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Inflow Modal */}
      <RecordBankInflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleInflowSuccess}
      />
    </div>
  );
}
