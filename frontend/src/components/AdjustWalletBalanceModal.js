"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import {
  X,
  SlidersHorizontal,
  Wallet,
  Coins,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export default function AdjustWalletBalanceModal({ isOpen, onClose, user, onSuccess }) {
  const [fundMode, setFundMode] = useState("LIQUID"); // "LIQUID" or "CASH"
  const [adjustmentType, setAdjustmentType] = useState("SET_BALANCE"); // "SET_BALANCE", "INCREASE", "DECREASE"
  const [targetBalance, setTargetBalance] = useState("");
  const [deltaAmount, setDeltaAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Available balances
  const liquidBal = parseFloat(user?.wallet?.availableBalanceLiquid || 0);
  const cashBal = parseFloat(user?.wallet?.availableBalanceCash || 0);
  const currentBal = fundMode === "CASH" ? cashBal : liquidBal;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setReason("");
      setTargetBalance(currentBal.toString());
      setDeltaAmount("");
      setAdjustmentType("SET_BALANCE");
    }
  }, [isOpen, user, fundMode]);

  if (!isOpen || !user) return null;

  // Compute live preview values
  let calculatedDelta = 0;
  let resultingBalance = currentBal;
  let isValid = true;
  let validationMessage = "";

  if (adjustmentType === "SET_BALANCE") {
    const parsedTarget = parseFloat(targetBalance);
    if (isNaN(parsedTarget) || parsedTarget < 0) {
      isValid = false;
      validationMessage = "Target balance must be a non-negative number.";
    } else {
      calculatedDelta = parsedTarget - currentBal;
      resultingBalance = parsedTarget;
      if (Math.abs(calculatedDelta) < 0.009) {
        isValid = false;
        validationMessage = "New balance is identical to the current balance.";
      }
    }
  } else if (adjustmentType === "INCREASE") {
    const parsedAmount = parseFloat(deltaAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      isValid = false;
      validationMessage = "Please enter a valid positive top-up amount.";
    } else {
      calculatedDelta = parsedAmount;
      resultingBalance = currentBal + parsedAmount;
    }
  } else if (adjustmentType === "DECREASE") {
    const parsedAmount = parseFloat(deltaAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      isValid = false;
      validationMessage = "Please enter a valid positive deduction amount.";
    } else {
      calculatedDelta = -parsedAmount;
      resultingBalance = currentBal - parsedAmount;
      if (resultingBalance < -0.009) {
        isValid = false;
        validationMessage = `Deduction exceeds available balance (₹${currentBal.toLocaleString('en-IN')}). Overdraft is prohibited.`;
      }
    }
  }

  const isReasonValid = reason.trim().length >= 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    if (!isReasonValid) {
      setError("Please provide a valid justification reason (min 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        targetUserId: user.id,
        fundMode,
        adjustmentType,
        targetBalance: adjustmentType === "SET_BALANCE" ? parseFloat(targetBalance) : undefined,
        amount: adjustmentType !== "SET_BALANCE" ? parseFloat(deltaAmount) : undefined,
        reason: reason.trim()
      };

      const res = await fetch(`${API_URL}/api/v1/wallets/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to adjust wallet balance.");
      }

      setSuccessMsg(data.message || "Wallet balance successfully updated!");
      setTimeout(() => {
        if (onSuccess) onSuccess(data.data);
        onClose();
      }, 1200);

    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Adjust Wallet Balance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin manual correction & corporate float adjustment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Target User Info Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                  {user.role?.name || user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Current {fundMode === "CASH" ? "Cash" : "Liquid"} Balance
              </span>
              <span className="text-base font-extrabold text-slate-900">
                ₹{currentBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Fund Mode Selector (Liquid Bank vs Cash) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Fund Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setFundMode("LIQUID")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  fundMode === "LIQUID"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coins className="w-4 h-4 text-orange-600" />
                <span>Liquid / Bank (₹{liquidBal.toLocaleString("en-IN")})</span>
              </button>
              <button
                type="button"
                onClick={() => setFundMode("CASH")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  fundMode === "CASH"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Banknote className="w-4 h-4 text-orange-600" />
                <span>Physical Cash (₹{cashBal.toLocaleString("en-IN")})</span>
              </button>
            </div>
          </div>

          {/* Adjustment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Adjustment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("SET_BALANCE");
                  setTargetBalance(currentBal.toString());
                  setDeltaAmount("");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                  adjustmentType === "SET_BALANCE"
                    ? "bg-orange-50 border-orange-400 text-orange-900 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                Set Direct Balance
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("INCREASE");
                  setDeltaAmount("");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center flex items-center justify-center gap-1 ${
                  adjustmentType === "INCREASE"
                    ? "bg-orange-50 border-orange-400 text-orange-900 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-orange-600" />
                <span>Top-up (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType("DECREASE");
                  setDeltaAmount("");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center flex items-center justify-center gap-1 ${
                  adjustmentType === "DECREASE"
                    ? "bg-orange-50 border-orange-400 text-orange-900 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-orange-600" />
                <span>Clawback (-)</span>
              </button>
            </div>
          </div>

          {/* Input Field Based on Adjustment Type */}
          {adjustmentType === "SET_BALANCE" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Target Balance (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetBalance}
                  onChange={(e) => setTargetBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the exact amount you want the user&apos;s available balance to become.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {adjustmentType === "INCREASE" ? "Top-Up Amount (₹)" : "Deduction / Clawback Amount (₹)"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deltaAmount}
                  onChange={(e) => setDeltaAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Live Financial Impact Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Net Delta Adjustment:</span>
              <span className={`font-black ${
                calculatedDelta > 0 ? "text-orange-700" : calculatedDelta < 0 ? "text-orange-700" : "text-slate-400"
              }`}>
                {calculatedDelta > 0 ? `+₹${calculatedDelta.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Top-up)` :
                 calculatedDelta < 0 ? `-₹${Math.abs(calculatedDelta).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Clawback)` :
                 "₹0.00"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-200/80 pt-2">
              <span className="text-slate-700 font-bold">Resulting Balance:</span>
              <span className="text-sm font-extrabold text-slate-900">
                ₹{resultingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                {calculatedDelta > 0
                  ? `₹${calculatedDelta.toLocaleString("en-IN")} will be drawn from Corporate Treasury Reserve.`
                  : calculatedDelta < 0
                  ? `₹${Math.abs(calculatedDelta).toLocaleString("en-IN")} will be returned into Corporate Treasury Reserve.`
                  : "No funds will move."}
              </span>
            </div>
          </div>

          {/* Reason / Justification Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Audit Justification <span className="text-orange-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unused advance clawback, monthly float reconciliation, audit adjustment"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-[11px] text-slate-400">Minimum 5 characters required for audit trail.</span>
              <span className={`text-[11px] font-semibold ${reason.trim().length >= 5 ? "text-orange-600" : "text-slate-400"}`}>
                {reason.trim().length}/5
              </span>
            </div>
          </div>

          {/* Validation or Error Message */}
          {(!isValid || error) && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-orange-600" />
              <span>{error || validationMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid || !isReasonValid}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating Balance...</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                  <span>Confirm & Adjust Balance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
