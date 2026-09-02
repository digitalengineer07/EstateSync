"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { createPaymentBatch, approvePaymentBatch } from "@/services/salaryPaymentService";
import {
  Landmark,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Send,
  Check
} from "lucide-react";

export default function CreatePaymentBatchModal({
  isOpen,
  onClose,
  runId,
  items = [],
  onSuccess
}) {
  const { user } = useAuth();

  const eligibleItems = items.filter((i) => Number(i.availablePayable || 0) > 0);

  const [selectedItemIds, setSelectedItemIds] = useState(
    eligibleItems.map((i) => i.payrollItemId || i.id)
  );
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [sourceAccountCode, setSourceAccountCode] = useState("1010");
  const [notes, setNotes] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const canApprove = hasPermission(user, "payroll.approve");

  const toggleSelectAll = () => {
    if (selectedItemIds.length === eligibleItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(eligibleItems.map((i) => i.payrollItemId || i.id));
    }
  };

  const toggleItem = (itemId) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const totalBatchAmount = eligibleItems
    .filter((i) => selectedItemIds.includes(i.payrollItemId || i.id))
    .reduce((sum, i) => sum + Number(i.availablePayable || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (selectedItemIds.length === 0) {
      setError("Please select at least one employee for the disbursement batch.");
      return;
    }

    setLoading(true);

    try {
      const payments = eligibleItems
        .filter((i) => selectedItemIds.includes(i.payrollItemId || i.id))
        .map((i) => ({
          payrollItemId: i.payrollItemId || i.id,
          amount: Number(i.availablePayable || 0)
        }));

      const batchPayload = {
        payrollRunId: runId,
        paymentMode,
        sourceAccountCode,
        notes: notes.trim() || undefined,
        payments
      };

      const res = await createPaymentBatch(batchPayload);
      const createdBatch = res.batch;

      // Auto-approve if selected and user has permission
      if (autoApprove && canApprove && createdBatch?.id) {
        await approvePaymentBatch(createdBatch.id);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create payment batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Salary Payment Batch</h3>
              <p className="text-xs text-slate-500">Multi-Employee Disbursement Tranche</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Mode & Treasury Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value);
                  setSourceAccountCode(e.target.value === "CASH" ? "1020" : "1010");
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="BANK">Bank Transfer (NEFT/RTGS/Bulk)</option>
                <option value="CASH">Cash in Hand</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Treasury</label>
              <select
                value={sourceAccountCode}
                onChange={(e) => setSourceAccountCode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="1010">1010 - Corporate Bank Account</option>
                <option value="1020">1020 - Cash in Hand</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Narration / Memo</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly salary batch release tranche #1"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Auto-Approve Checkbox */}
          {canApprove && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoApprove" className="text-xs text-indigo-950 font-medium cursor-pointer">
                Approve & reserve funds immediately upon creation
                <span className="text-[10px] text-indigo-800 block mt-0.5 font-normal">
                  Transitions batch from DRAFT to APPROVED and reserves payable obligations in PostgreSQL.
                </span>
              </label>
            </div>
          )}

          {/* Employee Selection Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Select Employees ({selectedItemIds.length}/{eligibleItems.length})
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                {selectedItemIds.length === eligibleItems.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
              {eligibleItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No employees with positive available payable found in this run.
                </div>
              ) : (
                eligibleItems.map((item) => {
                  const itemId = item.payrollItemId || item.id;
                  const isSelected = selectedItemIds.includes(itemId);
                  const avail = Number(item.availablePayable || 0);

                  return (
                    <div
                      key={itemId}
                      onClick={() => toggleItem(itemId)}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{item.employeeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.employeeCode}</span>
                        </div>
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        ₹{avail.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Total Batch Summary */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
            <span className="text-slate-300">Total Batch Payable:</span>
            <span className="text-base font-bold font-mono">
              ₹{totalBatchAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedItemIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Batch...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Create Batch Voucher</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
