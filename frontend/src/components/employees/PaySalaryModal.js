"use client";

import { useState } from "react";
import { mutate } from "swr";
import { X, IndianRupee, Landmark, Send, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { paySalary } from "@/services/salaryService";

export default function PaySalaryModal({ isOpen, onClose, employee, onPaid }) {
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
  
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState(employee?.baseSalary || "");
  const [paymentMode, setPaymentMode] = useState(employee?.paymentMethod || "NEFT");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payout amount greater than ₹0.");
      return;
    }

    if (!month) {
      setError("Please select the payment month.");
      return;
    }

    if (paymentMode !== "CASH" && !referenceNo.trim()) {
      setError("Please enter a Bank UTR / Reference No. for electronic/cheque disbursements.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await paySalary(employee.id, {
        month,
        amount: numAmount,
        paymentMode,
        referenceNo: referenceNo.trim() || null,
        notes: notes.trim() || null
      });

      if (res.success) {
        // Instantly revalidate dashboard stats, treasury liquidity, and wallet balances
        mutate((key) => typeof key === "string" && (key.includes("/api/v1/dashboard") || key.includes("/api/v1/wallets")), undefined, { revalidate: true });
        if (onPaid) onPaid(res.data);
        onClose();
      } else {
        setError(res.message || "Failed to disburse salary payment.");
      }
    } catch (err) {
      setError(err.message || "Server error processing salary disbursement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Disburse Monthly Salary</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct Corporate Treasury Outflow & General Ledger Sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="p-4 mx-6 mt-5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">{employee.fullName}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono font-medium">{employee.employeeCode}</span> • {employee.designation} ({employee.department})
            </div>
            {employee.bankName && (
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.bankName}</span>
                {employee.bankAccountNo && <span>• A/C: {employee.bankAccountNo}</span>}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">Base Salary</div>
            <div className="text-sm font-bold text-slate-900">
              ₹{parseFloat(employee.baseSalary || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Month Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Month <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition font-medium"
              />
            </div>

            {/* Payout Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Disbursement Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 45000"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Disbursement Mode <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition font-medium"
              >
                <option value="NEFT">NEFT Direct Bank</option>
                <option value="RTGS">RTGS Bank Transfer</option>
                <option value="IMPS">IMPS Immediate Payment</option>
                <option value="UPI">UPI Transfer</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Cash Voucher</option>
              </select>
              {paymentMode === "CASH" ? (
                <p className="text-[11px] text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                  <span>💵 Payout will deduct from Corporate Treasury <b>Cash in Hand</b> balance.</span>
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600 mt-1.5 font-medium flex items-center gap-1">
                  <span>🏦 Payout will deduct from Corporate Treasury <b>Bank / Liquid</b> balance.</span>
                </p>
              )}
            </div>

            {/* Reference No / UTR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                UTR / Cheque Reference {paymentMode !== "CASH" && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder={paymentMode === "CASH" ? "Optional cash voucher no" : "e.g. UTR-HDFC-981273"}
                required={paymentMode !== "CASH"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition placeholder:text-slate-400 placeholder:font-sans"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular monthly payout with site incentive"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 transition"
            />
          </div>

          {/* Treasury Outflow Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Main Treasury Account Outflow:</span> Executing this payout will immediately deduct{" "}
              <span className="font-bold">₹{parseFloat(amount || 0).toLocaleString("en-IN")}</span> from Corporate Treasury (`1010`) and post a balanced General Ledger journal entry under Staff Salaries (`5060`).
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Processing Outflow..." : `Disburse ₹${parseFloat(amount || 0).toLocaleString("en-IN")}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
