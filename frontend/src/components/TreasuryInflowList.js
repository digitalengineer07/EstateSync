"use client";

import { useState, useEffect } from "react";
import RecordBankInflowModal from "./RecordBankInflowModal";
import { Landmark, Plus, Search, RefreshCw, ArrowDownRight, ArrowUpRight, ShieldCheck, FileCheck, ArrowLeftRight } from "lucide-react";
import { API_URL } from "@/config/api";

export default function TreasuryInflowList({ userRole = "ACCOUNTING" }) {
  const [cashflows, setCashflows] = useState([]);
  const [summary, setSummary] = useState({ totalInflow: 0, totalOutflow: 0, netCashflow: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [flowFilter, setFlowFilter] = useState("all"); // "all", "inflows", "outflows"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchCashflow = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/treasury/cashflow`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCashflows(data.items || []);
        setSummary(data.summary || { totalInflow: 0, totalOutflow: 0, netCashflow: 0 });
      }
    } catch (err) {
      console.error("Failed to load treasury cashflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashflow();
  }, []);

  const handleInflowSuccess = (data) => {
    setToastMessage(data.message || "Bank inflow successfully posted to Corporate Treasury.");
    fetchCashflow();
    setTimeout(() => setToastMessage(null), 6000);
  };

  const filteredItems = cashflows.filter((item) => {
    // 1. Direction Filter
    if (flowFilter === "inflows" && item.direction !== "INFLOW") return false;
    if (flowFilter === "outflows" && item.direction !== "OUTFLOW") return false;

    // 2. Search Filter
    const q = search.toLowerCase();
    return (
      item.description?.toLowerCase().includes(q) ||
      item.referenceId?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      item.categoryLabel?.toLowerCase().includes(q) ||
      item.createdBy?.toLowerCase().includes(q)
    );
  });

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

      {/* Header & Unified Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100">
        {/* Left Side: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Corporate Treasury & Cashflow Audit
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Landmark className="w-3.5 h-3.5" />
              <span>Main Treasury</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time unified audit of bank statement inflows, customer collections, land acquisition payouts, and staff salaries.
          </p>
        </div>

        {/* Right Top Controls Bar */}
        <div className="flex items-center gap-2.5 flex-wrap self-start xl:self-auto shrink-0">
          {/* Approach 1: 3-Way Flow Toggle Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFlowFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                flowFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>All Cashflow</span>
            </button>
            <button
              onClick={() => setFlowFilter("inflows")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                flowFilter === "inflows"
                  ? "bg-white text-emerald-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Money In</span>
            </button>
            <button
              onClick={() => setFlowFilter("outflows")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                flowFilter === "outflows"
                  ? "bg-white text-rose-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-rose-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Money Out</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search UTR, name, flow..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Record Inflow Primary Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Bank Inflow</span>
          </button>

          {/* Refresh Icon Button */}
          <button
            onClick={fetchCashflow}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh Treasury Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cashflow Summary Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Total Inflows */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs">
          <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-800 text-[11px] font-medium">Inflows:</span>
          <span className="font-bold text-emerald-800 font-digital tracking-wide text-xs">
            +₹{summary.totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Total Outflows */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-xs">
          <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="text-rose-800 text-[11px] font-medium">Outflows:</span>
          <span className="font-bold text-rose-800 font-digital tracking-wide text-xs">
            -₹{summary.totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Net Cashflow */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs">
          <Landmark className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-slate-500 text-[11px] font-medium">Net Treasury:</span>
          <span className={`font-bold font-digital tracking-wide text-xs ${summary.netCashflow >= 0 ? "text-slate-900" : "text-rose-700"}`}>
            ₹{summary.netCashflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Records Count */}
        <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl whitespace-nowrap ml-auto">
          Showing {filteredItems.length} of {cashflows.length} Records
        </span>
      </div>

      {/* Cashflow Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Flow & Category</th>
                <th className="px-5 py-3.5">Reference / UTR</th>
                <th className="px-5 py-3.5">Description / Narration</th>
                <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                <th className="px-5 py-3.5">Mode</th>
                <th className="px-5 py-3.5">Recorded By</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading Corporate Treasury Cashflows...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-14 text-center text-slate-400">
                    <FileCheck className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No Cashflow Records Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {flowFilter === "outflows"
                        ? "No payout disbursements matching criteria."
                        : "Click 'Record Bank Inflow' to record capital additions or switch filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isInflow = item.direction === "INFLOW";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-5 py-4">
                        {isInflow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Inflow • {item.categoryLabel || "Deposit"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                            <span>Outflow • {item.categoryLabel || "Payout"}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/80 tracking-wide select-all">
                          {item.referenceId || item.referenceType || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 max-w-sm truncate font-medium" title={item.description}>
                        {item.description}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`font-digital font-bold text-sm px-3 py-1 rounded-lg border inline-block shadow-2xs tracking-wide ${
                          isInflow
                            ? "text-emerald-700 bg-emerald-50/80 border-emerald-200/60"
                            : "text-rose-700 bg-rose-50/80 border-rose-200/60"
                        }`}>
                          {isInflow ? "+" : "-"}₹{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                          item.fundMode === "CASH"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {item.fundMode || "LIQUID"}
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
                  );
                })
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
