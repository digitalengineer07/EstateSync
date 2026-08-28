"use client";

import { useState } from "react";
import DashboardStats from "@/components/DashboardStats";
import UserWalletLedger from "@/components/UserWalletLedger";
import ExpenseList from "@/components/ExpenseList";
import TransactionLedger from "@/components/TransactionLedger";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import AuditLogViewer from "@/components/AuditLogViewer";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState("collections");

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">Accounting & Financial Hub</h2>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                Write & Audit Mode
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              Corporate treasury inflows, customer collections, double-entry general ledger, audit trails, and expense governance.
            </p>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab("collections")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "collections" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              💵 Customer Collections (PRD §19)
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "ledger" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              ⚖️ General Ledger (Dr = Cr)
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`px-3.5 py-2 rounded-lg transition ${activeTab === "wallets" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
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

      {activeTab === "ledger" && (
        <GeneralLedgerView />
      )}

      {activeTab === "wallets" && (
        <div className="space-y-6">
          <UserWalletLedger />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ExpenseList type="all" />
            <TransactionLedger />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <TransactionLedger />
        <AuditLogViewer />
      </div>
    </div>
  );
}
