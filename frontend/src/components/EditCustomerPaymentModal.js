"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { X, Calendar, Landmark, CreditCard, Hash, CheckCircle2, AlertCircle } from "lucide-react";
import { toISTDateInputString, createSafePaymentDateISO, formatDate } from "@/utils/formatters";

export default function EditCustomerPaymentModal({
  isOpen,
  onClose,
  payment,
  customer,
  onPaymentUpdated
}) {
  const [dateOfPayment, setDateOfPayment] = useState("");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (payment) {
      // Extract YYYY-MM-DD cleanly without timezone offset
      const rawDate = payment.dateOfPayment ? toISTDateInputString(payment.dateOfPayment) : toISTDateInputString();
      setDateOfPayment(rawDate);
      setPaymentMode(payment.paymentMode || "NEFT");
      setSourceAccount(payment.sourceAccount || "");
      setDestinationAccount(payment.destinationAccount || "");
      setReferenceNo(payment.referenceNo || "");
      setError(null);
      setSuccessMsg(null);
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

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

    try {
      const token = localStorage.getItem("accessToken");
      const safeDateISO = createSafePaymentDateISO(dateOfPayment);

      const res = await fetch(`${API_URL}/api/v1/customers/payments/${payment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          dateOfPayment: safeDateISO,
          paymentMode: paymentMode.toUpperCase(),
          sourceAccount: paymentMode === "CASH" ? "Cash In Hand" : (sourceAccount?.trim() || null),
          destinationAccount: paymentMode === "CASH" ? "Cash In Hand" : (destinationAccount?.trim() || null),
          referenceNo: paymentMode === "CASH" ? null : (referenceNo?.trim() || null)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update payment record");
      }

      setSuccessMsg("Payment record updated successfully!");
      setTimeout(() => {
        onPaymentUpdated?.(data.data);
        onClose();
      }, 700);
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
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Edit Customer Payment Record</h3>
              <p className="text-[11px] text-slate-400">
                Correct payment date, bank details, or UTR number
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
            <span className="text-slate-500 font-medium">Amount: </span>
            <span className="font-mono font-black text-emerald-700 text-sm">
              ₹{parseFloat(payment.amount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

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
                className="w-full text-xs font-mono font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Will display as: <strong className="text-indigo-700">{formatDate(dateOfPayment)}</strong>
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
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
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
                  className="w-full font-mono text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              {loading ? "Saving Changes..." : "Save Payment Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
