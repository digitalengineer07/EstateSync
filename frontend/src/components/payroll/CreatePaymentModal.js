"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { createPayment, settlePayment } from "@/services/salaryPaymentService";
import {
  Landmark,
  X,
  CreditCard,
  Banknote,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Building,
  Hash
} from "lucide-react";

export default function CreatePaymentModal({
  isOpen,
  onClose,
  runId,
  item,
  onSuccess
}) {
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [sourceAccountCode, setSourceAccountCode] = useState("1010");
  const [referenceNo, setReferenceNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumberMasked, setAccountNumberMasked] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [notes, setNotes] = useState("");
  const [directSettle, setDirectSettle] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !item) return null;

  const availablePayable = Number(item.availablePayable ?? item.netPayable ?? 0);
  const netPayable = Number(item.netPayable ?? 0);

  const canSettle = hasPermission(user, "payroll.approve");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please specify a valid payment amount greater than zero.");
      return;
    }

    if (numAmount > availablePayable) {
      setError(`Amount cannot exceed the current available payable of ₹${availablePayable.toLocaleString("en-IN")}.`);
      return;
    }

    if (paymentMode === "BANK" && !referenceNo.trim()) {
      setError("Bank Reference Number / UTR is required for Bank payment mode.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Payment Voucher
      const paymentPayload = {
        payrollRunId: runId,
        payrollItemId: item.payrollItemId || item.id,
        employeeId: item.employeeId,
        amount: numAmount,
        paymentMode,
        sourceAccountCode,
        bankName: bankName.trim() || undefined,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        initialStatus: "DRAFT"
      };

      const res = await createPayment(paymentPayload);
      const createdPayment = res.payment;

      // 2. If direct settle is checked and user has approve permission, settle it immediately
      if (directSettle && canSettle && createdPayment?.id) {
        await settlePayment(createdPayment.id, {
          paymentDate: new Date().toISOString().slice(0, 10),
          referenceNo: referenceNo.trim() || undefined,
          paymentMode,
          sourceAccountCode
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to process salary payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Salary Disbursement Voucher</h3>
              <p className="text-xs text-slate-500">
                {item.employeeName} ({item.employeeCode})
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Payable Info */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Obligation</span>
              <span className="font-bold text-slate-900 block font-mono text-sm mt-0.5">
                ₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 uppercase font-semibold">Available Payable</span>
              <span className="font-bold text-emerald-800 block font-mono text-sm mt-0.5">
                ₹{availablePayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Disbursement Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(availablePayable))}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Max (₹{availablePayable.toLocaleString("en-IN")})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={availablePayable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(availablePayable)}
                className="w-full text-xs font-mono pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                required
              />
            </div>
          </div>

          {/* Payment Mode & Treasury Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value);
                  setSourceAccountCode(e.target.value === "CASH" ? "1020" : "1010");
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CASH">Cash in Hand</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Treasury Account</label>
              <select
                value={sourceAccountCode}
                onChange={(e) => setSourceAccountCode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="1010">1010 - Corporate Bank Account</option>
                <option value="1020">1020 - Cash in Hand</option>
              </select>
            </div>
          </div>

          {/* Bank / Reference Details */}
          {paymentMode === "BANK" ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Bank Reference / UTR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. UTR-20260902-8871"
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enforced against Global Bank Reference registry for uniqueness.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Account (Masked)</label>
                  <input
                    type="text"
                    value={accountNumberMasked}
                    onChange={(e) => setAccountNumberMasked(e.target.value)}
                    placeholder="XXXXXX1234"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Reference / Receipt #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. CASH-VOUCHER-001 (Optional)"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Narration</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly salary payout tranche"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Direct Settle Checkbox */}
          {canSettle && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="directSettle"
                checked={directSettle}
                onChange={(e) => setDirectSettle(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="directSettle" className="text-xs text-emerald-950 font-medium cursor-pointer">
                Settle immediately from Corporate Treasury
                <span className="text-[10px] text-emerald-800 block mt-0.5 font-normal">
                  Creates payment voucher and records internal settlement transaction against GL and Corporate Wallet in one atomic action.
                </span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availablePayable <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{directSettle ? "Disburse & Settle" : "Create Voucher"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
