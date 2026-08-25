"use client";

import { useState, useEffect } from "react";

// type can be 'my', 'team', or 'all'
export default function ExpenseList({ type = "my" }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      let endpoint = "http://localhost:4000/api/v1/expenses/my";
      if (type === "team") endpoint = "http://localhost:4000/api/v1/expenses/team";
      if (type === "all") endpoint = "http://localhost:4000/api/v1/expenses/all";

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

  const totalSpentSum = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

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
            <span className="text-xs text-gray-500 block">Total Recorded</span>
            <span className="text-sm font-bold text-gray-900">
              ₹{totalSpentSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <th scope="col" className="px-5 py-3 text-right">Status</th>
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
                    ₹{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        item.status === "RECORDED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
