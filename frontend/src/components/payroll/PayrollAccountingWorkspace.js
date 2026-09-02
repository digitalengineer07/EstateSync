"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getPeriods } from "@/services/payrollService";
import {
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldAlert,
  Send,
  Layers,
  Lock
} from "lucide-react";

export default function PayrollAccountingWorkspace() {
  const { user } = useAuth();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const canViewAccounting = hasPermission(user, "payroll.accounting.view");

  const fetchAccountingRuns = useCallback(async () => {
    if (!canViewAccounting) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPeriods();
      if (res.success && Array.isArray(res.periods)) {
        setPeriods(res.periods);
      } else {
        setPeriods([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load payroll accounting records");
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [canViewAccounting]);

  useEffect(() => {
    fetchAccountingRuns();
  }, [fetchAccountingRuns]);

  // Flatten all runs
  const allRuns = periods.flatMap((p) =>
    (p.runs || []).map((r) => ({
      ...r,
      payrollPeriod: p
    }))
  );

  const filteredRuns = allRuns.filter((r) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "LOCKED") return r.status === "LOCKED";
    if (statusFilter === "NOT_LOCKED") return r.status !== "LOCKED";
    return true;
  });

  // KPI Metrics
  const totalRuns = allRuns.length;
  const lockedRuns = allRuns.filter((r) => r.status === "LOCKED").length;
  const pendingLock = allRuns.filter((r) => r.status !== "LOCKED").length;
  const totalAccruedGross = allRuns.reduce((sum, r) => sum + Number(r.totalGross || 0), 0);

  if (!canViewAccounting) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center text-xs text-slate-500">
        <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-400 mt-1">You do not have permission to view Payroll Accounting integration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Payroll GL Accrual & Accounting
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Scale className="w-3.5 h-3.5" />
              Phase 4 Ledger Posting
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Reconcile locked calculation runs, preview double-entry postings, and commit accrual journals to the General Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboards/payroll/runs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <span>View Calculation Runs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchAccountingRuns} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Batches</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalRuns}</div>
          <p className="text-[11px] text-slate-400 mt-1">Calculation runs across all periods</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Locked (Posting Ready)</span>
            <Lock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-950 mt-2">{loading ? "--" : lockedRuns}</div>
          <p className="text-[11px] text-slate-400 mt-1">Eligible for GL accrual journal</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Lock</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : pendingLock}</div>
          <p className="text-[11px] text-slate-400 mt-1">Draft or pending approval</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accrued Gross</span>
            <span className="text-xs font-mono font-bold text-indigo-600">INR</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            ₹{totalAccruedGross.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative payroll expense</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Batches</option>
              <option value="LOCKED">Posting Ready (Locked)</option>
              <option value="NOT_LOCKED">Pending Finalization</option>
            </select>
          </div>

          <button
            onClick={fetchAccountingRuns}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading payroll accounting batches...</span>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center">
            <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Accounting Batches Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No payroll calculation runs match the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-5 py-3">Batch & Period</th>
                  <th scope="col" className="px-5 py-3">Run Status</th>
                  <th scope="col" className="px-5 py-3">Eligible Staff</th>
                  <th scope="col" className="px-5 py-3">Gross Expense (Dr)</th>
                  <th scope="col" className="px-5 py-3">Net Payable (Cr)</th>
                  <th scope="col" className="px-5 py-3 text-right">GL Accrual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRuns.map((r) => {
                  const isLocked = r.status === "LOCKED";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                            #{r.runNumber}
                          </div>
                          <div>
                            <Link
                              href={`/dashboards/payroll/runs/${r.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition"
                            >
                              Run #{r.runNumber}
                            </Link>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Period: {r.payrollPeriod?.year}-{String(r.payrollPeriod?.month).padStart(2, "0")}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isLocked
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {r.totalEmployees ?? 0} Employees
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-900 font-semibold">
                        ₹{Number(r.totalGross || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-emerald-800 font-bold">
                        ₹{Number(r.totalNet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/dashboards/payroll/runs/${r.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                            isLocked
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "border border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{isLocked ? "Review & Post to GL" : "View Batch"}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
