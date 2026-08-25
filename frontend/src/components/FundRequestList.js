"use client";

import { useState, useEffect } from "react";

// type can be 'outgoing', 'incoming', or 'all'
export default function FundRequestList({ type = "outgoing" }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      let endpoint = "http://localhost:4000/api/v1/fund-requests/my";
      if (type === "incoming") endpoint = "http://localhost:4000/api/v1/fund-requests/incoming";
      if (type === "all") endpoint = "http://localhost:4000/api/v1/fund-requests/all";

      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [type]);

  const handleAction = async (id, action) => {
    setActionError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:4000/api/v1/fund-requests/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(action === 'reject' ? { comments: "Rejected via Dashboard" } : {})
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh list
        fetchRequests();
      } else {
        setActionError(data.message || `Failed to ${action} request.`);
      }
    } catch (error) {
      setActionError("Network error occurred.");
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading requests...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          {type === 'outgoing' ? 'My Fund Requests' : type === 'incoming' ? 'Team Fund Requests' : 'All Fund Requests'}
        </h3>
        <button onClick={fetchRequests} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {actionError && (
        <div className="p-4 mb-4 bg-red-50 text-red-800 border border-red-200 rounded-md">
          {actionError}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="text-gray-500">No requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                {type !== 'outgoing' && <th scope="col" className="px-6 py-3">Requester</th>}
                {type !== 'incoming' && <th scope="col" className="px-6 py-3">Manager</th>}
                <th scope="col" className="px-6 py-3">Amount</th>
                <th scope="col" className="px-6 py-3">Reason</th>
                <th scope="col" className="px-6 py-3">Status</th>
                {type === 'incoming' && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">{new Date(req.createdAt).toLocaleDateString()}</td>
                  {type !== 'outgoing' && <td className="px-6 py-4">{req.requester?.name || req.requesterId}</td>}
                  {type !== 'incoming' && <td className="px-6 py-4">{req.manager?.name || req.managerId}</td>}
                  <td className="px-6 py-4 font-semibold">₹{parseFloat(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">{req.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {req.status}
                    </span>
                  </td>
                  {type === 'incoming' && (
                    <td className="px-6 py-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => handleAction(req.id, 'approve')} className="text-green-600 hover:text-green-900 font-medium">Approve</button>
                          <button onClick={() => handleAction(req.id, 'reject')} className="text-red-600 hover:text-red-900 font-medium">Reject</button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
