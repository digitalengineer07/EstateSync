"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";

export default function RecordPropertyPaymentModal({ isOpen, onClose, property, onPaymentRecorded }) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("RTGS");
  const [paidFromAccount, setPaidFromAccount] = useState("Corporate Bank (1010)");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [dateOfPayment, setDateOfPayment] = useState(new Date().toISOString().split("T")[0]);
  
  const [treasuryLiquid, setTreasuryLiquid] = useState(null);
  const [treasuryCash, setTreasuryCash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch current Treasury Liquidity
      const fetchTreasury = async () => {
        try {
          const token = localStorage.getItem("accessToken");
          const res = await fetch(`${API_URL}/api/v1/dashboard/accounting`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setTreasuryLiquid(parseFloat(data.stats.totalOrganizationalFundsLiquid || 0));
            setTreasuryCash(parseFloat(data.stats.totalOrganizationalFundsCash || 0));
          }
        } catch (err) {
          console.error("Failed to fetch treasury liquidity:", err);
        }
      };
      fetchTreasury();
    }
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const totalValue = parseFloat(property.totalLandValue || 0);
  const totalPaid = parseFloat(property.totalPaidToOwner || 0);
  const balanceRemaining = parseFloat(property.balanceRemaining || 0);

  const numAmount = parseFloat(amount) || 0;
  const availableFunds = paymentMode === 'CASH' ? treasuryCash : treasuryLiquid;
  const maxPayable = availableFunds !== null ? Math.min(balanceRemaining, availableFunds) : balanceRemaining;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (numAmount <= 0) {
      setError("Please enter a valid payout amount greater than zero");
      setLoading(false);
      return;
    }

    if (numAmount > balanceRemaining) {
      setError(`Payout amount (₹${numAmount.toLocaleString('en-IN')}) cannot exceed property remaining liability (₹${balanceRemaining.toLocaleString('en-IN')})`);
      setLoading(false);
      return;
    }

    if (availableFunds !== null && numAmount > availableFunds) {
      setError(`Insufficient Treasury liquidity: Available ${paymentMode === 'CASH' ? 'cash' : 'liquid funds'} is ₹${availableFunds.toLocaleString('en-IN')}, but trying to disburse ₹${numAmount.toLocaleString('en-IN')}`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `prop-pay-${Date.now()}`;

      const res = await fetch(`${API_URL}/api/v1/properties/${property.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          amount: numAmount,
          paymentMode,
          paidFromAccount: paymentMode === 'CASH' ? 'Cash In Hand' : (paidFromAccount?.trim() || null),
          referenceNo: paymentMode === 'CASH' ? null : (referenceNo?.trim() || null),
          notes: notes?.trim() || null,
          dateOfPayment: new Date(dateOfPayment).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record land owner payout");
      }

      setSuccessMsg(`Disbursement of ₹${numAmount.toLocaleString('en-IN')} to ${property.landOwnerName} recorded successfully!`);
      setTimeout(() => {
        onPaymentRecorded?.(data.data);
        onClose();
      }, 1200);
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
        <div className="px-6 py-4 bg-gradient-to-r from-amber-800 to-orange-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Record Land Owner Payout</h3>
            <p className="text-xs text-amber-200">Fixed Asset Capital Outflow & Journal Posting (PRD §20.3)</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Land Parcel Snapshot Banner */}
        <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-3.5">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-gray-900 text-sm">{property.landOwnerName}</div>
              <div className="text-xs text-gray-600">Khata <span className="font-semibold">{property.khataNo}</span> • Plot <span className="font-semibold text-amber-900">{property.plotNo}</span></div>
              <div className="text-[11px] text-gray-500">{property.projectLocation}</div>
            </div>
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${property.status === 'FULLY_PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {property.status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center pt-2 border-t border-amber-200/60">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Land Value</span>
              <p className="text-xs font-bold text-gray-800">₹{totalValue.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Paid To Date</span>
              <p className="text-xs font-bold text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Remaining Liability</span>
              <p className="text-xs font-bold text-amber-900">₹{balanceRemaining.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Payout Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
              <span className="font-bold">Success:</span> {successMsg}
            </div>
          )}

          {/* Treasury Liquidity Alert */}
          {availableFunds !== null && (
            <div className="flex justify-between items-center px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs">
              <span className="text-indigo-800 font-medium">Available Treasury {paymentMode === 'CASH' ? 'Cash' : 'Liquid Funds'}:</span>
              <span className="font-bold text-indigo-900">₹{availableFunds.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700">Disbursement Amount (₹) *</label>
              <button
                type="button"
                onClick={() => setAmount(maxPayable.toString())}
                className="text-[11px] font-semibold text-amber-800 hover:underline"
              >
                Max Payable (₹{maxPayable.toLocaleString('en-IN')})
              </button>
            </div>
            <input
              type="number"
              required
              min="1"
              max={maxPayable}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full text-base font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              >
                <option value="RTGS">RTGS Transfer</option>
                <option value="NEFT">NEFT Transfer</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="DD">Demand Draft</option>
                <option value="CASH">Cash Voucher</option>
                <option value="UPI">UPI Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Payment *</label>
              <input
                type="date"
                required
                value={dateOfPayment}
                onChange={(e) => setDateOfPayment(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {paymentMode !== 'CASH' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">UTR / Cheque / Transaction Ref No</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. RTGS-HDFC-88990011"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Paid From Account</label>
                <input
                  type="text"
                  value={paidFromAccount}
                  onChange={(e) => setPaidFromAccount(e.target.value)}
                  className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-600 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Disbursement Tranche Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. First tranche on registration deed signing"
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              disabled={loading || numAmount <= 0 || numAmount > balanceRemaining || (availableFunds !== null && numAmount > availableFunds)}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 active:scale-95 rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? "Posting Disbursement..." : `Disburse ₹${numAmount ? numAmount.toLocaleString('en-IN') : "0"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
