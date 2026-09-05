"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { RefreshCw } from "lucide-react";
import { API_URL } from "@/config/api";
import { formatINR } from "@/utils/formatters";

// type can be 'my', 'team', or 'all'
export default function ExpenseList({ type = "my", embedded = false, showHeader = true }) {
  const [actionError, setActionError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  
  // Reversal Modal State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUserRole(u.role || "");
      } catch (e) {}
    }
  }, []);

  let endpoint = `/api/v1/expenses/my`;
  if (type === "team") endpoint = `/api/v1/expenses/team`;
  if (type === "all") endpoint = `/api/v1/expenses/all`;

  const { data, error: fetchError, isLoading, mutate } = useSWR(endpoint, fetcher, { 
    refreshInterval: 10000,
    revalidateOnFocus: true
  });

  const expenses = data?.expenses || [];

  const handleReverseExpense = async (e) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setReversing(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/expenses/${selectedExpense.id}/reverse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reversalReason || "Administrative correction & wallet balance restored" })
      });

      const responseData = await res.json();
      if (responseData.success) {
        setSuccessMsg(responseData.message || "Expense reversed and balance restored.");
        setSelectedExpense(null);
        setReversalReason("");
        mutate();
      } else {
        setActionError(responseData.message || "Failed to reverse expense.");
      }
    } catch (err) {
      console.error("Reversal Error:", err);
      setActionError("Network error attempting to reverse expense.");
    }
    setReversing(false);
  };

  const totalSpentSum = expenses
    .filter(item => item.status === 'RECORDED')
    .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  const canReverse = ["ADMIN", "ACCOUNTING"].includes(currentUserRole);

  if (isLoading && !data) {
    return (
      <div className={embedded ? "py-8 text-center text-slate-400 text-xs" : "bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6"}>
        <div className="flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading recorded expenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-5"}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {type === "my"
                ? "My Recorded Expenses"
                : type === "team"
                ? "Team Expense Records"
                : "All Organization Expenses"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {type === "my"
                ? "All personal spending recorded against your wallet balance."
                : type === "team"
                ? "Real-time record of all expenditures submitted by your team members."
                : "Complete history of all departmental and organizational spending."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Recorded</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatINR(totalSpentSum, { showDecimals: true })}
              </span>
            </div>
            <button
              onClick={() => mutate()}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Refresh expenses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {fetchError && data && (
        <div className="p-2 mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs flex items-center justify-between">
          <span>⚠️ Disconnected - Retrying...</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 mb-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md text-sm">
          ✓ {successMsg}
        </div>
      )}

      {actionError && (
        <div className="p-4 mb-4 bg-red-50 text-red-900 border border-red-200 rounded-md text-sm">
          {actionError}
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600 font-medium">No expenses recorded yet.</p>
          <p className="text-xs text-gray-400">Recorded receipts and bills will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  {type !== "my" && <th scope="col" className="px-4 py-3">Spender</th>}
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3 min-w-[200px]">Description</th>
                  <th scope="col" className="px-4 py-3">Vendor / Ref</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Mode</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  {canReverse && type !== "my" && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-normal">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(item.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    {type !== "my" && (
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.user?.name || "Team Member"}</div>
                        <div className="text-[10px] text-slate-400">{item.user?.role?.name || item.user?.email}</div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 rounded-md border border-purple-200/80">
                        {item.category?.name || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs truncate font-medium" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {item.vendorId || item.reference ? (
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">{item.vendorId || item.reference}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 font-sans text-xs">
                      {formatINR(item.amount, { showDecimals: true })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200/70">
                        {item.fundMode || 'LIQUID'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10.5px] font-bold rounded-md border ${
                          item.status === "RECORDED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200 line-through"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {canReverse && type !== "my" && (
                      <td className="px-4 py-3 text-right">
                        {item.status === "RECORDED" ? (
                          <button
                            onClick={() => setSelectedExpense(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition active:scale-95"
                          >
                            Reverse
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">Reversed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <h4 className="text-lg font-bold text-gray-900">Reverse Expense Entry</h4>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to reverse this expense of{" "}
              <strong className="text-rose-600">₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</strong> recorded by{" "}
              <strong>{selectedExpense.user?.name || "User"}</strong>?
            </p>
            <div className="mt-3 p-3 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-900">
              ⚠️ This will atomically refund ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')} back into the user&apos;s available wallet balance, create an <code className="font-mono font-bold">EXPENSE_REVERSAL</code> ledger entry, and post a balancing double-entry journal.
            </div>

            <form onSubmit={handleReverseExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Reversal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Duplicate entry / Incorrect bill amount"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={reversing}
                  onClick={() => { setSelectedExpense(null); setReversalReason(""); }}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing || !reversalReason.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {reversing ? "Reversing..." : "Confirm Reversal & Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
