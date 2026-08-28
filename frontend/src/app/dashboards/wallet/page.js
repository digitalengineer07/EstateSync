"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import { Wallet, Users, Receipt } from "lucide-react";

export default function WalletDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("wallet");

  const isSalesOrAdmin = ["SALES", "ADMIN", "MARKETING"].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Personal Portal & Operations
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Wallet className="w-3.5 h-3.5" />
                Wallet & Field Operations
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Manage your personal wallet balance, request departmental funds, file expense receipts, and register customer contracts.
            </p>
          </div>

          {isSalesOrAdmin && (
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("wallet")}
                className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === "wallet"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Wallet & Expenses
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === "customers"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Customer Bookings (PRD §19)
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
