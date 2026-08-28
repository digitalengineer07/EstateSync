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
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard & Global Treasury</h2>
        <p className="text-gray-600 text-sm">
          Welcome to the system administration panel. Here you can allocate treasury funds, manage corporate users, monitor double-entry journals, track customer collections, and oversee land acquisitions.
        </p>
        
        <DashboardStats type="admin" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>

      <CustomerPortfolioList mode="accounting" userRole="ADMIN" />

      <PropertyAcquisitionList userRole="ADMIN" />
      
      {/* Toggled Unified Container: Fund Requests & Global Transaction Ledger */}
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">
                {activeLedgerTab === "requests" ? "All Fund Requests" : "Global Transaction Ledger"}
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeLedgerTab === "requests" ? "Peer-to-Manager Workflows" : "PRD §4.4 Credit / Debit Ledger"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {activeLedgerTab === "requests"
                ? "Review company-wide fund allocations and pending manager requests in a full-width view."
                : "Complete audit ledger of all fund flows, customer collections, and land payouts."}
            </p>
          </div>

          {/* Toggle Switch Buttons */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setActiveLedgerTab("requests")}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeLedgerTab === "requests"
                  ? "bg-white text-indigo-700 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📋 All Fund Requests
            </button>
            <button
              onClick={() => setActiveLedgerTab("transactions")}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeLedgerTab === "transactions"
                  ? "bg-white text-indigo-700 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
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

      <GeneralLedgerView />

      <AuditLogViewer />
    </div>
  );
}
