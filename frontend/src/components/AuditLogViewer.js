"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { API_URL } from "@/config/api";
import { RefreshCw, Shield, Terminal, ArrowUpRight } from "lucide-react";

export default function AuditLogViewer() {
  const [filterAction, setFilterAction] = useState("");

  let url = `/api/v1/audit?limit=100`;
  if (filterAction) url += `&action=${filterAction}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true
  });

  const logs = data?.logs || [];

  const getActionBadge = (action) => {
    switch (action) {
      case "EXPENSE_REVERSE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 rounded-md border border-rose-200">EXPENSE_REVERSE</span>;
      case "EXPENSE_CREATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-50 text-purple-700 rounded-md border border-purple-200">EXPENSE_CREATE</span>;
      case "CUSTOMER_CREATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-700 rounded-md border border-teal-200">CUSTOMER_CREATE</span>;
      case "CUSTOMER_PAYMENT_RECORD":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">CUSTOMER_PAYMENT</span>;
      case "PROPERTY_CREATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md border border-amber-200">PROPERTY_CREATE</span>;
      case "PROPERTY_PAYMENT_RECORD":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-orange-50 text-orange-700 rounded-md border border-orange-200">PROPERTY_PAYMENT</span>;
      case "FUND_DIRECT_ALLOCATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">FUND_ALLOCATE</span>;
      case "FUND_REQUEST_APPROVE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-700 rounded-md border border-teal-200">FUND_APPROVE</span>;
      case "USER_LOGIN":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200">USER_LOGIN</span>;
      case "USER_REGISTER":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md border border-amber-200">USER_REGISTER</span>;
      case "EMPLOYEE_CREATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">EMPLOYEE_CREATE</span>;
      case "EMPLOYEE_UPDATE":
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-cyan-50 text-cyan-700 rounded-md border border-cyan-200">EMPLOYEE_UPDATE</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">{action}</span>;
    }
  };

  const renderPayload = (payload) => {
    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      return <span className="text-slate-400 italic text-[11px]">None</span>;
    }
    const entries = Object.entries(payload);
    // If small (1-3 keys), render elegant key-value badges
    if (entries.length <= 4) {
      return (
        <div className="flex flex-wrap gap-1.5 max-w-md">
          {entries.map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-[10.5px] bg-slate-50 border border-slate-200/90 rounded-md px-2 py-0.5 font-mono">
              <span className="text-slate-500 font-sans">{k}:</span>
              <span className="font-semibold text-slate-800">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            </span>
          ))}
        </div>
      );
    }
    // Otherwise render compact code box
    return (
      <pre className="text-[10px] bg-slate-50 text-slate-700 p-2 rounded-lg border border-slate-200 max-h-24 overflow-y-auto font-mono">
        {JSON.stringify(payload, null, 1)}
      </pre>
    );
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 mt-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Security & Governance Audit Trail
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographic log of all user logins, treasury movements, customer collections, and governance events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/80 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-medium"
          >
            <option value="">All Audit Actions ({logs.length})</option>
            <option value="CUSTOMER_PAYMENT_RECORD">Customer Collections</option>
            <option value="PROPERTY_PAYMENT_RECORD">Land Owner Payouts</option>
            <option value="CUSTOMER_CREATE">Customer Registrations</option>
            <option value="PROPERTY_CREATE">Land Acquisitions</option>
            <option value="FUND_DIRECT_ALLOCATE">Fund Allocations</option>
            <option value="FUND_REQUEST_APPROVE">Fund Approvals</option>
            <option value="EXPENSE_CREATE">Expense Submissions</option>
            <option value="EXPENSE_REVERSE">Expense Reversals</option>
            <option value="EMPLOYEE_CREATE">Employee Additions</option>
            <option value="EMPLOYEE_UPDATE">Employee Updates</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="USER_REGISTER">User Registrations</option>
          </select>

          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition active:scale-95"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && data && (
        <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
          <span>⚠️ Live sync disconnected — retrying background connection...</span>
        </div>
      )}

      {error && !data && (
        <div className="p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs">
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading audit trail records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">No audit records found matching this action filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor / User</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Details / Payload</th>
                  <th className="px-5 py-3.5 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900 text-xs">
                        {new Date(log.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                      <div className="font-mono text-slate-400 text-[10.5px]">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700 uppercase">
                          {(log.actor?.name || log.actorEmail || "S")[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {log.actor?.name || log.actorEmail || "System"}
                          </div>
                          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                            {log.actor?.role?.name || log.actorEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {renderPayload(log.newValues || log.oldValues || {})}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono text-slate-500 text-[11px]">
                      <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200/70 inline-block">
                        {log.ipAddress || "127.0.0.1"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
