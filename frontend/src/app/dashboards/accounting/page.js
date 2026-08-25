import DashboardStats from "@/components/DashboardStats";
import UserWalletLedger from "@/components/UserWalletLedger";
import ExpenseList from "@/components/ExpenseList";
import TransactionLedger from "@/components/TransactionLedger";

export default function AccountingDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Accounting & Financial Hub</h2>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200 self-start sm:self-auto">
            Audit & Oversight Mode
          </span>
        </div>
        <p className="text-gray-600 text-sm">
          Corporate financial ledger, audit tools, wallet balances, and real-time expense verification across EstateSync India operations.
        </p>
        
        <DashboardStats type="accounting" />
      </div>

      <UserWalletLedger />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ExpenseList type="all" />
        <TransactionLedger />
      </div>
    </div>
  );
}

