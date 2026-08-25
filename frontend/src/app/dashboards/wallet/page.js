import ExpenseUploadForm from "@/components/ExpenseUploadForm";
import FundRequestForm from "@/components/FundRequestForm";
import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";
import ExpenseList from "@/components/ExpenseList";

export default function WalletDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">My Wallet</h2>
        <p className="text-gray-600">
          Welcome to your wallet. You can view your available funds, request additional funds, and submit expenses.
        </p>
        
        <DashboardStats type="wallet" />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <FundRequestForm />
          <FundRequestList type="outgoing" />
        </div>
        <div className="space-y-6">
          <ExpenseUploadForm />
          <ExpenseList type="my" />
        </div>
      </div>
    </div>
  );
}
