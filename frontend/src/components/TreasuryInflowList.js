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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Header & Unified Right-Top Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100">
        {/* Left Side: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Corporate Treasury & Bank Inflow Audit
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Landmark className="w-3.5 h-3.5" />
              <span>Main Treasury</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Bank statement vouchers, capital additions, and promoter equity credited directly into Main Organization Treasury.
          </p>
        </div>

        {/* Right Top Corner: All Controls in a Single Horizontal Line */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap self-start xl:self-auto shrink-0">
          {/* Search Bar */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by UTR, narration..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Total Inflows Metric Label */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs whitespace-nowrap">
            <span className="text-slate-400 text-[11px]">Total:</span>
            <span className="font-bold text-slate-900 font-sans">
              ₹{totalInflowAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Deposits Count Label */}
          <span className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl whitespace-nowrap">
            {inflows.length} {inflows.length === 1 ? 'Deposit' : 'Deposits'}
          </span>

          {/* Record Inflow Primary Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Bank Inflow</span>
          </button>

          {/* Refresh Icon Button */}
          <button
            onClick={fetchInflows}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh Inflow Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Inflows Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Inflow Category</th>
                <th className="px-5 py-3.5">Bank Reference / UTR</th>
                <th className="px-5 py-3.5">Description / Narration</th>
                <th className="px-5 py-3.5 text-right">Inflow Amount (₹)</th>
                <th className="px-5 py-3.5">Recorded By</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading Corporate Treasury Bank Inflows...
                  </td>
                </tr>
              ) : filteredInflows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-14 text-center text-slate-400">
                    <FileCheck className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No Bank Statement Inflows Recorded Yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "Record Bank Statement Inflow" to deposit capital or bank receipts into the Main Organization Treasury.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInflows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {item.type === "CAPITAL_INFUSION" ? "Capital Infusion" : item.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80 tracking-wide select-all">
                        {item.referenceId || "N/A"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 max-w-xs truncate font-medium" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono font-black text-emerald-700 text-sm bg-emerald-50/80 px-3 py-1 rounded-lg border border-emerald-200/60 inline-block shadow-2xs">
                        +₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium text-[11px]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                          {(item.createdBy || "U").charAt(0).toUpperCase()}
                        </span>
                        <span>{item.createdBy}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {item.status || "COMPLETED"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
