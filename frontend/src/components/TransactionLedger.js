"use client";

import { useState, useEffect } from "react";

export default function TransactionLedger() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/transactions/all", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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
          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
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

  if (loading) return <div className="p-4 text-gray-500">Loading ledger...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Global Transaction Ledger</h3>
          <p className="text-xs text-gray-500 mt-0.5">Immutable audit record with Credit/Debit classification (PRD §4.4)</p>
        </div>
        <button onClick={fetchTransactions} className="text-sm text-blue-600 hover:underline">
          Refresh Ledger
        </button>
      </div>

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
                <th scope="col" className="px-6 py-3">Source Wallet</th>
                <th scope="col" className="px-6 py-3">Dest Wallet</th>
                <th scope="col" className="px-6 py-3 text-right">Amount</th>
                <th scope="col" className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900 text-xs">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{new Date(txn.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {getEntryBadge(txn.type)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-800">
                      {txn.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {txn.sourceWallet?.user?.name || (txn.type === 'FUND_ALLOCATION' ? 'SYSTEM (Treasury)' : txn.type === 'CUSTOMER_PAYMENT_RECEIVED' ? 'EXTERNAL (Client Inflow)' : 'N/A')}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {txn.destWallet?.user?.name || (txn.type === 'CUSTOMER_PAYMENT_RECEIVED' ? 'Corporate Treasury' : txn.type === 'LAND_ACQUISITION_PAYMENT' ? 'EXTERNAL (Land Owner)' : txn.type === 'EXPENSE' ? 'EXTERNAL (Vendor/Spend)' : 'N/A')}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 text-right">
                    ₹{parseFloat(txn.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={txn.description}>{txn.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
