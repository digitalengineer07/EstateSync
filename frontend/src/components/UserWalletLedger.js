"use client";

import { useState, useEffect } from "react";

export default function UserWalletLedger() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/users/all", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.message || "Failed to load user wallets.");
      }
    } catch (err) {
      console.error("Failed to fetch user wallets", err);
      setError("Network error loading wallet data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.name?.toLowerCase().includes(q)
    );
  });

  const totalAllocatedSum = users.reduce((acc, u) => acc + parseFloat(u.wallet?.totalAllocated || 0), 0);
  const totalBalanceSum = users.reduce((acc, u) => acc + parseFloat(u.wallet?.availableBalance || 0), 0);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mt-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Corporate Wallet Audit & Overview</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Real-time balance, allocated budgets, and utilization across all employee wallets.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 bg-white"
          />
          <button
            onClick={fetchWallets}
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

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 text-xs font-semibold">
            <tr>
              <th scope="col" className="px-5 py-3">Employee</th>
              <th scope="col" className="px-5 py-3">Role</th>
              <th scope="col" className="px-5 py-3">Total Allocated</th>
              <th scope="col" className="px-5 py-3">Available Balance</th>
              <th scope="col" className="px-5 py-3">Spent to Date</th>
              <th scope="col" className="px-5 py-3">Utilization</th>
              <th scope="col" className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-900">
            {filteredUsers.map((u) => {
              const allocated = parseFloat(u.wallet?.totalAllocated || 0);
              const balance = parseFloat(u.wallet?.availableBalance || 0);
              const spent = Math.max(0, allocated - balance);
              const utilization = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;

              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      u.role?.name === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      u.role?.name === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                      u.role?.name === 'ACCOUNTING' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role?.name || 'USER'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    ₹{allocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-indigo-700">
                    ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    ₹{spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 w-44">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            utilization > 85 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${utilization}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      balance > 0
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {balance > 0 ? 'Active' : 'Depleted'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-gray-900 font-semibold text-xs">
            <tr>
              <td className="px-5 py-3" colSpan="2">TOTALS ({filteredUsers.length} Users)</td>
              <td className="px-5 py-3">₹{totalAllocatedSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-5 py-3 text-indigo-700">₹{totalBalanceSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-5 py-3" colSpan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
