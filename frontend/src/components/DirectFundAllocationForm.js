"use client";

import { useState, useEffect } from "react";

export default function DirectFundAllocationForm({ onAllocationSuccess }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    targetUserId: "",
    amount: "",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/users/all", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Filter out ADMIN if desired or list everyone with a wallet
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickAmount = (val) => {
    setFormData({ ...formData, amount: val.toString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/fund-requests/allocate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: data.message || "Funds successfully allocated!"
        });
        setFormData({ targetUserId: "", amount: "", description: "" });
        fetchUsers(); // Refresh wallet balances in dropdown
        if (onAllocationSuccess) onAllocationSuccess();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to allocate funds."
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred during allocation." });
    }
    setSubmitting(false);
  };

  const selectedUser = users.find(u => u.id === formData.targetUserId);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Direct Fund Allocation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Push funds directly from the organization reserve into a manager or team member wallet.
          </p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
          Admin Only
        </span>
      </div>

      {message && (
        <div
          className={`p-4 mb-6 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-900 border border-green-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <p className="font-semibold text-sm">
            {message.type === "error" ? "Allocation Failed" : "Success"}
          </p>
          <p className="text-sm mt-0.5">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Recipient (Manager / Team Member)
          </label>
          <select
            name="targetUserId"
            value={formData.targetUserId}
            onChange={handleChange}
            required
            disabled={loadingUsers}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
          >
            <option value="" disabled>
              {loadingUsers ? "Loading users..." : "Select recipient to allocate funds..."}
            </option>
            {users.map((u) => {
              const balance = u.wallet?.availableBalance
                ? parseFloat(u.wallet.availableBalance).toLocaleString()
                : "0";
              return (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.name || "User"}) — Current Balance: ₹{balance}
                </option>
              );
            })}
          </select>
          {selectedUser && (
            <p className="text-xs text-gray-500 mt-1.5">
              Current Available Balance:{" "}
              <span className="font-semibold text-gray-800">
                ₹{parseFloat(selectedUser.wallet?.availableBalance || 0).toLocaleString()}
              </span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Allocation Amount (₹)
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm font-bold">₹</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="1"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              placeholder="e.g. 50000.00"
              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 bg-white font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-gray-500 py-1">Quick Select:</span>
            {[10000, 25000, 50000, 100000].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => handleQuickAmount(val)}
                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition-colors"
              >
                +₹{val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Reason / Allocation Notes
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g. Q3 Sales Team operational budget top-up"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 bg-white"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || loadingUsers}
            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Allocating Funds..." : "Confirm & Allocate Funds"}
          </button>
        </div>
      </form>
    </div>
  );
}
