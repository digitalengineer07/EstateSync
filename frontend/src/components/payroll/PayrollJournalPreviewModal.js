"use client";

import { X, Scale, FileText, CheckCircle2, AlertTriangle, Calendar, Tag, ShieldCheck } from "lucide-react";

export default function PayrollJournalPreviewModal({
  isOpen,
  onClose,
  journal,
  title = "General Ledger Journal Entry",
  subtitle = "Double-Entry Accounting Record"
}) {
  if (!isOpen || !journal) return null;

  const lines = journal.lines || [];
  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-mono">{subtitle}</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Entry Number</span>
              <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block truncate">
                {journal.entryNumber || journal.id?.slice(0, 12) || "PREVIEW"}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Reference</span>
              <span className="font-bold text-slate-800 font-mono text-xs mt-0.5 block truncate">
                {journal.referenceType || "PAYROLL"}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Debits</span>
              <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block">
                ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Credits</span>
              <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block">
                ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Description */}
          {journal.description && (
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{journal.description}</span>
            </div>
          )}

          {/* Balance Status Banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isBalanced
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Double-Entry Balanced: Total Debits equal Total Credits</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Double-Entry Imbalance Detected!</span>
                </>
              )}
            </div>
            <span className="font-mono text-[11px] font-bold">
              Delta: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
            </span>
          </div>

          {/* Compound Lines Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Account</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Narration</th>
                  <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                  <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {lines.map((l, idx) => {
                  const accCode = l.account?.code || l.accountCode;
                  const accName = l.account?.name || l.accountName;
                  const accType = l.account?.type || l.accountType;
                  const dr = Number(l.debit || 0);
                  const cr = Number(l.credit || 0);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900 font-sans">{accName}</div>
                        <div className="text-[10px] text-slate-400">{accCode}</div>
                      </td>
                      <td className="px-4 py-2.5 font-sans">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {accType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-sans text-[11px]">
                        {l.description}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        {dr > 0 ? `₹${dr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        {cr > 0 ? `₹${cr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-mono font-bold text-xs border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 font-sans text-slate-700">
                    Grand Total
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-900">
                    ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-900">
                    ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            Immutable Double-Entry General Ledger Record
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
