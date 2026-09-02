"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { API_URL } from "@/config/api";
import { RefreshCw, Shield, Terminal, ArrowUpRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";

export default function AuditLogViewer() {
  const [filterAction, setFilterAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  let url = `/api/v1/audit?limit=100`;
  if (filterAction) url += `&action=${filterAction}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true
  });

  const logs = data?.logs || [];
  // Ensure newest activity is always at the top
  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalPages = Math.ceil(sortedLogs.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + PAGE_SIZE);

  const getActionBadge = (action) => {
    switch (action) {
      case "EXPENSE_REVERSE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 rounded-md border border-rose-200/90">EXPENSE_REVERSE</span>;
      case "EXPENSE_CREATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-purple-50 text-purple-700 rounded-md border border-purple-200/90">EXPENSE_CREATE</span>;
      case "CUSTOMER_CREATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-700 rounded-md border border-teal-200/90">CUSTOMER_CREATE</span>;
      case "CUSTOMER_PAYMENT_RECORD":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200/90">CUSTOMER_PAYMENT</span>;
      case "PROPERTY_CREATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md border border-amber-200/90">PROPERTY_CREATE</span>;
      case "PROPERTY_PAYMENT_RECORD":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-orange-50 text-orange-700 rounded-md border border-orange-200/90">PROPERTY_PAYMENT</span>;
      case "FUND_DIRECT_ALLOCATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200/90">FUND_ALLOCATE</span>;
      case "FUND_REQUEST_APPROVE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-700 rounded-md border border-teal-200/90">FUND_APPROVE</span>;
      case "USER_LOGIN":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200/90">USER_LOGIN</span>;
      case "USER_REGISTER":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md border border-amber-200/90">USER_REGISTER</span>;
      case "EMPLOYEE_CREATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/90">EMPLOYEE_CREATE</span>;
      case "EMPLOYEE_UPDATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-cyan-50 text-cyan-700 rounded-md border border-cyan-200/90">EMPLOYEE_UPDATE</span>;
      case "EMPLOYEE_SALARY_CONFIG_UPDATE":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-md border border-amber-200/90">SALARY_CONFIG_UPDATE</span>;
      case "SALARY_PAYMENT_DISBURSED":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200/90">SALARY_DISBURSED</span>;
      case "SALARY_STRUCTURE_UPDATED":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-violet-50 text-violet-700 rounded-md border border-violet-200/90">SALARY_UPDATED</span>;
      case "TREASURY_INFLOW_RECORD":
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200/90">TREASURY_INFLOW</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200/90">{action}</span>;
    }
  };

  const renderPayload = (log) => {
    const payload = log.newValues || log.oldValues || {};
    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      return <span className="text-slate-400 italic text-[11px]">No payload data</span>;
    }

    // Custom formatting for Salary Disbursements
    if (log.action === "SALARY_PAYMENT_DISBURSED") {
      return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
          {payload.amount && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-bold font-sans">
              ₹{Number(payload.amount).toLocaleString("en-IN")}
            </span>
          )}
          {payload.month && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
              📅 {payload.month}
            </span>
          )}
          {payload.paymentMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
              {payload.paymentMode}
            </span>
          )}
          {payload.referenceNo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
              Ref: {payload.referenceNo}
            </span>
          )}
        </div>
      );
    }

    // Custom formatting for Salary Configuration Updates
    if (log.action === "EMPLOYEE_SALARY_CONFIG_UPDATE") {
      const cleanEmpName = (payload.fullName || "").replace(/\s*\(\d+\)$/, "");
      return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
          {cleanEmpName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-900 text-xs font-semibold">
              👤 {cleanEmpName}
            </span>
          )}
          {payload.baseSalary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-bold font-sans">
              Base: ₹{Number(payload.baseSalary).toLocaleString("en-IN")}
            </span>
          )}
          {payload.bankName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium">
              🏦 {payload.bankName}
            </span>
          )}
          {payload.ifscCode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-mono">
              IFSC: {payload.ifscCode}
            </span>
          )}
          {payload.employeeCode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
              {payload.employeeCode}
            </span>
          )}
        </div>
      );
    }

    // Custom formatting for Employee Create / Update
    if (log.action === "EMPLOYEE_CREATE" || log.action === "EMPLOYEE_UPDATE") {
      const cleanEmpName = (payload.fullName || "").replace(/\s*\(\d+\)$/, "");
      return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
          {cleanEmpName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-900 text-xs font-semibold">
              👤 {cleanEmpName}
            </span>
          )}
          {payload.department && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium">
              {payload.department} {payload.designation ? `• ${payload.designation}` : ""}
            </span>
          )}
          {payload.mobile && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
              📞 {payload.mobile}
            </span>
          )}
          {payload.employeeCode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
              {payload.employeeCode}
            </span>
          )}
          {payload.status && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-bold">
              {payload.status}
            </span>
          )}
        </div>
      );
    }

    // Custom formatting for User Login
    if (log.action === "USER_LOGIN" && payload.role) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs font-semibold shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          <span className="text-blue-500 font-medium text-[11px]">Role Authority:</span>
          <span className="font-bold text-blue-950">{payload.role}</span>
        </span>
      );
    }

    // Universal clean key-value pill formatter (No raw JSON curly braces)
    const entries = Object.entries(payload).filter(([k, v]) => v !== null && v !== undefined && k !== "userId");
    return (
      <div className="flex flex-wrap items-center gap-1.5 max-w-lg">
        {entries.slice(0, 5).map(([k, v]) => {
          const isAmount = k.toLowerCase().includes("amount") || k.toLowerCase().includes("balance") || k.toLowerCase().includes("salary");
          const valDisplay = typeof v === "object" ? JSON.stringify(v) : String(v);
          return (
            <span key={k} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200/90 rounded-md px-2 py-0.5">
              <span className="text-slate-400 text-[10px] capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}:</span>
              <span className={`font-semibold ${isAmount ? "text-emerald-700 font-sans" : "text-slate-800"}`}>
                {isAmount && !isNaN(Number(v)) ? `₹${Number(v).toLocaleString("en-IN")}` : valDisplay.length > 25 ? valDisplay.slice(0, 25) + "..." : valDisplay}
              </span>
            </span>
          );
        })}
      </div>
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
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/80 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-medium"
          >
            <option value="">All Audit Actions ({logs.length})</option>
            <option value="SALARY_PAYMENT_DISBURSED">Salary Disbursements</option>
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
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-40 whitespace-nowrap">Timestamp</th>
                  <th className="px-5 py-3.5 w-48 whitespace-nowrap">Actor / User</th>
                  <th className="px-5 py-3.5 w-48 whitespace-nowrap">Action</th>
                  <th className="px-5 py-3.5 w-24 whitespace-nowrap">Entity</th>
                  <th className="px-5 py-3.5 min-w-[320px]">
                    <div className="flex items-center gap-2">
                      <span>Action Details & Context</span>
                      <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Live Payload
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right w-28 whitespace-nowrap">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-slate-900 text-xs tracking-tight">
                          {new Date(log.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md text-[10.5px] w-fit shadow-2xs">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                          {(log.actor?.name || log.actorEmail || "S")[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 text-xs truncate">
                            {log.actor?.name || log.actorEmail || "System"}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {log.actor?.role?.name || log.actorEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <span className="font-mono text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md text-[10.5px] font-semibold">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {renderPayload(log)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-400 text-[11px] align-top">
                      <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70 inline-block">
                        {log.ipAddress || "127.0.0.1"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-900">{sortedLogs.length === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">{Math.min(startIndex + PAGE_SIZE, sortedLogs.length)}</span> of{" "}
              <span className="font-semibold text-slate-900">{sortedLogs.length}</span> activities
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-medium text-slate-600 px-2.5">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
