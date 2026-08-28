"use client";

import { useState } from "react";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";

export default function ManagerDashboard() {
  const [managerTab, setManagerTab] = useState("approvals");

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Manager Oversight Hub
              </h2>
              <span className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                Departmental Budget & Approvals
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">
              Approve incoming fund requests from your field team, monitor team expenditures, and request additional liquidity from Admin.
            </p>
          </div>
        </div>
        
        <DashboardStats type="manager" />
      </div>

      {/* Toggled Operations Container */}
      <div className="bg-white shadow-sm rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {managerTab === "approvals" ? "Incoming Team Fund Requests" : "Team Expense Submissions"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {managerTab === "approvals"
                ? "Review and one-click approve pending fund allocations to team members."
                : "Monitor itemized receipts and expenditures filed by your team."}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-semibold shadow-inner">
            <button
              onClick={() => setManagerTab("approvals")}
              className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                managerTab === "approvals"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📥 Pending Approvals
            </button>
            <button
              onClick={() => setManagerTab("expenses")}
              className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                managerTab === "expenses"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🧾 Team Expenses
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
