"use client";

import { useState } from "react";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";
import { Layers, FileCheck, Receipt } from "lucide-react";

export default function ManagerDashboard() {
  const [managerTab, setManagerTab] = useState("approvals");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Manager Oversight Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Layers className="w-3.5 h-3.5" />
              Department Budget
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Approve incoming fund requests from your field team, monitor departmental spending, and request additional capital from Admin.
          </p>
        </div>
      </div>

      {/* 3 Clean Stats */}
      <DashboardStats type="manager" />

      {/* Toggled Operations Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {managerTab === "approvals" ? "Incoming Team Fund Requests" : "Team Expense Submissions"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {managerTab === "approvals"
                ? "Review and one-click approve pending fund allocations to team members."
                : "Monitor itemized receipts and expenditures filed by your team."}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setManagerTab("approvals")}
              className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                managerTab === "approvals"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Pending Approvals
            </button>
            <button
              onClick={() => setManagerTab("expenses")}
              className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                managerTab === "expenses"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Team Expenses
            </button>
          </div>
        </div>

        <div className="mt-4">
          {managerTab === "approvals" ? (
            <FundRequestList type="incoming" embedded={true} showHeader={false} />
          ) : (
            <ExpenseList type="team" />
          )}
        </div>
      </div>
    </div>
  );
}
