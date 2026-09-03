"use client";

import { useState } from "react";
import { Landmark, ArrowUpRight, X, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { API_URL } from "@/config/api";

export default function RecordBankInflowModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "HDFC Bank Ltd - Corporate Current A/C",
    accountNo: "50200091823412",
    inflowType: "CAPITAL_INFUSION",
    paymentMode: "RTGS",
    referenceNo: "",
    transactionDate: new Date().toISOString().split("T")[0],
    narration: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedAmount = parseFloat(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid positive deposit amount.");
      setLoading(false);
      return;
    }

    if (formData.paymentMode !== 'CASH' && (!formData.bankName.trim() || !formData.referenceNo.trim())) {
      setError("Bank Name and UTR / Reference Number are required.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/treasury/inflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          bankName: formData.paymentMode === 'CASH' ? 'Cash In Hand' : formData.bankName.trim(),
          accountNo: formData.paymentMode === 'CASH' ? null : (formData.accountNo ? formData.accountNo.trim() : null),
          referenceNo: formData.paymentMode === 'CASH' ? null : formData.referenceNo.trim(),
          narration: formData.narration ? formData.narration.trim() : null
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
      } else {
        setError(data.message || "Failed to record bank inflow.");
      }
    } catch (err) {
      console.error("Network error recording inflow:", err);
      setError("Network error connecting to backend treasury service.");
    } finally {
      setLoading(false);
    }
  };

  const getCreditAccountLabel = () => {
    switch (formData.inflowType) {
      case "DIRECTOR_LOAN":
        return "3020 - Director Loans & Shareholder Advances (Liability)";
      case "BANK_INTEREST":
      case "OTHER":
        return "4020 - Bank Interest & Miscellaneous Receipts (Revenue)";
      case "CAPITAL_INFUSION":
      default:
        return "3010 - Organizational Capital & Equity (Equity)";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Record Bank Statement Deposit / Inflow
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">
                  Treasury Credit
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record new capital, loan advances, or direct bank deposits received into the company treasury.
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

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Deposit Amount (₹) <span className="text-rose-500">*</span>
                <span className="text-[11px] font-normal text-slate-500 block">
                  Enter the exact total amount credited to your bank account
                </span>
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="e.g. 500000"
                  required
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Inflow Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Source of Funds (Reason for Deposit) <span className="text-rose-500">*</span>
                <span className="text-[11px] font-normal text-slate-500 block">
                  Select where this money came from
                </span>
              </label>
              <select
                name="inflowType"
                value={formData.inflowType}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="CAPITAL_INFUSION">Shareholder Capital / Equity Infusion</option>
                <option value="DIRECTOR_LOAN">Director / Promoter Loan Advance</option>
                <option value="BANK_INTEREST">Bank Interest & Financial Returns</option>
                <option value="OTHER">Other Bank Deposit / Direct Receipt</option>
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Payment Method / Transfer Type <span className="text-rose-500">*</span>
                <span className="text-[11px] font-normal text-slate-500 block">
                  How was this money sent into the bank?
                </span>
              </label>
              <select
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              >
                <option value="RTGS">RTGS (Real-Time Gross Settlement)</option>
                <option value="NEFT">NEFT (National Electronic Fund Transfer)</option>
                <option value="IMPS">IMPS (Immediate Mobile / Online Transfer)</option>
                <option value="CHEQUE">Bank Cheque / Demand Draft Deposit</option>
                <option value="UPI">Corporate UPI / Online Banking</option>
                <option value="CASH">Cash Deposited at Bank Counter</option>
                <option value="WIRE">International Wire Transfer (SWIFT)</option>
              </select>
            </div>

            {formData.paymentMode !== 'CASH' && (
              <>
                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Company Receiving Bank Name <span className="text-rose-500">*</span>
                    <span className="text-[11px] font-normal text-slate-500 block">
                      Name of the company bank where money was deposited
                    </span>
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank Ltd - Corporate Current A/C"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>

                {/* UTR / Reference No */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Transaction Reference / UTR Number <span className="text-rose-500">*</span>
                    <span className="text-[11px] font-normal text-slate-500 block">
                      UTR, transaction ID, or Cheque number from bank statement
                    </span>
                  </label>
                  <input
                    type="text"
                    name="referenceNo"
                    value={formData.referenceNo}
                    onChange={handleChange}
                    placeholder="e.g. UTR202608290091"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </>
            )}

            {/* Transaction Value Date */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Deposit Clearance Date (Value Date)
                <span className="text-[11px] font-normal text-slate-500 block">
                  Date when the deposit was credited to the bank statement
                </span>
              </label>
              <input
                type="date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Account Number (Optional) */}
            {formData.paymentMode !== 'CASH' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Company Account Number (Optional)
                  <span className="text-[11px] font-normal text-slate-500 block">
                    Account number of the receiving company bank
                  </span>
                </label>
                <input
                  type="text"
                  name="accountNo"
                  value={formData.accountNo}
                  onChange={handleChange}
                  placeholder="e.g. 50200091823412"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            )}

            {/* Narration */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Transaction Remarks / Notes (Optional)
                <span className="text-[11px] font-normal text-slate-500 block">
                  Additional details, sender info, or purpose for accounting records
                </span>
              </label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Shareholder capital contribution from promoters for operational liquidity..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Double-Entry Preview Box */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-400 font-sans text-[11px] pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Automated Accounting Journal (Double-Entry)
              </span>
              <span>General Ledger Sync</span>
            </div>
            <div className="flex justify-between items-center text-emerald-300">
              <span>[Debit - Bank Asset +] 1010 - Corporate Bank (Money Received)</span>
              <span className="font-bold">₹{parseFloat(formData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span>[Credit - Source] {getCreditAccountLabel()}</span>
              <span className="font-bold">₹{parseFloat(formData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Posting to Treasury...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Post Deposit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
