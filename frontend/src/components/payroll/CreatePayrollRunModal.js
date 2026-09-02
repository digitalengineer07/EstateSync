"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPeriods, createRun } from "@/services/payrollService";
import { X, Calculator, AlertTriangle, Loader2, Calendar } from "lucide-react";

export default function CreatePayrollRunModal({
  isOpen,
  onClose,
  preselectedPeriodId = null,
  onSuccess
}) {
  const router = useRouter();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(preselectedPeriodId || "");
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchEligiblePeriods = async () => {
        setLoadingPeriods(true);
        setError(null);
        try {
          const res = await getPeriods();
          if (res.success && Array.isArray(res.periods)) {
            // Eligible periods are OPEN or DRAFT (not LOCKED or CLOSED)
            const eligible = res.periods.filter((p) => ["OPEN", "DRAFT"].includes(p.status));
            setPeriods(eligible);
            if (preselectedPeriodId) {
              setSelectedPeriodId(preselectedPeriodId);
            } else if (eligible.length > 0) {
              setSelectedPeriodId(eligible[0].id);
            }
          }
        } catch (err) {
          setError("Failed to load eligible payroll periods: " + err.message);
        } finally {
          setLoadingPeriods(false);
        }
      };
      fetchEligiblePeriods();
    }
  }, [isOpen, preselectedPeriodId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPeriodId) {
      setError("Please select a valid Payroll Period.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createRun({ payrollPeriodId: selectedPeriodId });
      if (onSuccess) onSuccess(result.run);
      onClose();
      // Navigate to the newly created run
      if (result.run?.id) {
        router.push(`/dashboards/payroll/runs/${result.run.id}`);
      }
    } catch (err) {
      setError(err.message || "Failed to create payroll run");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Calculation Run</h3>
              <p className="text-xs text-slate-500">Initiate a batch payroll calculation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Accounting Period <span className="text-rose-500">*</span>
            </label>
            {loadingPeriods ? (
              <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading eligible periods...</span>
              </div>
            ) : periods.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                No open or draft periods available. Please create or open a payroll period first.
              </div>
            ) : (
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                required
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.year}-{String(p.month).padStart(2, "0")} ({p.status}) - {p._count?.runs || 0} existing runs
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Creating a calculation run creates a fresh batch in <span className="font-semibold text-slate-800">DRAFT</span> status ready for automated 1-click payroll processing.
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || periods.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Run...</span>
              </>
            ) : (
              <span>Create Run</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
