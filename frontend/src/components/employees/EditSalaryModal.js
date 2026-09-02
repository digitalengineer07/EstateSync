"use client";

import { useState } from "react";
import { X, IndianRupee, Landmark, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";
import { updateSalaryConfig } from "@/services/employeeService";

export default function EditSalaryModal({ isOpen, onClose, employee, onUpdated }) {
  const [baseSalary, setBaseSalary] = useState(employee?.baseSalary || "");
  const [bankName, setBankName] = useState(employee?.bankName || "");
  const [bankAccountNo, setBankAccountNo] = useState(employee?.bankAccountNo || "");
  const [ifscCode, setIfscCode] = useState(employee?.ifscCode || "");
  const [upiId, setUpiId] = useState(employee?.upiId || "");
  const [paymentMethod, setPaymentMethod] = useState(employee?.paymentMethod || "BANK_TRANSFER");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const numSalary = parseFloat(baseSalary);
    if (isNaN(numSalary) || numSalary < 0) {
      setError("Please enter a valid monthly salary amount (>= 0).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await updateSalaryConfig(employee.id, {
        baseSalary: numSalary,
        bankName: bankName.trim() || null,
        bankAccountNo: bankAccountNo.trim() || null,
        ifscCode: ifscCode.trim().toUpperCase() || null,
        upiId: upiId.trim() || null,
        paymentMethod
      });

      if (res.success) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("estatesync:data-refresh"));
        }
        if (onUpdated) {
          onUpdated({
            ...employee,
            baseSalary: numSalary,
            bankName: bankName.trim() || null,
            bankAccountNo: bankAccountNo.trim() || null,
            ifscCode: ifscCode.trim().toUpperCase() || null,
            upiId: upiId.trim() || null,
            paymentMethod
          });
        }
        onClose();
      } else {
        setError(res.message || "Failed to update salary configuration.");
      }
    } catch (err) {
      setError(err.message || "Server error updating salary configuration.");
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Configure Employee Salary</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.fullName} • <span className="font-mono">{employee.employeeCode}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Monthly Base Salary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Monthly Base Salary (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="e.g. 45000"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fixed monthly baseline compensation before optional allowances or deductions.
            </p>
          </div>

          {/* Preferred Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Preferred Disbursement Mode
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="UPI">UPI Direct</option>
              <option value="CHEQUE">Corporate Cheque</option>
              <option value="CASH">Cash Voucher (Treasury)</option>
            </select>
          </div>

          {/* Bank Information Grid */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 pb-1 border-b border-slate-200/60">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Beneficiary Bank Account Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 font-mono placeholder:text-slate-400 uppercase focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. staff@okhdfcbank"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-start gap-2 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Configuring salary grants Admin & Accounting permission to disburse monthly payouts directly from the Primary Corporate Treasury Wallet.
            </span>
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Salary Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
