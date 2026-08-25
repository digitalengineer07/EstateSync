export default function ManagerDashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Manager Dashboard</h2>
      <p className="text-gray-600">
        Welcome to your dashboard. Here you can approve fund requests from your team and oversee departmental spending.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800">Pending Approvals</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">12 Requests</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-100">
          <h3 className="text-lg font-semibold text-red-800">Department Expenses</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">₹1,45,000</p>
        </div>
      </div>
    </div>
  );
}
