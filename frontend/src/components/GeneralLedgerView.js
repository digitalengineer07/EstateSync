"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { API_URL } from "@/config/api";
import { formatINR } from "@/utils/formatters";
import { RefreshCw } from "lucide-react";

export default function GeneralLedgerView() {
  const [activeTab, setActiveTab] = useState("journals"); // "journals" or "accounts"

  const { data: jData, error: jError, isLoading: jLoading, mutate: jMutate } = useSWR(`/api/v1/journals`, fetcher, { refreshInterval: 30000, revalidateOnFocus: true });
  const { data: aData, error: aError, isLoading: aLoading, mutate: aMutate } = useSWR(`/api/v1/accounts`, fetcher, { refreshInterval: 30000, revalidateOnFocus: true });

  const loading = jLoading || aLoading;
  const error = jError || aError;
  const journals = jData?.journals || [];
  const meta = jData?.meta || null;
  const accounts = aData?.accounts || [];
  
  const refreshAll = () => {
    jMutate();
    aMutate();
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8 border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">Double-Entry General Ledger & Accounts</h3>
            {meta && (
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                meta.ledgerBalanced
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              }`}>
                {meta.ledgerBalanced ? "✓ Balanced (Debit = Credit)" : "⚠️ Ledger Imbalance"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Formal double-entry accounting records. Every fund movement, allocation, and expense maintains an exact Debit = Credit proof.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("journals")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "journals"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Journal Entries ({journals.length})
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "accounts"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Chart of Accounts ({accounts.length})
            </button>
          </div>

          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && jData && aData && (
        <div className="p-2 mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs flex items-center justify-between">
          <span>⚠️ Disconnected - Retrying...</span>
        </div>
      )}

      {error && (!jData || !aData) && (
        <div className="p-4 mb-4 bg-red-50 text-red-900 border border-red-200 rounded-md text-sm">
          Network error loading double-entry ledger.
        </div>
      )}

      {loading && !jData && !aData ? (
        <div className="animate-pulse py-8 text-center text-gray-400 text-sm">
          Loading general ledger entries...
        </div>
      ) : activeTab === "journals" ? (
        journals.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">No double-entry journal entries posted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {journals.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-indigo-900">{entry.entryNumber}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {entry.referenceType || "MANUAL"}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {entry.description}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2">Account Code & Name</th>
                        <th className="px-4 py-2">Line Description</th>
                        <th className="px-4 py-2 text-right">Debit (Dr)</th>
                        <th className="px-4 py-2 text-right">Credit (Cr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-normal">
                      {entry.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">
                            <span className="font-mono text-indigo-600 font-bold mr-2">[{line.account?.code}]</span>
                            {line.account?.name}
                            <span className="ml-2 text-gray-400 text-[10px]">({line.account?.type})</span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{line.description}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">
                            {parseFloat(line.debit) > 0 ? formatINR(line.debit, { showDecimals: true }) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">
                            {parseFloat(line.credit) > 0 ? formatINR(line.credit, { showDecimals: true }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                      <tr>
                        <td colSpan="2" className="px-4 py-2 text-right text-gray-700">Entry Total:</td>
                        <td className="px-4 py-2 text-right text-indigo-900 font-mono">
                          {formatINR(entry.totalDebit, { showDecimals: true })}
                        </td>
                        <td className="px-4 py-2 text-right text-indigo-900 font-mono">
                          {formatINR(entry.totalCredit, { showDecimals: true })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 text-xs font-semibold">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Account Name</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3 text-right">Debit</th>
                <th className="px-5 py-3 text-right">Credit</th>
                <th className="px-5 py-3 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-bold text-indigo-700">{acc.code}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{acc.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-xs truncate">{acc.description}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">
                    {formatINR(acc.totalDebit, { showDecimals: true })}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">
                    {formatINR(acc.totalCredit, { showDecimals: true })}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-gray-900">
                    {formatINR(acc.balance, { showDecimals: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
