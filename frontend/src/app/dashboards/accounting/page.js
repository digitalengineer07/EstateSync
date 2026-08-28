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
import { Users, MapPin, Scale, Wallet, Receipt, ArrowLeftRight } from "lucide-react";

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState("collections");
  const [walletSubTab, setWalletSubTab] = useState("expenses");

  const tabs = [
    { id: "collections", label: "Customer Collections", icon: Users, badge: "PRD §19" },
    { id: "properties", label: "Land Acquisitions", icon: MapPin, badge: "PRD §20" },
    { id: "ledger", label: "General Ledger", icon: Scale, badge: "Dr = Cr" },
    { id: "wallets", label: "Wallets & Expenses", icon: Wallet, badge: "Corporate" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header & Global Stats Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Accounting & Financial Hub
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Full Write & Audit Authority
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Corporate treasury inflows, customer collections (PRD §19), land acquisitions (PRD §20), balanced double-entry ledger, and expense governance.
            </p>
          </div>
        </div>

        {/* Global Financial Stats */}
        <DashboardStats type="accounting" />

        {/* Horizontal Navigation Sub-Tab Bar (Linear/Stripe Style) */}
        <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-slate-100 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div>
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
            
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {walletSubTab === "expenses" ? "All Corporate Expense Records" : "Global Transaction Ledger"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {walletSubTab === "expenses"
                      ? "Audit user receipts, line-item expenses, and execute administrative reversals."
                      : "Complete audit record of fund allocations, collections, debits, and credits (PRD §4.4)."}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setWalletSubTab("expenses")}
                    className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      walletSubTab === "expenses"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    All Expenses
                  </button>
                  <button
                    onClick={() => setWalletSubTab("transactions")}
                    className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      walletSubTab === "transactions"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Transaction Ledger
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

      {/* Security & Audit Trail */}
      <AuditLogViewer />
    </div>
  );
}
