"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getPeriods, openPeriod } from "@/services/payrollService";
import PayrollPeriodModal from "./PayrollPeriodModal";
import CreatePayrollRunModal from "./CreatePayrollRunModal";
import {
  Calendar,
  Search,
  Plus,
  Unlock,
  RefreshCw,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  Layers,
  Lock
} from "lucide-react";

export default function PayrollPeriodList() {
  const { user } = useAuth();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");

  // Modals
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodForRunCreation, setPeriodForRunCreation] = useState(null);
  const [openingPeriodId, setOpeningPeriodId] = useState(null);

  const canManagePeriod = hasPermission(user, "payroll.period.manage");
  const canCreateRun = hasPermission(user, "payroll.run.create");

  const fetchPeriodsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (yearFilter !== "ALL") params.year = yearFilter;

      const res = await getPeriods(params);
      if (res.success && Array.isArray(res.periods)) {
        setPeriods(res.periods);
      } else {
        setPeriods([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load payroll periods");
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, yearFilter]);

  useEffect(() => {
    fetchPeriodsList();
  }, [fetchPeriodsList]);

  // Derived Metrics
  const totalCount = periods.length;
  const openCount = periods.filter((p) => p.status === "OPEN").length;
  const draftCount = periods.filter((p) => p.status === "DRAFT").length;

  const handleOpenPeriod = async (period) => {
    if (!canManagePeriod) return;
    setOpeningPeriodId(period.id);
    setError(null);
    try {
      await openPeriod(period.id);
      setSuccessMsg(`Payroll Period ${period.year}-${String(period.month).padStart(2, "0")} is now OPEN for calculation.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchPeriodsList();
    } catch (err) {
      setError(err.message || "Failed to open period");
    } finally {
      setOpeningPeriodId(null);
    }
  };

  const getMonthName = (m) => {
    const d = new Date(2026, m - 1, 1);
    return d.toLocaleString("default", { month: "long" });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Monthly Payroll Periods
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Calendar className="w-3.5 h-3.5" />
              Fiscal Accounting Windows
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Initialize calendar periods, govern calculation availability, and track monthly processing batches.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboards/payroll/runs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>View Calculation Runs</span>
          </Link>

          {canManagePeriod && (
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchPeriodsList} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Periods</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Calendar monthly windows</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open for Calculation</span>
            <Unlock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : openCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Accepting new calculation runs</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Periods</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : draftCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pending opening by admin</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="LOCKED">Locked</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button
            onClick={fetchPeriodsList}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh periods"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading monthly periods...</span>
          </div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Payroll Periods Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {statusFilter !== "ALL" || yearFilter !== "ALL"
                ? "No payroll periods match your filters. Try resetting filters."
                : "No monthly payroll periods initialized yet."}
            </p>
            {canManagePeriod && (
              <button
                onClick={() => setIsPeriodModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize First Period</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-5 py-3">Period</th>
                    <th scope="col" className="px-5 py-3">Date Interval</th>
                    <th scope="col" className="px-5 py-3">Calculation Batches</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map((p) => {
                    const monthName = getMonthName(p.month);
                    const isDraft = p.status === "DRAFT";
                    const isOpen = p.status === "OPEN";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Period Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                              {String(p.month).padStart(2, "0")}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {monthName} {p.year}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {p.year}-{String(p.month).padStart(2, "0")}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Date Range */}
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {new Date(p.periodStart).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short"
                          })}{" "}
                          →{" "}
                          {new Date(p.periodEnd).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>

                        {/* Runs Count */}
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.runs?.length || p._count?.runs || 0} Runs
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.status === "OPEN"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.status === "DRAFT"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManagePeriod && isDraft && (
                              <button
                                onClick={() => handleOpenPeriod(p)}
                                disabled={openingPeriodId === p.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition"
                                title="Open Period for Calculation"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Open Period</span>
                              </button>
                            )}

                            {canCreateRun && isOpen && (
                              <button
                                onClick={() => setPeriodForRunCreation(p.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs transition"
                                title="Create Calculation Run"
                              >
                                <Plus className="w-3 h-3" />
                                <span>New Run</span>
                              </button>
                            )}

                            <Link
                              href={`/dashboards/payroll/runs?periodId=${p.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition"
                              title="View Runs for Period"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden divide-y divide-slate-100">
              {periods.map((p) => {
                const monthName = getMonthName(p.month);
                const isDraft = p.status === "DRAFT";
                const isOpen = p.status === "OPEN";

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {monthName} {p.year}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {p.year}-{String(p.month).padStart(2, "0")}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === "OPEN"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono">
                      {new Date(p.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} →{" "}
                      {new Date(p.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{p.runs?.length || p._count?.runs || 0} Runs</span>

                      <div className="flex items-center gap-1.5">
                        {canManagePeriod && isDraft && (
                          <button
                            onClick={() => handleOpenPeriod(p)}
                            disabled={openingPeriodId === p.id}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold text-[10px]"
                          >
                            Open Period
                          </button>
                        )}
                        {canCreateRun && isOpen && (
                          <button
                            onClick={() => setPeriodForRunCreation(p.id)}
                            className="px-2.5 py-1 rounded-md bg-indigo-600 text-white font-semibold text-[10px]"
                          >
                            New Run
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Period Modal */}
      <PayrollPeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg("Payroll Period created in DRAFT status.");
          setTimeout(() => setSuccessMsg(null), 4000);
          fetchPeriodsList();
        }}
      />

      {/* Run Creation Modal */}
      <CreatePayrollRunModal
        isOpen={Boolean(periodForRunCreation)}
        onClose={() => setPeriodForRunCreation(null)}
        preselectedPeriodId={periodForRunCreation}
      />
    </div>
  );
}
