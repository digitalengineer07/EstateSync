export default function AccountingDashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Accounting Dashboard</h2>
      <p className="text-gray-600">
        Welcome to the accounting hub. You can monitor journal entries, audit corporate expenses, and perform reconciliations.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
          <h3 className="text-lg font-semibold text-purple-800">Pending Reconciliations</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">24 Items</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
          <h3 className="text-lg font-semibold text-emerald-800">Total Processed (MTD)</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">₹18,50,000</p>
        </div>
      </div>
    </div>
  );
}
