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
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeftRight, Users, FileSpreadsheet, Landmark } from "lucide-react";

export default function AdminDashboard() {
  const [activeLedgerTab, setActiveLedgerTab] = useState("requests"); // "requests" or "transactions"

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
      
      {/* Operations Grid: Direct Allocation & User Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>

      {/* Staff & Payroll Oversight Navigation Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Staff & Payroll Oversight</h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phases 1–5B
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee master profiles, salary structures, monthly payroll runs, and treasury settlements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboards/employees"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Employee Directory
            </Link>
            <Link
              href="/dashboards/payroll"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Payroll Hub
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            href="/dashboards/employees"
            className="p-4 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">Employee Master</span>
              <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Staff directory, designations, and user login bindings.</p>
          </Link>

          <Link
            href="/dashboards/payroll"
            className="p-4 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">Payroll Engine</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Monthly calculations, exception review, and approvals.</p>
          </Link>

          <Link
            href="/dashboards/payroll"
            className="p-4 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">GL Accrual & Payouts</span>
              <Landmark className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Double-entry ledger posting and treasury disbursements.</p>
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
