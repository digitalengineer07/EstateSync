"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { RefreshCw } from "lucide-react";
import { formatDateTime } from "@/utils/formatters";

export default function TransactionLedger({ embedded = false, showHeader = true }) {
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    const checkHighlight = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const hId = params.get("highlight");
      if (hId) setHighlightedId(hId);
    };

    checkHighlight();

    const onHighlightEvent = (e) => {
      if (e.detail?.id) setHighlightedId(e.detail.id);
    };

    window.addEventListener("estatesync:highlight-record", onHighlightEvent);
    return () => window.removeEventListener("estatesync:highlight-record", onHighlightEvent);
  }, []);

  const { data, error, isLoading, mutate } = useSWR(`/api/v1/transactions/all`, fetcher, {
    refreshInterval: 180000,
    revalidateOnFocus: false
  });

  const transactions = data?.transactions || [];

  // Fast auto-scroll and auto-fade
  useEffect(() => {
    if (!highlightedId || isLoading || transactions.length === 0) return;

    const scrollTimer = setTimeout(() => {
      const el =
        document.getElementById(`txn-${highlightedId}`) ||
        document.getElementById(`pay-${highlightedId}`) ||
        document.getElementById(`exp-${highlightedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);

    const fadeTimer = setTimeout(() => {
      setHighlightedId(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("highlight")) {
          url.searchParams.delete("highlight");
          window.history.replaceState({}, "", url.toString());
        }
      }
    }, 3500);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(fadeTimer);
    };
  }, [highlightedId, isLoading, transactions]);

  const getEntryBadge = (type) => {
    switch (type) {
      case "CUSTOMER_PAYMENT_RECEIVED":
      case "EXPENSE_REVERSAL":
        return (
          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            + CREDIT
          </span>
        );
      case "EXPENSE":
      case "LAND_ACQUISITION_PAYMENT":
        return (
          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            − DEBIT
          </span>
        );
      case "FUND_ALLOCATION":
        return (
          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            TRANSFER
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };

  if (isLoading && !data) return <div className="p-4 text-gray-500 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading ledger...</div>;

  return (
    <div className={embedded ? "" : "bg-white shadow rounded-lg p-6 mt-8"}>
      {showHeader && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Global Transaction Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">Immutable audit record with Credit/Debit classification (PRD §4.4)</p>
          </div>
          <button onClick={() => mutate()} className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:underline">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Ledger
          </button>
        </div>
      )}

      {error && data && (
        <div className="p-2 mb-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-md text-xs flex items-center justify-between">
          <span>⚠️ Disconnected - Retrying...</span>
        </div>
      )}

      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-white uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 text-xs">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Entry Tag</th>
                <th scope="col" className="px-6 py-3">Type</th>
                <th scope="col" className="px-6 py-3">Mode</th>
                <th scope="col" className="px-6 py-3">Source Wallet</th>
                <th scope="col" className="px-6 py-3">Dest Wallet</th>
                <th scope="col" className="px-6 py-3 text-right">Amount</th>
                <th scope="col" className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900 text-xs">
              {transactions.map((txn) => {
                const isMatch =
                  highlightedId &&
                  (highlightedId === txn.id ||
                    highlightedId === `pay-${txn.id}` ||
                    highlightedId === `exp-${txn.id}` ||
                    txn.reference?.toLowerCase().includes(highlightedId.toLowerCase()) ||
                    txn.description?.toLowerCase().includes(highlightedId.toLowerCase()));

                return (
                  <tr
                    key={txn.id}
                    id={`txn-${txn.id}`}
                    className={`transition-all duration-700 ${
                      isMatch
                        ? "bg-amber-100/90 ring-2 ring-orange-500 shadow-md border-l-4 border-l-[#ff6b12]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-slate-700 font-mono text-xs">{formatDateTime(txn.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getEntryBadge(txn.type)}
                        {isMatch && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ff6b12] text-white shadow-xs animate-pulse">
                            Matched Txn ✨
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">
                        {txn.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                        {txn.fundMode || 'LIQUID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {txn.sourceWallet?.user?.name || (txn.type === 'FUND_ALLOCATION' ? 'SYSTEM (Treasury)' : txn.type === 'CUSTOMER_PAYMENT_RECEIVED' ? 'EXTERNAL (Client Inflow)' : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {txn.destWallet?.user?.name || (txn.type === 'CUSTOMER_PAYMENT_RECEIVED' ? 'Corporate Treasury' : txn.type === 'LAND_ACQUISITION_PAYMENT' ? 'EXTERNAL (Land Owner)' : txn.type === 'EXPENSE' ? 'EXTERNAL (Vendor/Spend)' : 'N/A')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-right">
                      ₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={txn.description}>{txn.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
