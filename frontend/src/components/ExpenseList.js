"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { formatINR } from "@/utils/formatters";

// type can be 'my', 'team', or 'all'
export default function ExpenseList({ type = "my" }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      let endpoint = `${API_URL}/api/v1/expenses/my`;
      if (type === "team") endpoint = `${API_URL}/api/v1/expenses/team`;
      if (type === "all") endpoint = `${API_URL}/api/v1/expenses/all`;

      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      } else {
        setError(data.message || "Failed to load expenses.");
      }
    } catch (err) {
      console.error("Failed to fetch expenses", err);
      setError("Network error loading expenses.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [type]);

  const handleReverseExpense = async (e) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setReversing(true);
    setError(null);
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

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Expense reversed and balance restored.");
        setSelectedExpense(null);
        setReversalReason("");
        fetchExpenses();
      } else {
        setError(data.message || "Failed to reverse expense.");
      }
    } catch (err) {
      console.error("Reversal Error:", err);
      setError("Network error attempting to reverse expense.");
    }
    setReversing(false);
  };

  const totalSpentSum = expenses
    .filter(item => item.status === 'RECORDED')
    .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  const canReverse = ["ADMIN", "ACCOUNTING"].includes(currentUserRole);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {type === "my"
              ? "My Recorded Expenses"
              : type === "team"
              ? "Team Expense Records"
              : "All Organization Expenses"}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {type === "my"
              ? "All personal spending recorded against your wallet balance."
              : type === "team"
              ? "Real-time record of all expenditures submitted by your team members."
              : "Complete history of all departmental and organizational spending."}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Total Active Recorded</span>
            <span className="text-sm font-bold text-gray-900">
              {formatINR(totalSpentSum, { showDecimals: true })}
            </span>
          </div>
          <button
            onClick={fetchExpenses}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 mb-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md text-sm">
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-900 border border-red-200 rounded-md text-sm">
          {error}
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 text-xs font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3">Date</th>
                {type !== "my" && <th scope="col" className="px-5 py-3">Spender</th>}
                <th scope="col" className="px-5 py-3">Category</th>
                <th scope="col" className="px-5 py-3">Description</th>
                <th scope="col" className="px-5 py-3">Vendor / Ref</th>
                <th scope="col" className="px-5 py-3">Amount</th>
                <th scope="col" className="px-5 py-3">Mode</th>
                <th scope="col" className="px-5 py-3">Status</th>
                {canReverse && type !== "my" && <th scope="col" className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900 font-normal">
              {expenses.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-700">
                    {new Date(item.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  {type !== "my" && (
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{item.user?.name || "Team Member"}</div>
                      <div className="text-xs text-gray-500">{item.user?.role?.name || item.user?.email}</div>
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      {item.category?.name || "General"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-800 max-w-xs truncate" title={item.description}>
                    {item.description}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    {item.vendorId || item.reference ? (
                      <span>{item.vendorId || item.reference}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-900">
                    {formatINR(item.amount, { showDecimals: true })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                      {item.fundMode || 'LIQUID'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        item.status === "RECORDED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200 line-through"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  {canReverse && type !== "my" && (
                    <td className="px-5 py-3.5 text-right">
                      {item.status === "RECORDED" ? (
                        <button
                          onClick={() => setSelectedExpense(item)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                        >
                          Reverse Entry
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Reversed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
