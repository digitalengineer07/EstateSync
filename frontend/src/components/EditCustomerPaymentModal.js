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
  Lock, 
  ShieldCheck, 
  IndianRupee 
} from "lucide-react";
import { toISTDateInputString, createSafePaymentDateISO, formatDate } from "@/utils/formatters";

export default function EditCustomerPaymentModal({
  isOpen,
  onClose,
  payment,
  customer,
  userRole,
  onPaymentUpdated
}) {
  const [dateOfPayment, setDateOfPayment] = useState("");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Role detection: prioritize prop, fallback to localStorage
  const [effectiveRole, setEffectiveRole] = useState(userRole || "ACCOUNTING");

  useEffect(() => {
    if (userRole) {
      setEffectiveRole(userRole);
    } else {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setEffectiveRole(parsed.role?.name || parsed.role || "ACCOUNTING");
        }
      } catch (e) {
        // Fallback to default
      }
    }
  }, [userRole]);

  const isAdmin = effectiveRole === "ADMIN";

  useEffect(() => {
    if (payment) {
      const rawDate = payment.dateOfPayment ? toISTDateInputString(payment.dateOfPayment) : toISTDateInputString();
      setDateOfPayment(rawDate);
      setPaymentMode(payment.paymentMode || "NEFT");
      setSourceAccount(payment.sourceAccount || "");
      setDestinationAccount(payment.destinationAccount || "");
      setReferenceNo(payment.referenceNo || "");
      setAmount(payment.amount !== undefined && payment.amount !== null ? String(payment.amount) : "");
      setReason("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const oldAmount = parseFloat(payment.amount || 0);
  const newAmountNum = parseFloat(amount || 0);
  const isAmountChanged = !isNaN(newAmountNum) && Math.abs(newAmountNum - oldAmount) > 0.001;
  const delta = isAmountChanged ? Math.round((newAmountNum - oldAmount) * 100) / 100 : 0;

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

    if (isAdmin && isAmountChanged) {
      if (isNaN(newAmountNum) || newAmountNum <= 0) {
        setError("Please enter a valid positive payment amount.");
        setLoading(false);
        return;
      }
      if (!reason || reason.trim().length < 10) {
        setError("Please provide a detailed adjustment reason (minimum 10 characters) for financial compliance audit trail.");
        setLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("accessToken");
      const safeDateISO = createSafePaymentDateISO(dateOfPayment);

      const payload = {
        dateOfPayment: safeDateISO,
        paymentMode: paymentMode.toUpperCase(),
        sourceAccount: paymentMode === "CASH" ? "Cash In Hand" : (sourceAccount?.trim() || null),
        destinationAccount: paymentMode === "CASH" ? "Cash In Hand" : (destinationAccount?.trim() || null),
        referenceNo: paymentMode === "CASH" ? null : (referenceNo?.trim() || null)
      };

      if (isAdmin && isAmountChanged) {
        payload.amount = newAmountNum;
        payload.reason = reason.trim();
      }

      const res = await fetch(`${API_URL}/api/v1/customers/payments/${payment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update payment record");
      }

      setSuccessMsg(data.message || "Payment record updated successfully!");
      setTimeout(() => {
        onPaymentUpdated?.(data.data);
        onClose();
      }, 750);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Edit Customer Payment Record</h3>
              <p className="text-[11px] text-slate-400">
                {isAdmin ? "Admin Correction & Financial Reconciliation" : "Correct payment date, bank details, or UTR number"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Readonly Overview Tag */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 font-medium">Customer: </span>
            <span className="font-bold text-slate-900">{customer?.customerName || "Customer"}</span>
            {customer?.plotNo && (
              <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                Plot {customer.plotNo}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium">Original Amount: </span>
            <span className="font-mono font-black text-orange-700 text-sm">
              ₹{oldAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-orange-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Amount Field Box with Admin Privilege & Lock */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                Payment Amount (₹) *
              </label>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  <ShieldCheck className="w-3 h-3 text-orange-700" />
                  Admin Authorized
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Locked (Admin Only)
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold">
                ₹
              </div>
              <input
                type="number"
                step="any"
                disabled={!isAdmin}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-lg border transition ${
                  !isAdmin
                    ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                    : isAmountChanged
                    ? "bg-orange-50/50 text-slate-900 border-orange-400 ring-2 ring-orange-300/40"
                    : "bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            {!isAdmin ? (
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                Accountants can only edit metadata. Payment amounts are locked to prevent financial divergence.
              </p>
            ) : isAmountChanged && (
              <div className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                delta > 0 
                  ? "bg-orange-50 border-orange-200 text-orange-900" 
                  : "bg-orange-50 border-orange-200 text-orange-900"
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>Adjustment Impact (Δ):</span>
                  <span className={`font-mono text-sm font-black ${delta > 0 ? "text-orange-700" : "text-orange-700"}`}>
                    {delta > 0 ? `+₹${delta.toLocaleString("en-IN")}` : `-₹${Math.abs(delta).toLocaleString("en-IN")}`}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {delta > 0 
                    ? "Customer balance due will decrease and treasury liquidity will be incremented." 
                    : "Customer balance due will increase and excess funds will be deducted from corporate treasury."}
                </p>
              </div>
            )}

            {isAdmin && isAmountChanged && (
              <div className="pt-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Amount Correction * <span className="text-[10px] text-slate-400 font-normal">(Min 10 characters)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Typo error by accountant: entered 500000 instead of 50000 per bank slip..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-0.5">
                  <span>Required for audit log & General Ledger journal</span>
                  <span className={reason.trim().length >= 10 ? "text-orange-600 font-bold" : "text-orange-600"}>
                    {reason.trim().length}/10 chars
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date of Payment *
              </label>
              <input
                type="date"
                required
                value={dateOfPayment}
                onChange={(e) => setDateOfPayment(e.target.value)}
                className="w-full text-xs font-mono font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Will display as: <strong className="text-orange-700">{formatDate(dateOfPayment)}</strong>
              </span>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium"
              >
                <option value="NEFT">NEFT Transfer</option>
                <option value="RTGS">RTGS Transfer</option>
                <option value="UPI">UPI / Instant</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Cash In Hand</option>
                <option value="DD">Demand Draft</option>
              </select>
            </div>
          </div>

          {paymentMode !== "CASH" && (
            <>
              {/* Reference / UTR Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. 618253429249 or RTGS-12345"
                  className="w-full font-mono text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Source Bank / Account */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source Bank / Client A/C Description
                </label>
                <input
                  type="text"
                  value={sourceAccount}
                  onChange={(e) => setSourceAccount(e.target.value)}
                  placeholder="e.g. INDIAN BANK or HDFC A/C"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Destination Account */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Treasury Bank A/C
                </label>
                <input
                  type="text"
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                  placeholder="e.g. BOI AG HOMES or Corporate Bank (1010)"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs disabled:opacity-50 ${
                isAdmin && isAmountChanged
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {loading 
                ? "Saving Changes..." 
                : (isAdmin && isAmountChanged ? "Apply Amount Adjustment" : "Save Payment Details")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
