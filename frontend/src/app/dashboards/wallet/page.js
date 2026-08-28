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
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personal Portal & Operational Hub</h2>
            <p className="text-gray-600 text-sm mt-1">
              Manage your personal wallet balance, request departmental funds, file expense receipts, and register customer contracts.
            </p>
          </div>

          {isSalesOrAdmin && (
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab("wallet")}
                className={`px-4 py-2 rounded-lg transition ${activeTab === "wallet" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                💼 Wallet & Expenses
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`px-4 py-2 rounded-lg transition ${activeTab === "customers" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
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
