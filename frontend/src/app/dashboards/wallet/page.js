"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import { Wallet, Users } from "lucide-react";

export default function WalletDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("wallet");

  const isSalesOrAdmin = ["SALES", "ADMIN", "MARKETING"].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Personal Portal & Operations
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Wallet className="w-3.5 h-3.5" />
              Wallet & Field
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage your personal wallet balance, request departmental funds, file expense receipts, and register customer contracts.
          </p>
        </div>

        {isSalesOrAdmin && (
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs">
            <button
              onClick={() => setActiveTab("wallet")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "wallet"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Wallet & Expenses
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "customers"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Customer Bookings (PRD §19)
            </button>
          </div>
        )}
      </div>

      {/* 3 Clean Stats */}
      <DashboardStats type="wallet" />

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
