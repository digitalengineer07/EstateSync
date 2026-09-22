"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { 
  X, 
  Calendar, 
  Landmark, 
  CreditCard, 
  Hash, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  IndianRupee,
  FileText
} from "lucide-react";
import { toISTDateInputString, createSafePaymentDateISO, formatDate, formatINR } from "@/utils/formatters";

export default function EditPropertyPaymentModal({
  isOpen,
  onClose,
  payment,
  property,
  onPaymentUpdated
}) {
  const [dateOfPayment, setDateOfPayment] = useState("");
  const [paymentMode, setPaymentMode] = useState("RTGS");
  const [paidFromAccount, setPaidFromAccount] = useState("Corporate Treasury Account (1010)");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (payment) {
      const rawDate = payment.dateOfPayment ? toISTDateInputString(payment.dateOfPayment) : toISTDateInputString();
      setDateOfPayment(rawDate);
      setPaymentMode(payment.paymentMode || "RTGS");
      setPaidFromAccount(payment.paidFromAccount || "Corporate Treasury Account (1010)");
      setReferenceNo(payment.referenceNo || "");
      setAmount(payment.amount !== undefined && payment.amount !== null ? String(payment.amount) : "");
      setNotes(payment.notes || "");
      setReason("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [payment]);

  if (!isOpen || !payment || !property) return null;

  const oldAmount = parseFloat(payment.amount || 0);
  const newAmountNum = parseFloat(amount || 0);
  const isAmountChanged = !isNaN(newAmountNum) && Math.abs(newAmountNum - oldAmount) > 0.001;
  const delta = isAmountChanged ? Math.round((newAmountNum - oldAmount) * 100) / 100 : 0;

  const oldFMode = (payment.paymentMode || "RTGS").toUpperCase() === "CASH" ? "CASH" : "LIQUID";
  const newFMode = paymentMode.toUpperCase() === "CASH" ? "CASH" : "LIQUID";
  const isModeChanged = oldFMode !== newFMode;

  const totalLandValuation = parseFloat(property.totalLandValue || 0);
  const currentTotalPaid = parseFloat(property.totalPaidToOwner || 0);
  const otherPaymentsPaid = Math.max(0, currentTotalPaid - oldAmount);
  const projectedTotalPaid = isAmountChanged ? Math.max(0, otherPaymentsPaid + newAmountNum) : currentTotalPaid;
  const projectedRemaining = Math.max(0, totalLandValuation - projectedTotalPaid);
  const exceedsValuation = isAmountChanged && newAmountNum > 0 && projectedTotalPaid > (totalLandValuation + 0.01);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!dateOfPayment) {
      setError("Please specify a valid payment date.");
      setLoading(false);
      return;
    }

    if (isNaN(newAmountNum) || newAmountNum <= 0) {
      setError("Please enter a valid positive payment amount.");
      setLoading(false);
      return;
    }

    if (exceedsValuation) {
      setError(`Payment amount ${formatINR(newAmountNum)} causes total paid (${formatINR(projectedTotalPaid)}) to exceed total land valuation (${formatINR(totalLandValuation)}).`);
      setLoading(false);
      return;
    }

    if ((isAmountChanged || isModeChanged) && (!reason || reason.trim().length < 5)) {
      setError("A mandatory justification reason (minimum 5 characters) is required when modifying payment amounts or modes.");
      setLoading(false);
      return;
    }

    if (paymentMode !== "CASH" && referenceNo && referenceNo.trim().length > 22) {
      setError("Bank Reference / UTR number cannot exceed 22 characters.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `prop-pay-edit-${payment.id}-${Date.now()}`;

      const res = await fetch(`${API_URL}/api/v1/properties/payments/${payment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          amount: newAmountNum,
          dateOfPayment: createSafePaymentDateISO(dateOfPayment),
          paymentMode,
          paidFromAccount: paymentMode === "CASH" ? "Cash In Hand" : (paidFromAccount.trim() || null),
          referenceNo: paymentMode === "CASH" ? null : (referenceNo.trim() || null),
          notes: notes.trim() || null,
          reason: reason.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update property payment record");
      }

      setSuccessMsg(data.message || "Payment record updated and accounts settled successfully!");
      if (onPaymentUpdated) {
        onPaymentUpdated(data.data);
      }

      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err) {
      console.error("Error updating property payment:", err);
      setError(err.message || "Network error updating payment record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Edit Land Payout Disbursement</h3>
              <p className="text-xs text-slate-400">
                Khata {property.khataNo}, Plot {property.plotNo} • {property.landOwnerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            {/* Payment Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Disbursement Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dateOfPayment}
                  onChange={(e) => setDateOfPayment(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium"
                  required
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={paymentMode}
                  onChange={(e) => {
                    const nextMode = e.target.value;
                    setPaymentMode(nextMode);
                    if (nextMode === "CASH") {
                      setPaidFromAccount("Cash In Hand");
                      setReferenceNo("");
                    } else if (paidFromAccount === "Cash In Hand") {
                      setPaidFromAccount("Corporate Treasury Account (1010)");
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium bg-white"
                >
                  <option value="RTGS">RTGS (Liquid Bank)</option>
                  <option value="NEFT">NEFT (Liquid Bank)</option>
                  <option value="CASH">CASH (Physical Cash)</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="UPI">UPI</option>
                  <option value="DD">Demand Draft (DD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Original: <span className="font-mono font-semibold text-slate-600">{formatINR(oldAmount)}</span>
              </span>
            </div>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter new payout amount"
                className={`w-full pl-9 pr-3 py-1.5 text-xs font-mono border rounded-lg focus:ring-2 outline-hidden font-bold ${
                  exceedsValuation 
                    ? "border-red-400 focus:ring-red-400/20 text-red-700 bg-red-50/30" 
                    : isAmountChanged 
                      ? "border-amber-400 focus:ring-amber-500/20 text-amber-700 bg-amber-50/20" 
                      : "border-slate-300 focus:ring-amber-500/20 text-slate-900"
                }`}
                required
              />
            </div>

            {/* Financial Delta Badge & Settlement Preview */}
            {isAmountChanged && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Accounting Settlement Delta:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    delta > 0 
                      ? "bg-amber-100 text-amber-800 border border-amber-200" 
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}>
                    {delta > 0 ? `+${formatINR(delta)} (Debit Treasury)` : `${formatINR(delta)} (Refund to Treasury)`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Revised Total Paid to Owner:</span>
                  <span className="font-mono font-semibold text-slate-700">{formatINR(projectedTotalPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Revised Remaining Liability:</span>
                  <span className="font-mono font-semibold text-slate-700">{formatINR(projectedRemaining)}</span>
                </div>
              </div>
            )}

            {/* Fund Mode Reclassification Preview */}
            {isModeChanged && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1.5 text-[11px] text-blue-950 animate-in fade-in duration-150">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">Payment Mode Reclassification:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 border border-blue-300">
                    {oldFMode} → {newFMode}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span>Previous {oldFMode} Account:</span>
                  <span className="font-mono font-semibold text-emerald-700">+{formatINR(oldAmount)} (Refunded)</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span>New {newFMode} Account:</span>
                  <span className="font-mono font-semibold text-amber-700">-{formatINR(newAmountNum || oldAmount)} (Debited)</span>
                </div>
                <p className="text-[10px] text-blue-700/90 pt-0.5 leading-normal">
                  {oldFMode === "CASH" 
                    ? `Note: Because this payout was previously charged to Cash, changing it to RTGS/Bank refunds ₹${oldAmount.toLocaleString('en-IN')} back to Cash balance and debits Bank instead.`
                    : `Note: Changing this bank payout to Cash debits your Cash balance by ₹${(newAmountNum || oldAmount).toLocaleString('en-IN')} and refunds the Bank account.`}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Paid From Account */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Source Account
              </label>
              <div className="relative">
                <Landmark className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={paidFromAccount}
                  onChange={(e) => setPaidFromAccount(e.target.value)}
                  disabled={paymentMode === "CASH"}
                  placeholder={paymentMode === "CASH" ? "Cash In Hand" : "Corporate Treasury (1010)"}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Reference Number / UTR */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Reference / UTR Number
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  disabled={paymentMode === "CASH"}
                  placeholder={paymentMode === "CASH" ? "N/A (Cash Payment)" : "e.g. RTGS-SBI-86758395"}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden uppercase font-medium disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Disbursement Notes / Memo
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Final registry settlement token payment"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Justification Reason (Required if Amount or Mode changed) */}
          {(isAmountChanged || isModeChanged) && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Admin Audit Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Enter mandatory reason for this financial modification (e.g. Bank slip correction / Cheque re-issue)"
                className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50/20 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden resize-none font-medium text-slate-800"
                required
              />
              <p className="text-[10px] text-amber-700 mt-0.5">
                Required for financial audit compliance: Recorded permanently in the General Ledger and Audit Trail.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || exceedsValuation}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg shadow-xs transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
            >
              {loading ? (
                <span>Settling Accounts...</span>
              ) : (
                <span>Save & Settle Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
