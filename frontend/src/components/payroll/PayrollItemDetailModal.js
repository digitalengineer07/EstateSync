"use client";

import { useState, useEffect } from "react";
import { getItemById } from "@/services/payrollService";
import {
  X,
  FileSpreadsheet,
  Users,
  Building,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

export default function PayrollItemDetailModal({
  isOpen,
  onClose,
  payrollItemId
}) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && payrollItemId) {
      const fetchItemDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await getItemById(payrollItemId);
          if (res.success && res.item) {
            setItem(res.item);
          }
        } catch (err) {
          setError(err.message || "Failed to load employee payroll details");
        } finally {
          setLoading(false);
        }
      };
      fetchItemDetails();
    } else {
      setItem(null);
    }
  }, [isOpen, payrollItemId]);

  if (!isOpen) return null;

  const lines = item?.lines || [];
  const earnings = lines.filter((l) => l.componentType === "EARNING");
  const deductions = lines.filter((l) => l.componentType === "DEDUCTION");
  const employerContribs = lines.filter((l) => l.componentType === "EMPLOYER_CONTRIBUTION");

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {item ? item.employeeNameSnapshot : "Employee Payslip Breakdown"}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {item ? `${item.employeeCodeSnapshot} • ${item.departmentSnapshot} (${item.designationSnapshot})` : "Itemized Snapshot"}
              </p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Loading snapshot calculations...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : item ? (
            <>
              {/* Top 4 Summary Pill Cards (Backend snapshot values) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Gross Earnings</span>
                  <span className="font-bold text-slate-900 font-mono text-sm mt-0.5 block">
                    ₹{Number(item.grossEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Deductions</span>
                  <span className="font-bold text-rose-700 font-mono text-sm mt-0.5 block">
                    -₹{Number(item.totalDeductions || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] font-semibold uppercase">Net Payable</span>
                  <span className="font-bold text-emerald-900 font-mono text-sm mt-0.5 block">
                    ₹{Number(item.netPayable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                  <span className="text-indigo-700 block text-[10px] font-semibold uppercase">Employer Cost</span>
                  <span className="font-bold text-indigo-950 font-mono text-sm mt-0.5 block">
                    ₹{Number(item.employerCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Earnings ({earnings.length})
                </h4>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Component</th>
                        <th className="px-4 py-2">Formula / Base</th>
                        <th className="px-4 py-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {earnings.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900">{line.componentNameSnapshot}</div>
                            <div className="text-[10px] font-mono text-slate-400">{line.componentCodeSnapshot}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                            {line.percentageSnapshot ? `${line.percentageSnapshot}%` : "Fixed / Direct"}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-900 text-right">
                            ₹{Number(line.calculatedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Statutory Deductions ({deductions.length})
                </h4>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Component</th>
                        <th className="px-4 py-2">Rate / Base</th>
                        <th className="px-4 py-2 text-right">Deduction Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deductions.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900">{line.componentNameSnapshot}</div>
                            <div className="text-[10px] font-mono text-slate-400">{line.componentCodeSnapshot}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                            {line.percentageSnapshot ? `${line.percentageSnapshot}%` : "Standard"}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-rose-700 text-right">
                            -₹{Number(line.calculatedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Employer Contributions */}
              {employerContribs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Employer Contributions ({employerContribs.length})
                  </h4>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Component</th>
                          <th className="px-4 py-2">Rate</th>
                          <th className="px-4 py-2 text-right">Contribution (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employerContribs.map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-slate-900">{line.componentNameSnapshot}</div>
                              <div className="text-[10px] font-mono text-slate-400">{line.componentCodeSnapshot}</div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                              {line.percentageSnapshot ? `${line.percentageSnapshot}%` : "Standard"}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-indigo-900 text-right">
                              ₹{Number(line.calculatedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Immutable Phase 3 Calculation Snapshot
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
