"use client";

import UserRegistrationForm from "@/components/UserRegistrationForm";
import FundRequestList from "@/components/FundRequestList";
import TransactionLedger from "@/components/TransactionLedger";
import DashboardStats from "@/components/DashboardStats";
import DirectFundAllocationForm from "@/components/DirectFundAllocationForm";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import AuditLogViewer from "@/components/AuditLogViewer";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard & Global Treasury</h2>
        <p className="text-gray-600 text-sm">
          Welcome to the system administration panel. Here you can allocate treasury funds, manage corporate users, monitor double-entry journals, track customer collections, and oversee governance audits.
        </p>
        
        <DashboardStats type="admin" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>

      <CustomerPortfolioList mode="accounting" userRole="ADMIN" />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FundRequestList type="all" />
        <TransactionLedger />
      </div>

      <GeneralLedgerView />

      <AuditLogViewer />
    </div>
  );
}
