"use client";

import { useState } from "react";
import UserRegistrationForm from "@/components/UserRegistrationForm";
import FundRequestList from "@/components/FundRequestList";
import TransactionLedger from "@/components/TransactionLedger";
import DashboardStats from "@/components/DashboardStats";
import DirectFundAllocationForm from "@/components/DirectFundAllocationForm";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import AuditLogViewer from "@/components/AuditLogViewer";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import PropertyAcquisitionList from "@/components/PropertyAcquisitionList";
import TreasuryInflowList from "@/components/TreasuryInflowList";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeftRight, Users, Coins, UserPlus, Columns2, SlidersHorizontal } from "lucide-react";

export default function AdminDashboard() {
  const [activeLedgerTab, setActiveLedgerTab] = useState("requests"); // "requests" or "transactions"
  const [operationsTab, setOperationsTab] = useState("both"); // "both", "allocation", "registration"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Admin Dashboard & Global Treasury
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Master Control
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Allocate organizational capital, provision team accounts, oversee customer revenue collections, manage land parcels, and inspect double-entry journals.
          </p>
        </div>
      </div>

      {/* 4 Clean Stats */}
      <DashboardStats type="admin" />
      
      {/* Administrative Operations Control: Toggle between Allocation, Registration, or Side-by-Side */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Administrative Operations Hub
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocate corporate treasury capital or provision new staff accounts. Use the toggle buttons to switch views.
                </p>
              </div>
            </div>

            {/* Segmented Toggle Control */}
            <div className="flex flex-wrap bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold self-start sm:self-auto shadow-2xs gap-1">
              <button
                onClick={() => setOperationsTab("allocation")}
                className={`px-3.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                  operationsTab === "allocation"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                <span>Direct Fund Allocation</span>
              </button>
              <button
                onClick={() => setOperationsTab("registration")}
                className={`px-3.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                  operationsTab === "registration"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Register New User</span>
              </button>
              <button
                onClick={() => setOperationsTab("both")}
                className={`px-3.5 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                  operationsTab === "both"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Side-by-Side (Both)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operations Content */}
        {operationsTab === "allocation" && (
          <div>
            <DirectFundAllocationForm />
          </div>
        )}

        {operationsTab === "registration" && (
          <div>
            <UserRegistrationForm />
          </div>
        )}

        {operationsTab === "both" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <DirectFundAllocationForm />
            <UserRegistrationForm />
          </div>
        )}
      </div>

      {/* Corporate Treasury & Bank Inflow Audit */}
      <TreasuryInflowList userRole="ADMIN" />

      {/* Staff & Workforce Directory Navigation Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Staff & Workforce Directory</h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee master records, staff governance, department allocations, and user login bindings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboards/employees"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
            >
              <Users className="w-3.5 h-3.5" />
              Employee Master
            </Link>
          </div>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboards/employees"
            className="p-4 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">Employee Master Directory</span>
              <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Manage staff directory, employment status, designations, work locations, and system login bindings.</p>
          </Link>
        </div>
      </div>

      {/* Customer Portfolios View */}
      <CustomerPortfolioList mode="accounting" userRole="ADMIN" />

      {/* Land Acquisitions View */}
      <PropertyAcquisitionList userRole="ADMIN" />
      
      {/* Toggled Unified Container: Fund Requests & Global Transaction Ledger */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {activeLedgerTab === "requests" ? "All Organization Fund Requests" : "Global Transaction Ledger"}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {activeLedgerTab === "requests" ? "Peer-to-Manager Workflows" : "PRD §4.4 Credit / Debit"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeLedgerTab === "requests"
                ? "Review company-wide fund allocations and pending manager requests in a full-width view."
                : "Complete audit ledger of all fund flows, customer collections, and land payouts."}
            </p>
          </div>

          {/* Toggle Switch Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveLedgerTab("requests")}
              className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeLedgerTab === "requests"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              All Fund Requests
            </button>
            <button
              onClick={() => setActiveLedgerTab("transactions")}
              className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeLedgerTab === "transactions"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Global Transaction Ledger
            </button>
          </div>
        </div>

        <div className="mt-4">
          {activeLedgerTab === "requests" ? (
            <FundRequestList type="all" embedded={true} showHeader={false} />
          ) : (
            <TransactionLedger embedded={true} showHeader={false} />
          )}
        </div>
      </div>

      {/* Double-Entry General Ledger */}
      <GeneralLedgerView />

      {/* Security & Audit Trail */}
      <AuditLogViewer />
    </div>
  );
}
