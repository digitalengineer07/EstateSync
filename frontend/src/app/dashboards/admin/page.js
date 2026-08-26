import UserRegistrationForm from "@/components/UserRegistrationForm";
import FundRequestList from "@/components/FundRequestList";
import TransactionLedger from "@/components/TransactionLedger";
import DashboardStats from "@/components/DashboardStats";
import DirectFundAllocationForm from "@/components/DirectFundAllocationForm";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import AuditLogViewer from "@/components/AuditLogViewer";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
        <p className="text-gray-600">
          Welcome to the system administration panel. Here you can manage users, roles, organizational wallets, double-entry financial journals, and oversee all system activity.
        </p>
        
        <DashboardStats type="admin" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DirectFundAllocationForm />
        <UserRegistrationForm />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FundRequestList type="all" />
        <TransactionLedger />
      </div>

      <GeneralLedgerView />

      <AuditLogViewer />
    </div>
  );
}
