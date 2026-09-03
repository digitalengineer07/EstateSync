"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import { Wallet, Users, Receipt, CreditCard, ArrowLeftRight } from "lucide-react";

export default function WalletDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("wallet");
  const [activityTab, setActivityTab] = useState("requests");

  const isAdmin = user?.role === "ADMIN";
  const isSalesOrAdmin = ["SALES", "ADMIN", "MARKETING"].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {isAdmin ? "Corporate Approvals & Executive Wallet" : "Personal Portal & Operations"}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Wallet className="w-3.5 h-3.5" />
              {isAdmin ? "Executive Approvals" : "Wallet & Field"}
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isAdmin
              ? "Review and disburse incoming team fund requests across the organization, and record executive corporate expenditures."
              : "Manage your personal wallet balance, request departmental funds, file expense receipts, and register customer contracts."}
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
              {isAdmin ? "Approvals & Expenses" : "Wallet & Expenses"}
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
        <div className="space-y-6">
          {/* Top Row: Admin gets Live Approvals Inbox + Record Expense, others get Request Form + Expense Form */}
          {isAdmin ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left 2 Cols: Live Organization Fund Requests Approvals Inbox */}
              <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Incoming Organization Fund Requests
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Review, approve, or reject live fund requisitions submitted by team managers and field staff.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                    Live Approver Inbox
                  </span>
                </div>
                <FundRequestList type="all" embedded={true} showHeader={false} />
              </div>

              {/* Right 1 Col: Record Official Corporate Expense */}
              <div className="xl:col-span-1">
                <ExpenseUploadForm />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FundRequestForm />
              <ExpenseUploadForm />
            </div>
          )}

          {/* Bottom Row: Full-Width Container with Segmented Toggle Button */}
          <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-6">
            {/* Toggle Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {isAdmin ? "Executive Activity & Audit Statements" : "Personal Activity & Statements"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAdmin
                      ? "Review executive expenditures, company-wide expense receipts with reversal controls, and full requisitions ledger."
                      : "Toggle between your submitted wallet fund requests and line-item expense ledger."}
                  </p>
                </div>
              </div>

              {/* Segmented Toggle Control */}
              {isAdmin ? (
                <div className="flex flex-wrap bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold self-start sm:self-auto shadow-2xs gap-1">
                  <button
                    onClick={() => setActivityTab("executive_expenses")}
                    className={`px-3.5 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                      (activityTab === "executive_expenses" || activityTab === "requests")
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Executive Expenses</span>
                  </button>
                  <button
                    onClick={() => setActivityTab("company_expenses")}
                    className={`px-3.5 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                      activityTab === "company_expenses"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>All Company Expenses</span>
                  </button>
                  <button
                    onClick={() => setActivityTab("all_requests")}
                    className={`px-3.5 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                      activityTab === "all_requests"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>All Requests Full Ledger</span>
                  </button>
                </div>
              ) : (
                <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold self-start sm:self-auto shadow-2xs">
                  <button
                    onClick={() => setActivityTab("requests")}
                    className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 ${
                      activityTab === "requests"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>My Fund Requests</span>
                  </button>
                  <button
                    onClick={() => setActivityTab("expenses")}
                    className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 ${
                      activityTab === "expenses"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>My Recorded Expenses</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Content: Full-Width Table */}
            <div>
              {isAdmin ? (
                activityTab === "company_expenses" ? (
                  <ExpenseList type="all" embedded={true} showHeader={false} />
                ) : activityTab === "all_requests" ? (
                  <FundRequestList type="all" embedded={true} showHeader={false} />
                ) : (
                  <ExpenseList type="my" embedded={true} showHeader={false} />
                )
              ) : (
                activityTab === "requests" ? (
                  <FundRequestList type="outgoing" embedded={true} showHeader={false} />
                ) : (
                  <ExpenseList type="my" embedded={true} showHeader={false} />
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <CustomerPortfolioList mode="sales" userRole={user?.role || "SALES"} />
      )}
    </div>
  );
}
