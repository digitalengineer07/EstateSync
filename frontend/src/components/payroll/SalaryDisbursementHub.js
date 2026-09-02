"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getPeriods, getRunById } from "@/services/payrollService";
import SalaryDisbursementsSection from "./SalaryDisbursementsSection";
import {
  Landmark,
  Layers,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Lock,
  Building
} from "lucide-react";

export default function SalaryDisbursementHub() {
  const { user } = useAuth();

  const [periods, setPeriods] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [error, setError] = useState(null);

  const canViewPayroll = hasPermission(user, "payroll.item.view") || hasPermission(user, "payroll.run.view");

  const fetchPeriodsAndRuns = useCallback(async () => {
    if (!canViewPayroll) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getPeriods();
      if (res.success && Array.isArray(res.periods)) {
        setPeriods(res.periods);

        // Collect all runs
        const runs = res.periods.flatMap((p) =>
          (p.runs || []).map((r) => ({ ...r, period: p }))
        );

        // Prefer the first locked run, or fallback to first available run
        const defaultRun = runs.find((r) => r.status === "LOCKED") || runs[0];
        if (defaultRun) {
          setSelectedRunId(defaultRun.id);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load payroll periods");
    } finally {
      setLoading(false);
    }
  }, [canViewPayroll]);

  useEffect(() => {
    fetchPeriodsAndRuns();
  }, [fetchPeriodsAndRuns]);

  // Fetch full details of selected run
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    let isMounted = true;
    setLoadingRun(true);

    getRunById(selectedRunId)
      .then((res) => {
        if (isMounted && res.success && res.run) {
          setSelectedRun(res.run);
        }
      })
      .catch((err) => {
        if (isMounted) console.error("Error fetching run for disbursement:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingRun(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  if (!canViewPayroll) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center text-xs text-slate-500">
        <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-slate-400 mt-1">You do not have permission to access Salary Disbursements & Treasury.</p>
      </div>
    );
  }

  const allRuns = periods.flatMap((p) =>
    (p.runs || []).map((r) => ({
      id: r.id,
      label: `Run #${r.runNumber} — ${p.year}-${String(p.month).padStart(2, "0")} (${r.status})`,
      status: r.status
    }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Salary Disbursements & Treasury
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Landmark className="w-3.5 h-3.5" />
              Phase 5 Settlement
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Execute single and multi-employee salary payouts, manage funds reservation, and reconcile Corporate Treasury settlement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Run Selector Dropdown */}
          {allRuns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Payroll Run:</span>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              >
                {allRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href="/dashboards/payroll/runs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <span>Calculation Runs</span>
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
          <button onClick={fetchPeriodsAndRuns} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Selected Run Disbursement View */}
      {loading || loadingRun ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading salary disbursement workspace...</span>
        </div>
      ) : !selectedRun ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-16 text-center">
          <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-900">No Payroll Run Available</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create and lock a calculation run first before initiating salary disbursement vouchers.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboards/payroll/runs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              <span>Go to Calculation Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <SalaryDisbursementsSection run={selectedRun} />
      )}
    </div>
  );
}
