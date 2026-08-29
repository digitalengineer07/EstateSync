"use client";

import { useState } from "react";

export default function RecordCustomerPaymentModal({ isOpen, onClose, customer, onPaymentRecorded }) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [sourceAccount, setSourceAccount] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("Corporate Treasury HDFC A/C (1010)");
  const [referenceNo, setReferenceNo] = useState("");
  const [dateOfPayment, setDateOfPayment] = useState(new Date().toISOString().split("T")[0]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen || !customer) return null;

  const totalContract = parseFloat(customer.totalContractValue || 0);
  const totalPaid = parseFloat(customer.totalPaid || 0);
  const balanceDue = parseFloat(customer.balanceDue || 0);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (numAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero");
      setLoading(false);
      return;
    }

    if (numAmount > balanceDue) {
      setError(`Payment amount (₹${numAmount.toLocaleString()}) cannot exceed remaining balance due (₹${balanceDue.toLocaleString()})`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `cust-pay-${Date.now()}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/${customer.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          amount: numAmount,
          paymentMode,
          sourceAccount,
          destinationAccount,
          referenceNo,
          dateOfPayment: new Date(dateOfPayment).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record customer payment");
      }

      setSuccessMsg(`Payment of ₹${numAmount.toLocaleString()} recorded successfully! Organization Wallet credited.`);
      setTimeout(() => {
        onPaymentRecorded?.(data.data);
        onClose();
        setAmount("");
        setReferenceNo("");
        setSourceAccount("");
        setError(null);
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Record Customer Payment</h3>
            <p className="text-xs text-emerald-200">Accounting Collection & Inflow Journal (PRD §19.4)</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Customer Snapshot Banner */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3.5">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-gray-900 text-sm">{customer.customerName}</div>
              <div className="text-xs text-gray-500">Plot <span className="font-semibold text-emerald-800">{customer.plotNo}</span> • {customer.projectLocation}</div>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
              {customer.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center pt-2 border-t border-emerald-200/60">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Contract</span>
              <p className="text-xs font-bold text-gray-800">₹{totalContract.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Paid</span>
              <p className="text-xs font-bold text-emerald-700">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Balance Due</span>
              <p className="text-xs font-bold text-rose-700">₹{balanceDue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              <span className="font-bold">Success:</span> {successMsg}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700">Payment Amount (₹) *</label>
              <button
                type="button"
                onClick={() => setAmount(balanceDue.toString())}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Pay Full Due (₹{balanceDue.toLocaleString()})
              </button>
            </div>
            <input
              type="number"
              required
              min="1"
              max={balanceDue}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full text-base font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="NEFT">NEFT Transfer</option>
                <option value="RTGS">RTGS Transfer</option>
                <option value="UPI">UPI / Instant</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="CASH">Cash Deposit</option>
                <option value="DD">Demand Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Payment *</label>
              <input
                type="date"
                required
                value={dateOfPayment}
                onChange={(e) => setDateOfPayment(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">UTR / Cheque / Ref Number</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. UTR-HDFC-99881102"
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Source Account (Client Bank / Branch)</label>
            <input
              type="text"
              value={sourceAccount}
              onChange={(e) => setSourceAccount(e.target.value)}
              placeholder="e.g. HDFC Bank Client A/C ...9081"
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Treasury Account</label>
            <input
              type="text"
              value={destinationAccount}
              onChange={(e) => setDestinationAccount(e.target.value)}
              className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-600 rounded-lg px-3 py-2 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || numAmount <= 0 || numAmount > balanceDue}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? "Posting Payment..." : `Post Credit of ₹${numAmount ? numAmount.toLocaleString() : "0"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
