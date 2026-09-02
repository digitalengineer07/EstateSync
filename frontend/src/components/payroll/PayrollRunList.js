"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getPeriods } from "@/services/payrollService";
import CreatePayrollRunModal from "./CreatePayrollRunModal";
import {
  Calculator,
  Calendar,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Check,
  Lock,
  Clock,
  ArrowRight
} from "lucide-react";

export default function PayrollRunList() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const periodIdFilter = searchParams.get("periodId");

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPeriodId, setSelectedPeriodId] = useState(periodIdFilter || "ALL");

  // Modal
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const canCreateRun = hasPermission(user, "payroll.run.create");

  const fetchRunsAndPeriods = useCallback(async () => {
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
      setError(err.message || "Failed to load calculation runs");
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunsAndPeriods();
  }, [fetchRunsAndPeriods]);

  // Flatten all runs from periods
  const allRuns = periods.flatMap((p) =>
    (p.runs || []).map((r) => ({
      ...r,
      payrollPeriod: p
    }))
  );

  // Filter runs
  const filteredRuns = allRuns.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (selectedPeriodId !== "ALL" && r.payrollPeriodId !== selectedPeriodId) return false;
    return true;
  });

  // KPI Metrics (Calculated by backend)
  const totalRuns = allRuns.length;
  const calculatedCount = allRuns.filter((r) => ["CALCULATED", "APPROVED", "LOCKED"].includes(r.status)).length;
  const totalEmployeesCalculated = allRuns.reduce((sum, r) => sum + (r.totalEmployees || 0), 0);
  const totalDisbursedNet = allRuns.reduce((sum, r) => sum + Number(r.totalNet || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case "CALCULATED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOCKED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "DRAFT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Payroll Calculation Runs
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Calculator className="w-3.5 h-3.5" />
              Batch Execution Engine
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Execute batch salary computations, review exception flags, and lock calculation snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboards/payroll/periods"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Manage Periods</span>
          </Link>

          {canCreateRun && (
            <button
              onClick={() => setIsRunModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Run</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchRunsAndPeriods} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Batches</span>
            <Calculator className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalRuns}</div>
          <p className="text-[11px] text-slate-400 mt-1">Calculation runs across all periods</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calculated Runs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : calculatedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Processed batches</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employees Computed</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalEmployeesCalculated}</div>
          <p className="text-[11px] text-slate-400 mt-1">Payslip records generated</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Payable</span>
            <span className="text-xs font-mono font-bold text-emerald-600">INR</span>
          </div>
          <div className="text-2xl font-bold text-emerald-950 font-mono mt-2">
            ₹{totalDisbursedNet.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative payroll amount</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CALCULATED">Calculated</option>
              <option value="APPROVED">Approved</option>
              <option value="LOCKED">Locked</option>
            </select>

            {/* Period Filter */}
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.year}-{String(p.month).padStart(2, "0")} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchRunsAndPeriods}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh runs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading calculation runs...</span>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center">
            <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Calculation Runs Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {statusFilter !== "ALL" || selectedPeriodId !== "ALL"
                ? "No calculation runs match your filter criteria. Try resetting filters."
                : "No calculation runs initiated yet."}
            </p>
            {canCreateRun && (
              <button
                onClick={() => setIsRunModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Calculation Run</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-5 py-3">Run #</th>
                    <th scope="col" className="px-5 py-3">Period</th>
                    <th scope="col" className="px-5 py-3">Staff</th>
                    <th scope="col" className="px-5 py-3">Gross Earnings</th>
                    <th scope="col" className="px-5 py-3">Net Payable</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRuns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Run Number */}
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
                              ID: {r.id?.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Period */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {r.payrollPeriod ? `${r.payrollPeriod.year}-${String(r.payrollPeriod.month).padStart(2, "0")}` : "--"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Period {r.payrollPeriod?.status}
                        </div>
                      </td>

                      {/* Staff count */}
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-700">{r.totalEmployees ?? 0} Employees</span>
                      </td>

                      {/* Gross */}
                      <td className="px-5 py-3.5 font-mono text-slate-800">
                        ₹{Number(r.totalGross || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>

                      {/* Net */}
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">
                        ₹{Number(r.totalNet || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/dashboards/payroll/runs/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 transition font-semibold text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Run</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRuns.map((r) => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/dashboards/payroll/runs/${r.id}`}
                        className="font-bold text-slate-900 text-xs hover:text-indigo-600"
                      >
                        Run #{r.runNumber}
                      </Link>
                      <div className="text-[10px] font-mono text-slate-400">
                        Period: {r.payrollPeriod?.year}-{String(r.payrollPeriod?.month).padStart(2, "0")}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Staff</span>
                      <span className="font-semibold">{r.totalEmployees ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Net Payable</span>
                      <span className="font-mono font-bold text-emerald-800">
                        ₹{Number(r.totalNet || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Link
                      href={`/dashboards/payroll/runs/${r.id}`}
                      className="px-3 py-1 rounded-md bg-slate-900 text-white font-semibold text-xs"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Run Modal */}
      <CreatePayrollRunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        onSuccess={() => {
          fetchRunsAndPeriods();
        }}
      />
    </div>
  );
}
