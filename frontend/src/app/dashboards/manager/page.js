import FundRequestList from "@/components/FundRequestList";
import DashboardStats from "@/components/DashboardStats";

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Manager Dashboard</h2>
        <p className="text-gray-600">
          Welcome to your dashboard. Here you can approve fund requests from your team and oversee departmental spending.
        </p>
        
        <DashboardStats type="manager" />
      </div>

      <FundRequestList type="incoming" />
    </div>
  );
}
