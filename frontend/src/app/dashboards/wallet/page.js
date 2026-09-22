"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import ExpenseList from "@/components/ExpenseList";
import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import SoftDashboardShell from "@/components/SoftDashboardShell";
import { ArrowLeftRight, CreditCard, Receipt, Users, Wallet } from "lucide-react";

export default function WalletDashboard() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState("wallet");
  const [activityTab, setActivityTab] = useState("requests");

  const userRole = (typeof user?.role === "object" ? user?.role?.name : user?.role) || "";
  const isAdmin = userRole === "ADMIN";
  const isSalesOrAdmin = ["SALES", "ADMIN", "MARKETING"].includes(userRole);

  const walletTitle = isAdmin
    ? "Corporate Approvals & Executive Wallet"
    : userRole === "SALES"
    ? "Sales Operations & Customer Bookings"
    : userRole === "MARKETING"
    ? "Marketing Operations & Field Portal"
    : "Personal Portal & Operations";

  const walletPanels = [
    {
      id: "wallet",
      label: isAdmin ? "Approvals & Expenses" : "Wallet & Expenses",
      shortLabel: isAdmin ? "Approvals" : "Wallet",
      description: isAdmin
        ? "Approve team requests and record executive expenses."
        : "Request funds, file expenses, and review personal activity.",
      icon: Wallet,
    },
    ...(isSalesOrAdmin
      ? [
          {
            id: "customers",
            label: "Customer Bookings",
            shortLabel: "Bookings",
            description: "Register customer bookings and review sales portfolios.",
            icon: Users,
          },
        ]
      : []),
  ];

  const renderActivityPanel = () => (
    <div className="bg-white rounded-[16px] border border-zinc-200 p-5 shadow-[0_10px_24px_-20px_rgba(20,20,20,0.45)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <h3 className="text-lg font-extrabold text-zinc-950">
            {isAdmin ? "Executive Activity & Audit Statements" : "Personal Activity & Statements"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {isAdmin
              ? "Review executive expenditures, company-wide expenses, and full requisitions."
              : "Toggle between submitted fund requests and line-item expense records."}
          </p>
        </div>

        <div className="flex flex-wrap bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold gap-1">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActivityTab("executive_expenses")}
                className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activityTab === "executive_expenses" || activityTab === "requests"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Executive Expenses
              </button>
              <button
                onClick={() => setActivityTab("company_expenses")}
                className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activityTab === "company_expenses"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                All Company Expenses
              </button>
              <button
                onClick={() => setActivityTab("all_requests")}
                className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activityTab === "all_requests"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                All Requests
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActivityTab("requests")}
                className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activityTab === "requests" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                My Requests
              </button>
              <button
                onClick={() => setActivityTab("expenses")}
                className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  activityTab === "expenses" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                My Expenses
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        {isAdmin ? (
          activityTab === "company_expenses" ? (
            <ExpenseList type="all" embedded={true} showHeader={false} />
          ) : activityTab === "all_requests" ? (
            <FundRequestList type="all" embedded={true} showHeader={false} />
          ) : (
            <ExpenseList type="my" embedded={true} showHeader={false} />
          )
        ) : activityTab === "requests" ? (
          <FundRequestList type="outgoing" embedded={true} showHeader={false} />
        ) : (
          <ExpenseList type="my" embedded={true} showHeader={false} />
        )}
      </div>
    </div>
  );

  const renderWalletPanel = () => (
    <div className="space-y-5">
      {isAdmin ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2 bg-white rounded-[16px] border border-zinc-200 p-5 shadow-[0_10px_24px_-20px_rgba(20,20,20,0.45)]">
            <div className="pb-4 mb-4 border-b border-zinc-100">
              <h3 className="text-lg font-extrabold text-zinc-950">Incoming Organization Fund Requests</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Review, approve, or reject live fund requisitions submitted by teams.
              </p>
            </div>
            <FundRequestList type="all" embedded={true} showHeader={false} />
          </div>
          <ExpenseUploadForm />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <FundRequestForm />
          <ExpenseUploadForm />
        </div>
      )}

      {renderActivityPanel()}
    </div>
  );

  const renderPanel = () => {
    if (activePanel === "customers") {
      return <CustomerPortfolioList mode="sales" userRole={user?.role || "SALES"} />;
    }

    return renderWalletPanel();
  };

  return (
    <SoftDashboardShell
      title={walletTitle}
      description={
        isAdmin
          ? "Review and disburse organization fund requests, record executive expenditures, and audit activity."
          : "Manage wallet balance, request departmental funds, file expense receipts, and register customer contracts."
      }
      badge={isAdmin ? "Executive Approvals" : "Wallet & Field"}
      navItems={walletPanels}
      activeId={activePanel}
      onSelect={setActivePanel}
      statsType="wallet"
      helperText="Use this personal workspace for approvals, wallet actions, field expenses, and bookings."
    >
      {renderPanel()}
    </SoftDashboardShell>
  );
}
