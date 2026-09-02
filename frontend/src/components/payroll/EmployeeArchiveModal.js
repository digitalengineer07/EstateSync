"use client";

import { useState } from "react";
import { archiveEmployee } from "@/services/employeeService";
import { X, AlertTriangle, UserX, Loader2 } from "lucide-react";

export default function EmployeeArchiveModal({
  isOpen,
  onClose,
  employee,
  onSuccess
}) {
  const [exitReason, setExitReason] = useState("");
  const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("ARCHIVED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !employee) return null;

  const handleArchive = async (e) => {
    e.preventDefault();
    if (!exitReason.trim()) {
      setError("Please specify the reason for archiving / separation.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await archiveEmployee(employee.id, {
        exitReason: exitReason.trim(),
        exitDate,
        status
      });

      if (onSuccess) onSuccess(result.employee);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to archive employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Archive Employee</h3>
              <p className="text-xs text-slate-500">Record separation or termination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleArchive} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="font-bold text-slate-900">{employee.fullName}</div>
            <div className="text-slate-500 mt-0.5">
              Code: <span className="font-mono text-slate-700">{employee.employeeCode}</span> • {employee.designation} ({employee.department})
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Archiving sets employee status to inactive. The employee will no longer be included in monthly payroll calculations.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Separation Type / Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
            >
              <option value="ARCHIVED">Archived (General)</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Effective Exit Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Exit Reason / Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              rows={3}
              placeholder="e.g. Voluntary resignation, contract completion, termination"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
              required
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Archiving...</span>
                </>
              ) : (
                <span>Confirm Archive</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
