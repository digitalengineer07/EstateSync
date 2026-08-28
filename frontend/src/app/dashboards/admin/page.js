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
import { ShieldCheck, FileText, ArrowLeftRight } from "lucide-react";

export default function AdminDashboard() {
  const [activeLedgerTab, setActiveLedgerTab] = useState("requests"); // "requests" or "transactions"

  return (
    <div className="space-y-6">
      {/* Top Header Card with Global Treasury Stats */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Admin Dashboard & Global Treasury
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <ShieldCheck className="w-3.5 h-3.5" />
                Master Treasury Control
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Allocate organizational capital, provision team accounts, oversee customer revenue collections, manage land parcel disbursements, and inspect live double-entry journals.
            </p>
          </div>
        </div>
        
        <DashboardStats type="admin" />
      </div>
      
      {/* Top Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>

      {/* Customer Portfolios View */}
      <CustomerPortfolioList mode="accounting" userRole="ADMIN" />

      {/* Land Acquisitions View */}
      <PropertyAcquisitionList userRole="ADMIN" />
      
      {/* Toggled Unified Container: Fund Requests & Global Transaction Ledger */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
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
