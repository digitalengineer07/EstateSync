"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import {
  getCurrentSalaryAssignment,
  getSalaryAssignments,
  resolveSalaryByDate
} from "@/services/employeeService";
import SalaryAssignmentModal from "./SalaryAssignmentModal";
import {
  FileSpreadsheet,
  Layers,
  Calendar,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Scale,
  Search,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";

export default function EmployeeSalaryTab({ employee }) {
  const { user } = useAuth();
  const employeeId = employee?.id;

  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Date Resolver State
  const [lookupDate, setLookupDate] = useState(new Date().toISOString().split("T")[0]);
  const [resolvedData, setResolvedData] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  // Modal State
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const canCreateAssignment = hasPermission(user, "payroll.assignment.create");

  const fetchSalaryData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current active assignment
      try {
        const currentRes = await getCurrentSalaryAssignment(employeeId);
        if (currentRes.success && currentRes.assignment) {
          setCurrentAssignment(currentRes.assignment);
        } else {
          setCurrentAssignment(null);
        }
      } catch (curErr) {
        // 404 means no active structure assigned
        if (curErr.status === 404) {
          setCurrentAssignment(null);
        } else {
          throw curErr;
        }
      }

      // 2. Fetch full assignment history
      try {
        const historyRes = await getSalaryAssignments(employeeId);
        if (historyRes.success && Array.isArray(historyRes.assignments)) {
          setHistoryList(historyRes.assignments);
        } else {
          setHistoryList([]);
        }
      } catch (histErr) {
        setHistoryList([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary compensation details");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  const handleResolveDate = async (e) => {
    e.preventDefault();
    if (!lookupDate) return;
    setResolving(true);
    setResolveError(null);
    setResolvedData(null);

    try {
      const res = await resolveSalaryByDate(employeeId, lookupDate);
      if (res.success && res.assignment) {
        setResolvedData(res);
      }
    } catch (err) {
      setResolveError(err.message || `No salary structure applicable on ${lookupDate}`);
    } finally {
      setResolving(false);
    }
  };

  const handleAssignmentSuccess = (newAssignment) => {
    setSuccessMsg(`Salary structure "${newAssignment.salaryStructure?.name || 'New Structure'}" assigned successfully.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    fetchSalaryData();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span>Loading compensation profile & assignment history...</span>
      </div>
    );
  }

  // Component Categorization Helper
  const categorizeLines = (lines = []) => {
    const earnings = lines.filter((l) => l.component?.componentType === "EARNING");
    const deductions = lines.filter((l) => l.component?.componentType === "DEDUCTION");
    const employerContribs = lines.filter((l) => l.component?.componentType === "EMPLOYER_CONTRIBUTION");
    return { earnings, deductions, employerContribs };
  };

  const currentLines = currentAssignment?.salaryStructure?.lines || [];
  const { earnings, deductions, employerContribs } = categorizeLines(currentLines);

  return (
    <div className="space-y-6">
      {/* Top Action & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Salary Structure & Compensation Profile</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Effective-dated compensation formulas, component rules, and audit history for payroll calculation.
          </p>
        </div>

        {canCreateAssignment && (
          <button
            onClick={() => setIsAssignOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Structure</span>
          </button>
        )}
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
          <button onClick={fetchSalaryData} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Active Salary Structure Card */}
      {currentAssignment ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-6">
          {/* Structure Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-slate-900">
                  {currentAssignment.salaryStructure?.name}
                </h4>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  {currentAssignment.salaryStructure?.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentAssignment.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentAssignment.salaryStructure?.description || "Configured salary component template"}
              </p>
            </div>

            {/* Effective Dates & Base Gross */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Effective Range</span>
                <span className="font-semibold text-slate-800 mt-0.5 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(currentAssignment.effectiveFrom).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}{" "}
                  →{" "}
                  {currentAssignment.effectiveTo
                    ? new Date(currentAssignment.effectiveTo).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "Present"}
                </span>
              </div>

              {currentAssignment.baseGross && (
                <div className="bg-indigo-50/60 px-3.5 py-2 rounded-lg border border-indigo-100">
                  <span className="text-indigo-600 block text-[10px] uppercase font-semibold">Reference Gross</span>
                  <span className="font-bold text-indigo-950 font-mono text-sm mt-0.5 block">
                    ₹{Number(currentAssignment.baseGross).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Categorized Component Breakdown */}
          <div className="space-y-5">
            {/* Earnings Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Earnings ({earnings.length})
                </h5>
              </div>

              {earnings.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  No earning components defined.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Component</th>
                        <th className="px-4 py-2.5">Calculation Method</th>
                        <th className="px-4 py-2.5">Value / %</th>
                        <th className="px-4 py-2.5">GL Mapping</th>
                        <th className="px-4 py-2.5">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {earnings.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">{line.component?.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{line.component?.code}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {line.calculationMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-800">
                            {line.percentageValue
                              ? `${line.percentageValue}% of ${line.calculationBase || "Basic"}`
                              : line.defaultValue
                              ? `₹${Number(line.defaultValue).toLocaleString("en-IN")}`
                              : "Variable"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                            {line.component?.glAccountCode || "5060"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-semibold ${line.component?.isTaxable ? "text-amber-600" : "text-slate-400"}`}>
                              {line.component?.isTaxable ? "Taxable" : "Exempt"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Deductions Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Statutory Deductions ({deductions.length})
                </h5>
              </div>

              {deductions.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                  No deduction components configured.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Component</th>
                        <th className="px-4 py-2.5">Calculation Method</th>
                        <th className="px-4 py-2.5">Rate / Amount</th>
                        <th className="px-4 py-2.5">GL Liability Account</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deductions.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">{line.component?.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{line.component?.code}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {line.calculationMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-rose-700">
                            {line.percentageValue
                              ? `${line.percentageValue}%`
                              : line.defaultValue
                              ? `₹${Number(line.defaultValue).toLocaleString("en-IN")}`
                              : "Variable"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                            {line.component?.glAccountCode || "2020"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Employer Contributions */}
            {employerContribs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Employer Contributions ({employerContribs.length})
                  </h5>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Component</th>
                        <th className="px-4 py-2.5">Rate / Amount</th>
                        <th className="px-4 py-2.5">Expense GL</th>
                        <th className="px-4 py-2.5">Payable GL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employerContribs.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">{line.component?.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{line.component?.code}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-indigo-800">
                            {line.percentageValue ? `${line.percentageValue}%` : `₹${Number(line.defaultValue || 0).toLocaleString("en-IN")}`}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">5070</td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">2025</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-12 text-center space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">No Salary Structure Assigned</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This employee does not currently have an active compensation structure. Assign a structure to enable monthly payroll calculations.
          </p>
          {canCreateAssignment && (
            <button
              onClick={() => setIsAssignOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Salary Structure</span>
            </button>
          )}
        </div>
      )}

      {/* Section 2: Date-Resolved Salary Inspector */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>View Salary Structure As Of Date</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Resolve which compensation rules were legally applicable on any historical or future date.
            </p>
          </div>

          <form onSubmit={handleResolveDate} className="flex items-center gap-2">
            <input
              type="date"
              value={lookupDate}
              onChange={(e) => setLookupDate(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              required
            />
            <button
              type="submit"
              disabled={resolving}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {resolving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-indigo-400" />}
              <span>Resolve</span>
            </button>
          </form>
        </div>

        {resolveError && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {resolvedData && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Applicable Structure on {resolvedData.asOfDate}:</span>
                <span className="font-bold text-slate-900">{resolvedData.assignment?.salaryStructure?.name}</span>
                <span className="font-mono text-[11px] text-slate-400">({resolvedData.assignment?.salaryStructure?.code})</span>
              </div>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                Resolved from DB
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex flex-wrap gap-4">
              <span>
                Effective From:{" "}
                <strong className="text-slate-700">
                  {new Date(resolvedData.assignment?.effectiveFrom).toISOString().slice(0, 10)}
                </strong>
              </span>
              <span>
                Effective To:{" "}
                <strong className="text-slate-700">
                  {resolvedData.assignment?.effectiveTo
                    ? new Date(resolvedData.assignment.effectiveTo).toISOString().slice(0, 10)
                    : "Present"}
                </strong>
              </span>
              {resolvedData.assignment?.baseGross && (
                <span>
                  Base Gross: <strong className="font-mono text-slate-900">₹{resolvedData.assignment.baseGross}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Salary Assignment History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100">
          <History className="w-3.5 h-3.5 text-indigo-600" />
          <span>Salary Assignment Audit Timeline ({historyList.length})</span>
        </h4>

        {historyList.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 italic text-center">
            No historical salary assignment records found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Structure</th>
                  <th className="px-4 py-2.5">Effective Interval</th>
                  <th className="px-4 py-2.5">Base Gross</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Reason / Notes</th>
                  <th className="px-4 py-2.5">Assigned On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.salaryStructure?.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.salaryStructure?.code}</div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {new Date(item.effectiveFrom).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}{" "}
                      →{" "}
                      {item.effectiveTo
                        ? new Date(item.effectiveTo).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "Present"}
                    </td>

                    <td className="px-4 py-3 font-mono">
                      {item.baseGross ? `₹${Number(item.baseGross).toLocaleString("en-IN")}` : "--"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {item.reason || item.notes || <span className="text-slate-300 italic">None</span>}
                    </td>

                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Assignment Modal */}
      <SalaryAssignmentModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        employee={employee}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}
