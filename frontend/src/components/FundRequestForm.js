"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function FundRequestForm() {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    managerId: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch("http://localhost:4000/api/v1/users/managers", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setManagers(data.managers);
        }
      } catch (error) {
        console.error("Failed to fetch managers", error);
      }
    };
    fetchManagers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/fund-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Fund request submitted to manager!" });
        setFormData({ amount: "", reason: "", managerId: "" });
        // Optionally trigger a list re-fetch here via props or context
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit request." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred." });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Request Additional Funds</h3>
      <p className="text-gray-600 mb-6 text-sm">
        Submit a request to your manager for a top-up to your wallet balance.
      </p>

      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <p className="font-semibold">{message.type === 'error' ? 'Request Failed' : 'Success'}</p>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Select Approver (Manager / Admin)
            </label>
            <select
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="" disabled>Select approver (Manager / Admin)...</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.name} ({mgr.role?.name || "Authority"}) — {mgr.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 50000.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Request</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Client travel to Mumbai"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
