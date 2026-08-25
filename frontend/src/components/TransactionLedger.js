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

  if (loading) return <div className="p-4 text-gray-500">Loading ledger...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Global Transaction Ledger</h3>
        <button onClick={fetchTransactions} className="text-sm text-blue-600 hover:underline">Refresh Ledger</button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-white uppercase tracking-wider border-b-2 border-gray-200 text-gray-600">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Type</th>
                <th scope="col" className="px-6 py-3">Source Wallet</th>
                <th scope="col" className="px-6 py-3">Dest Wallet</th>
                <th scope="col" className="px-6 py-3">Amount</th>
                <th scope="col" className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">{new Date(txn.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {txn.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {txn.sourceWallet?.user?.name || (txn.type === 'FUND_ALLOCATION' ? 'SYSTEM (Admin)' : 'N/A')}
                  </td>
                  <td className="px-6 py-4">{txn.destWallet?.user?.name || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(txn.amount).toLocaleString()}</td>
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
