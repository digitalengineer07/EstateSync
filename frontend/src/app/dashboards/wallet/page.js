"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";

export default function WalletDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("wallet");

  const isSalesOrAdmin = ["SALES", "ADMIN", "MARKETING"].includes(user?.role);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Personal Portal & Operational Hub
              </h2>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Wallet & Field Operations
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">
              Manage your personal wallet balance, request departmental funds, file expense receipts, and register customer contracts.
            </p>
          </div>

          {isSalesOrAdmin && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto text-xs font-semibold gap-1.5 shadow-inner">
              <button
                onClick={() => setActiveTab("wallet")}
                className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
                  activeTab === "wallet"
                    ? "bg-white text-indigo-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💼 Wallet & Expenses
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
                  activeTab === "customers"
                    ? "bg-white text-indigo-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👥 Customer Bookings (PRD §19)
              </button>
            </div>
          )}
        </div>

        <DashboardStats type="wallet" />
      </div>

      {activeTab === "wallet" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FundRequestForm />
            <FundRequestList type="outgoing" />
          </div>
          <div className="space-y-6">
            <ExpenseUploadForm />
            <ExpenseList type="my" />
          </div>
        </div>
      ) : (
        <CustomerPortfolioList mode="sales" userRole={user?.role || "SALES"} />
      )}
    </div>
  );
}
