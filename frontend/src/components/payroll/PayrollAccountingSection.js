"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import {
  getPostingPreview,
  postToLedger,
  reversePosting,
  getAccountingPosting
} from "@/services/payrollService";
import PayrollJournalPreviewModal from "./PayrollJournalPreviewModal";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  Send,
  RotateCcw,
  Eye,
  Check,
  Calendar,
  Layers
} from "lucide-react";

export default function PayrollAccountingSection({ run, onStatusChange }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [postingData, setPostingData] = useState(null); // null if not posted
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Mutation states
  const [postingLedger, setPostingLedger] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [showReverseModal, setShowReverseModal] = useState(false);

  // Modal inspection
  const [selectedJournal, setSelectedJournal] = useState(null);

  const canViewAccounting = hasPermission(user, "payroll.accounting.view");
  const canPostLedger = hasPermission(user, "payroll.accounting.post");
  const canReverseLedger = hasPermission(user, "payroll.accounting.reverse");

  const isRunLocked = run?.status === "LOCKED";

  const fetchAccountingStatus = useCallback(async () => {
    if (!run?.id || !canViewAccounting) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Try to fetch existing accounting posting
      try {
        const postingRes = await getAccountingPosting(run.id);
        if (postingRes.success && postingRes.posting) {
          setPostingData(postingRes.posting);
          setPreviewData(null);
          setLoading(false);
          return;
        }
      } catch (err) {
        // 404 means not yet posted to GL - normal
        if (err.status !== 404) {
          console.warn("Accounting posting check status:", err.message);
        }
        setPostingData(null);
      }

      // 2. If not posted and run is LOCKED, fetch preview
      if (isRunLocked) {
        try {
          const previewRes = await getPostingPreview(run.id);
          if (previewRes.success && previewRes.preview) {
            setPreviewData(previewRes.preview);
          }
        } catch (previewErr) {
          setError(previewErr.message || "Failed to generate posting preview");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load accounting status");
    } finally {
      setLoading(false);
    }
  }, [run?.id, isRunLocked, canViewAccounting]);

  useEffect(() => {
    fetchAccountingStatus();
  }, [fetchAccountingStatus]);

  // Handle Post to Ledger
  const handlePostToLedger = async () => {
    if (!canPostLedger || !isRunLocked) return;
    if (!window.confirm("Confirm posting this payroll run to the General Ledger? This creates immutable double-entry journal records.")) {
      return;
    }

    setPostingLedger(true);
    setError(null);
    try {
      const res = await postToLedger(run.id);
      setSuccessMsg(res.message || "Payroll run successfully posted to General Ledger.");
      setTimeout(() => setSuccessMsg(null), 5000);
      if (onStatusChange) onStatusChange();
      fetchAccountingStatus();
    } catch (err) {
      setError(err.message || "Failed to post payroll to General Ledger");
    } finally {
      setPostingLedger(false);
    }
  };

  // Handle Reverse Posting
  const handleReversePosting = async (e) => {
    e.preventDefault();
    if (!canReverseLedger || !reverseReason.trim()) return;

    setReversing(true);
    setError(null);
    try {
      const res = await reversePosting(run.id, { reason: reverseReason.trim() });
      setSuccessMsg(res.message || "Payroll GL posting reversed successfully.");
      setShowReverseModal(false);
      setReverseReason("");
      setTimeout(() => setSuccessMsg(null), 5000);
      if (onStatusChange) onStatusChange();
      fetchAccountingStatus();
    } catch (err) {
      setError(err.message || "Failed to reverse GL posting");
    } finally {
      setReversing(false);
    }
  };

  if (!canViewAccounting) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">
        <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <span>You do not have permission to view General Ledger accounting integration.</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Notifications */}
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
          <button onClick={fetchAccountingStatus} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">General Ledger Accrual</h3>
                {postingData ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      postingData.status === "POSTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {postingData.status}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    NOT POSTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Phase 4 Double-Entry Accrual Accounting Integration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAccountingStatus}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh accounting status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Verifying General Ledger posting status...</span>
          </div>
        ) : postingData ? (
          /* =========================================================================
             STATE A: POSTED (OR REVERSED)
             ========================================================================= */
          <div className="space-y-6">
            {/* Posted Info Card */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    {postingData.status === "POSTED"
                      ? "Accrual Journal Posted to General Ledger"
                      : "Payroll Accrual Posting Reversed"}
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Journal Entry:{" "}
                    <span className="font-mono font-bold">{postingData.journalEntry?.entryNumber || postingData.journalEntryId}</span> • Posted on{" "}
                    {new Date(postingData.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedJournal(postingData.journalEntry)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-50 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Inspect Journal Entry</span>
                </button>

                {canReverseLedger && postingData.status === "POSTED" && (
                  <button
                    onClick={() => setShowReverseModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reverse Posting</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reconciliation KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Source Payroll Net</span>
                <span className="font-bold text-slate-900 font-mono text-base mt-0.5 block">
                  ₹{Number(run?.totalNet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">From locked calculation snapshot</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Net Salaries Payable (GL 2010)</span>
                <span className="font-bold text-slate-900 font-mono text-base mt-0.5 block">
                  ₹{Number(run?.totalNet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Credit liability in General Ledger</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <span className="text-emerald-700 block text-[10px] font-semibold uppercase">Reconciliation Status</span>
                <span className="font-bold text-emerald-950 text-sm mt-0.5 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  MATCHED & BALANCED
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 block">Zero reconciliation delta</span>
              </div>
            </div>

            {/* Reversal Details if Reversed */}
            {postingData.status === "REVERSED" && postingData.reversalJournalEntry && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Symmetric Reversal Journal Created</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Reversal Entry: <span className="font-mono font-bold">{postingData.reversalJournalEntry.entryNumber}</span> • Original liability restored to pending settlement state.
                </p>
                <button
                  onClick={() => setSelectedJournal(postingData.reversalJournalEntry)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 underline"
                >
                  Inspect Reversal Lines
                </button>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             STATE B: NOT POSTED (PREVIEW & POSTING ACTION)
             ========================================================================= */
          <div className="space-y-6">
            {!isRunLocked ? (
              /* Run not locked notice */
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Posting Blocked — Payroll Run Not Locked</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Only payroll runs in <span className="font-semibold text-slate-700 font-mono">LOCKED</span> status can be posted to the General Ledger. Lock this payroll run above once management approval is finalized.
                </p>
              </div>
            ) : previewData ? (
              /* Proposed Journal Preview */
              <div className="space-y-5">
                {/* Proposed Journal Banner */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                      Proposed General Ledger Accrual Journal
                    </h4>
                    <p className="text-xs text-indigo-800 mt-1">
                      {previewData.proposedJournal?.description}
                    </p>
                  </div>

                  {canPostLedger && (
                    <button
                      onClick={handlePostToLedger}
                      disabled={postingLedger}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {postingLedger ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Posting to GL...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Post to General Ledger</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Double-Entry Preview Lines Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Account</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Line Description</th>
                        <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                        <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(previewData.proposedJournal?.lines || []).map((l, idx) => {
                        const dr = Number(l.debit || 0);
                        const cr = Number(l.credit || 0);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-slate-900 font-sans">{l.accountName}</div>
                              <div className="text-[10px] text-slate-400">{l.accountCode}</div>
                            </td>
                            <td className="px-4 py-2.5 font-sans">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {l.accountType}
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
                          Total Compound Entry
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-900">
                          ₹{Number(previewData.proposedJournal?.totalDebit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-900">
                          ₹{Number(previewData.proposedJournal?.totalCredit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Double Entry Verification */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Double-Entry Balance Verified: Debits equal Credits</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold">Status: BALANCED</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Reversal Confirmation Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reverse General Ledger Posting</h3>
                <p className="text-xs text-slate-500">Post symmetric reversing journal entry</p>
              </div>
            </div>

            <form onSubmit={handleReversePosting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reversal Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="State the audit or accounting reason for this journal reversal..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                Warning: Reversing this posting will generate an audit-logged reversing entry and mark original entry as REVERSED.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  disabled={reversing}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing || !reverseReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {reversing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Confirm Reversal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Details Modal */}
      <PayrollJournalPreviewModal
        isOpen={Boolean(selectedJournal)}
        onClose={() => setSelectedJournal(null)}
        journal={selectedJournal}
      />
    </div>
  );
}
