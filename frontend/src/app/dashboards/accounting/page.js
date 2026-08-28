"use client";

import { useState } from "react";
import DashboardStats from "@/components/DashboardStats";
import UserWalletLedger from "@/components/UserWalletLedger";
import ExpenseList from "@/components/ExpenseList";
import TransactionLedger from "@/components/TransactionLedger";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import AuditLogViewer from "@/components/AuditLogViewer";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import PropertyAcquisitionList from "@/components/PropertyAcquisitionList";

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState("collections");
  const [walletSubTab, setWalletSubTab] = useState("expenses");

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">Accounting & Financial Hub</h2>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                Full Write & Audit Authority
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              Corporate treasury inflows, customer collections (PRD §19), land acquisitions (PRD §20), double-entry general ledger, and expense governance.
            </p>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveTab("collections")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "collections" ? "bg-white text-emerald-800 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              💵 Collections (PRD §19)
            </button>
            <button
              onClick={() => setActiveTab("properties")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "properties" ? "bg-white text-amber-900 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              🏞️ Land Acquisitions (PRD §20)
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "ledger" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              ⚖️ General Ledger (Dr = Cr)
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "wallets" ? "bg-white text-indigo-700 shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"}`}
            >
              💼 Wallets & Expenses
            </button>
          </div>
        </div>

        <DashboardStats type="accounting" />
      </div>

      {activeTab === "collections" && (
        <CustomerPortfolioList mode="accounting" userRole="ACCOUNTING" />
      )}

      {activeTab === "properties" && (
        <PropertyAcquisitionList userRole="ACCOUNTING" />
      )}

      {activeTab === "ledger" && (
        <GeneralLedgerView />
      )}

      {activeTab === "wallets" && (
        <div className="space-y-6">
          <UserWalletLedger />
          
          <div className="bg-white shadow rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {walletSubTab === "expenses" ? "All Corporate Expense Records" : "Global Transaction Ledger"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {walletSubTab === "expenses"
                    ? "Audit user receipts, line-item expenses, and execute administrative reversals."
                    : "Complete audit record of fund allocations, collections, debits, and credits (PRD §4.4)."}
                </p>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto text-xs font-semibold">
                <button
                  onClick={() => setWalletSubTab("expenses")}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                    walletSubTab === "expenses"
                      ? "bg-white text-indigo-700 shadow-sm font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🧾 All Expenses
                </button>
                <button
                  onClick={() => setWalletSubTab("transactions")}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                    walletSubTab === "transactions"
                      ? "bg-white text-indigo-700 shadow-sm font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  💳 Transaction Ledger
                </button>
              </div>
            </div>

            <div className="mt-4">
              {walletSubTab === "expenses" ? (
                <ExpenseList type="all" />
              ) : (
                <TransactionLedger embedded={true} showHeader={false} />
              )}
            </div>
          </div>
        </div>
      )}

      <AuditLogViewer />
    </div>
  );
}
