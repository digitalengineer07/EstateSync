"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import {
  getPaymentSummary,
  reversePayment
} from "@/services/salaryPaymentService";
import CreatePaymentModal from "./CreatePaymentModal";
import CreatePaymentBatchModal from "./CreatePaymentBatchModal";
import {
  Landmark,
  Layers,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Building,
  CreditCard,
  Banknote,
  Lock,
  ArrowRight,
  Info
} from "lucide-react";

export default function SalaryDisbursementsSection({ run, onStatusChange }) {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals
  const [activeItemForPayment, setActiveItemForPayment] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Reversal dialog
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversePaymentId, setReversePaymentId] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  const canCreatePayment = hasPermission(user, "payroll.item.adjust");
  const canSettlePayment = hasPermission(user, "payroll.approve");
  const canReversePayment = hasPermission(user, "payroll.accounting.reverse") && user?.role === "ADMIN";

  const isRunLocked = run?.status === "LOCKED";

  const fetchSummary = useCallback(async () => {
    if (!run?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getPaymentSummary(run.id);
      if (res.success && res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary payment summary");
    } finally {
      setLoading(false);
    }
  }, [run?.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleReverse = async (e) => {
    e.preventDefault();
    if (!canReversePayment || !reversePaymentId.trim() || !reverseReason.trim()) return;

    setReversing(true);
    setError(null);
    try {
      const res = await reversePayment(reversePaymentId.trim(), { reason: reverseReason.trim() });
      setSuccessMsg(res.message || "Payment settlement successfully reversed.");
      setShowReverseModal(false);
      setReversePaymentId("");
      setReverseReason("");
      setTimeout(() => setSuccessMsg(null), 5000);
      if (onStatusChange) onStatusChange();
      fetchSummary();
    } catch (err) {
      setError(err.message || "Failed to reverse salary payment");
    } finally {
      setReversing(false);
    }
  };

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
          <button onClick={fetchSummary} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Salary Disbursement & Treasury</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Phase 5 Treasury Payout
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage employee payment reservations, bulk batch vouchers, and corporate bank settlement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreatePayment && isRunLocked && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Create Payment Batch</span>
              </button>
            )}

            <button
              onClick={fetchSummary}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh payment summary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Cards (Directly from backend calculation) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Net Obligation</span>
            <span className="font-bold text-slate-900 font-mono text-base mt-1 block">
              ₹{Number(summary?.totals?.totalNet || run?.totalNet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Approved salary payable</span>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs">
            <span className="text-amber-700 block text-[10px] font-semibold uppercase">Funds Reserved</span>
            <span className="font-bold text-amber-950 font-mono text-base mt-1 block">
              ₹{Number(summary?.totals?.totalReserved || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-amber-700 mt-0.5 block">In approved / processing batches</span>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs">
            <span className="text-emerald-700 block text-[10px] font-semibold uppercase">Total Settled</span>
            <span className="font-bold text-emerald-950 font-mono text-base mt-1 block">
              ₹{Number(summary?.totals?.totalSettled || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">Disbursed from treasury</span>
          </div>

          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 text-xs">
            <span className="text-indigo-700 block text-[10px] font-semibold uppercase">Available Payable</span>
            <span className="font-bold text-indigo-950 font-mono text-base mt-1 block">
              ₹{Number(summary?.totals?.totalAvailable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-indigo-700 mt-0.5 block">Ready for voucher generation</span>
          </div>
        </div>

        {/* Notice on Unlocked Run */}
        {!isRunLocked && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Run Not Locked:</span> Salary payment vouchers and treasury disbursements can only be initiated against <span className="font-mono font-semibold">LOCKED</span> payroll runs.
            </div>
          </div>
        )}

        {/* Employee Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5 text-right">Net Payable</th>
                <th className="px-4 py-2.5 text-right">Reserved</th>
                <th className="px-4 py-2.5 text-right">Settled</th>
                <th className="px-4 py-2.5 text-right">Available</th>
                <th className="px-4 py-2.5 text-center">Vouchers</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading employee payable balances...</span>
                  </td>
                </tr>
              ) : (summary?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans italic">
                    No employee items found for this calculation run.
                  </td>
                </tr>
              ) : (
                (summary?.items || []).map((item) => {
                  const net = Number(item.netPayable || 0);
                  const reserved = Number(item.reservedAmount || 0);
                  const settled = Number(item.settledAmount || 0);
                  const available = Number(item.availablePayable || 0);

                  return (
                    <tr key={item.payrollItemId} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-900">{item.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.employeeCode}</div>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-right text-amber-700">
                        {reserved > 0 ? `₹${reserved.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-800">
                        {settled > 0 ? `₹${settled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-indigo-700">
                        ₹{available.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {item.paymentsCount || 0}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-sans">
                        {canCreatePayment && isRunLocked && available > 0 ? (
                          <button
                            onClick={() => setActiveItemForPayment(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
                          >
                            <Send className="w-3 h-3" />
                            <span>Disburse</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {available <= 0 ? "Fully Disbursed" : "Locked Run Required"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Payment Voucher Modal */}
      <CreatePaymentModal
        isOpen={Boolean(activeItemForPayment)}
        onClose={() => setActiveItemForPayment(null)}
        runId={run?.id}
        item={activeItemForPayment}
        onSuccess={() => {
          setSuccessMsg("Salary payment voucher processed successfully.");
          setTimeout(() => setSuccessMsg(null), 5000);
          if (onStatusChange) onStatusChange();
          fetchSummary();
        }}
      />

      {/* Batch Payment Modal */}
      <CreatePaymentBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        runId={run?.id}
        items={summary?.items || []}
        onSuccess={() => {
          setSuccessMsg("Salary payment batch voucher created successfully.");
          setTimeout(() => setSuccessMsg(null), 5000);
          if (onStatusChange) onStatusChange();
          fetchSummary();
        }}
      />
    </div>
  );
}
