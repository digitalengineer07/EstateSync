import UserRegistrationForm from "@/components/UserRegistrationForm";

export default function AdminDashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
      <p className="text-gray-600">
        Welcome to the Financial Overview. Here you can allocate funds, view all organizational expenses, and monitor transactions.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800">Total Funds</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">₹10,00,000</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <h3 className="text-lg font-semibold text-green-800">Total Allocated</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">₹3,50,000</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
          <h3 className="text-lg font-semibold text-purple-800">Available</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">₹6,50,000</p>
        </div>
      </div>
      
      {/* Registration Section */}
      <UserRegistrationForm />
    </div>
  );
}
