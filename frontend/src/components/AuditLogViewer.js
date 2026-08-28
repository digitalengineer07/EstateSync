"use client";

import { useState, useEffect } from "react";

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      let url = "http://localhost:4000/api/v1/audit?limit=100";
      if (filterAction) url += `&action=${filterAction}`;

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.message || "Failed to load audit trail.");
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      setError("Network error loading audit trail.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const getActionBadge = (action) => {
    switch (action) {
      case "EXPENSE_REVERSE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded border border-rose-200">EXPENSE_REVERSE</span>;
      case "EXPENSE_CREATE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded border border-purple-200">EXPENSE_CREATE</span>;
      case "CUSTOMER_CREATE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded border border-teal-200">CUSTOMER_CREATE</span>;
      case "CUSTOMER_PAYMENT_RECORD":
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">CUSTOMER_PAYMENT</span>;
      case "PROPERTY_CREATE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">PROPERTY_CREATE</span>;
      case "PROPERTY_PAYMENT_RECORD":
        return <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-800 rounded border border-orange-200">PROPERTY_PAYMENT</span>;
      case "FUND_DIRECT_ALLOCATE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">FUND_ALLOCATE</span>;
      case "FUND_REQUEST_APPROVE":
        return <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded border border-teal-200">FUND_APPROVE</span>;
      case "USER_LOGIN":
        return <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded border border-blue-200">USER_LOGIN</span>;
      case "USER_REGISTER":
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">USER_REGISTER</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-800 rounded border border-gray-200">{action}</span>;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8 border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Security & Governance Audit Trail</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Immutable log of all user logins, treasury fund movements, customer collections, land acquisitions, and expense governance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Audit Actions</option>
            <option value="CUSTOMER_PAYMENT_RECORD">Customer Collections</option>
            <option value="PROPERTY_PAYMENT_RECORD">Land Owner Payouts</option>
            <option value="CUSTOMER_CREATE">Customer Registrations</option>
            <option value="PROPERTY_CREATE">Land Acquisitions</option>
            <option value="FUND_DIRECT_ALLOCATE">Fund Allocations</option>
            <option value="FUND_REQUEST_APPROVE">Fund Approvals</option>
            <option value="EXPENSE_CREATE">Expense Submissions</option>
            <option value="EXPENSE_REVERSE">Expense Reversals</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="USER_REGISTER">User Registrations</option>
          </select>

          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200"
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

      {loading ? (
        <div className="animate-pulse py-8 text-center text-gray-400 text-sm">
          Loading audit trail records...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">No audit records found matching this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 font-semibold bg-gray-50">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details / Payload</th>
                <th className="px-4 py-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{log.actor?.name || log.actorEmail || "System"}</div>
                    <div className="text-[10px] text-gray-500">{log.actor?.role?.name || log.actorEmail}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-sm text-gray-700">
                    <pre className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 overflow-x-auto font-mono">
                      {JSON.stringify(log.newValues || log.oldValues || {}, null, 1)}
                    </pre>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-gray-500 text-[11px]">
                    {log.ipAddress || "127.0.0.1"}
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
