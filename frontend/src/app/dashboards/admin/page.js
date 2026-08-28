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

export default function AdminDashboard() {
  const [activeLedgerTab, setActiveLedgerTab] = useState("requests"); // "requests" or "transactions"

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Admin Dashboard & Global Treasury
              </h2>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold rounded-full border border-indigo-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Master Control & Treasury
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm max-w-3xl">
              Allocate organizational capital, provision team accounts, oversee customer revenue collections, manage land parcel disbursements, and inspect live double-entry journals.
            </p>
          </div>
        </div>
        
        <DashboardStats type="admin" />
      </div>
      
      {/* Top Actions: Direct Allocation & User Creation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>

      {/* Customer Portfolios View */}
      <CustomerPortfolioList mode="accounting" userRole="ADMIN" />

      {/* Land Acquisitions View */}
      <PropertyAcquisitionList userRole="ADMIN" />
      
      {/* Toggled Unified Container: Fund Requests & Global Transaction Ledger */}
      <div className="bg-white shadow-sm rounded-2xl p-6 sm:p-7 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">
                {activeLedgerTab === "requests" ? "All Organization Fund Requests" : "Global Transaction Ledger"}
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeLedgerTab === "requests" ? "Peer-to-Manager Workflows" : "PRD §4.4 Credit / Debit Ledger"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activeLedgerTab === "requests"
                ? "Review company-wide fund allocations and pending manager requests in a full-width view."
                : "Complete audit ledger of all fund flows, customer collections, and land payouts."}
            </p>
          </div>

          {/* Toggle Switch Buttons */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto text-xs font-semibold shadow-inner">
            <button
              onClick={() => setActiveLedgerTab("requests")}
              className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                activeLedgerTab === "requests"
                  ? "bg-white text-indigo-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 All Fund Requests
            </button>
            <button
              onClick={() => setActiveLedgerTab("transactions")}
              className={`px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                activeLedgerTab === "transactions"
                  ? "bg-white text-indigo-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💳 Global Transaction Ledger
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
