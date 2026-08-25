export default function WalletDashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Wallet</h2>
      <p className="text-gray-600">
        Welcome to your wallet. You can view your available funds, request additional funds, and submit expenses.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Available Balance</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">₹12,500</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
          <h3 className="text-lg font-semibold text-orange-800">Pending Requests</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">₹5,000</p>
        </div>
      </div>
    </div>
  );
}
