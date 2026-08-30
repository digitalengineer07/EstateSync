"use client";

import { useState, useTransition } from "react";
import { API_URL } from "@/config/api";
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Receipt, 
  ShieldCheck, 
  Wallet,
  HelpCircle,
  FileText
} from "lucide-react";
import { formatINR } from "@/utils/formatters";

export default function CustomerCancellationSettlementModal({ customer, onClose, onSettled }) {
  const [deductionAmount, setDeductionAmount] = useState("");
  const [refundMode, setRefundMode] = useState("NEFT");
  const [payoutAccount, setPayoutAccount] = useState("Corporate Treasury Account (1010)");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const totalPaid = parseFloat(customer.totalPaid || 0);
  const deduction = parseFloat(deductionAmount || 0);
  const netRefund = Math.max(0, totalPaid - deduction);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (isNaN(deduction) || deduction < 0) {
      setError("Company deduction / costing amount cannot be negative.");
      setLoading(false);
      return;
    }

    if (deduction > totalPaid) {
      setError(`Deductions (${formatINR(deduction)}) cannot exceed total customer deposits (${formatINR(totalPaid)}).`);
      setLoading(false);
      return;
    }

    if (netRefund > 0 && !referenceNo.trim()) {
      setError("Please enter the UTR / Cheque / Transaction Reference Number for the refund disbursement.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `cust-refund-settle-${customer.id}-${Date.now()}`;

      const res = await fetch(`${API_URL}/api/v1/customers/${customer.id}/settle-cancellation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          deductionAmount: deduction,
          refundMode,
          payoutAccount,
          referenceNo: referenceNo.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to settle cancellation refund.");
      }

      setSuccessMsg(data.message || "Cancellation settlement & refund completed successfully!");
      setTimeout(() => {
        onSettled?.(data.data?.customer || customer);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error settling cancellation refund:", err);
      setError(err.message || "Network error processing settlement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Cancellation & Refund Settlement
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black tracking-wider uppercase">
                  Accounting Verification
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {customer.customerName} • Plot {customer.plotNo} ({customer.projectLocation})
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Cancellation Notice Banner */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Reason for Booking Cancellation</span>
              <span className="text-[10px] text-amber-700 font-medium">Pending Settlement</span>
            </div>
            <p className="text-xs text-slate-600 italic bg-white p-2 rounded border border-slate-100">
              "{customer.cancellationReason || "Customer cancelled contract booking."}"
            </p>
          </div>

          {/* Pricing & Refund Calculator */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Settlement Financial Breakdown</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Total Collected</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {formatINR(totalPaid)}
                </span>
              </div>

              <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Company Costing</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  -{formatINR(deduction)}
                </span>
              </div>

              <div className="bg-amber-500/20 p-2.5 rounded-lg border border-amber-500/40">
                <span className="text-[10px] text-amber-300 block font-sans">Net Refund Payable</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  {formatINR(netRefund)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              * Note: Upon approval, exactly <span className="text-amber-300 font-bold">{formatINR(netRefund)}</span> will be deducted from Corporate Treasury (Main Balance). The retained costing ({formatINR(deduction)}) will remain in company books.
            </p>
          </div>

          {/* Form Inputs */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Costing / Retention Deducted (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={totalPaid}
                  required
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="e.g. 250000 (0 if full refund)"
                  className="w-full text-xs font-mono font-bold border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none bg-slate-50/50"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Includes site visit, legal registration, development charges, or processing fees incurred.
              </p>
            </div>

            {netRefund > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Refund Payment Mode *</label>
                    <select
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none bg-white"
                    >
                      <option value="NEFT">NEFT Transfer</option>
                      <option value="RTGS">RTGS Transfer</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="UPI">UPI / IMPS</option>
                      <option value="CASH">Cash Counter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payout Source Account</label>
                    <input
                      type="text"
                      readOnly
                      value={payoutAccount}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-100 text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank UTR / Cheque / Reference No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. UTR-889912003 or CHQ-001290"
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Verification Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional verification remarks regarding client refund and costing approval..."
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none bg-slate-50/50"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "Processing Refund..." : `Approve & Disburse Refund (${formatINR(netRefund)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
