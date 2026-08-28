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

  const tabs = [
    { id: "collections", label: "Customer Collections", badge: "PRD §19", icon: "💵", activeClass: "bg-emerald-600 text-white shadow-md shadow-emerald-700/30 font-bold" },
    { id: "properties", label: "Land Acquisitions", badge: "PRD §20", icon: "🏞️", activeClass: "bg-amber-600 text-white shadow-md shadow-amber-700/30 font-bold" },
    { id: "ledger", label: "General Ledger (Dr = Cr)", badge: "Bookkeeping", icon: "⚖️", activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-700/30 font-bold" },
    { id: "wallets", label: "Wallets & Expenses", badge: "Corporate", icon: "💼", activeClass: "bg-slate-800 text-white shadow-md shadow-slate-900/30 font-bold" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Hub Header Card */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Accounting & Financial Hub
              </h2>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Full Write & Audit Authority
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm max-w-3xl">
              Corporate treasury inflows, customer collections (PRD §19), land acquisitions (PRD §20), balanced double-entry general ledger, and expense governance.
            </p>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto text-xs font-semibold gap-1.5 shadow-inner">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-2 ${
                    isActive
                      ? tab.activeClass
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <DashboardStats type="accounting" />
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-200">
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
            
            <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {walletSubTab === "expenses" ? "All Corporate Expense Records" : "Global Transaction Ledger"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {walletSubTab === "expenses"
                      ? "Audit user receipts, line-item expenses, and execute administrative reversals."
                      : "Complete audit record of fund allocations, collections, debits, and credits (PRD §4.4)."}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-semibold">
                  <button
                    onClick={() => setWalletSubTab("expenses")}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                      walletSubTab === "expenses"
                        ? "bg-white text-indigo-700 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🧾 All Expenses
                  </button>
                  <button
                    onClick={() => setWalletSubTab("transactions")}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                      walletSubTab === "transactions"
                        ? "bg-white text-indigo-700 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
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
      </div>

      {/* Persistent Security & Audit Trail */}
      <AuditLogViewer />
    </div>
  );
}
