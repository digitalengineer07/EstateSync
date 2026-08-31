"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { API_URL } from "@/config/api";

// type can be 'outgoing', 'incoming', or 'all'
export default function FundRequestList({ type = "outgoing", embedded = false, showHeader = true }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [overrideModes, setOverrideModes] = useState({});
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isApproverView = type === "incoming" || type === "all";

  const handleOverrideMode = (id, mode) => {
    setOverrideModes(prev => ({ ...prev, [id]: mode }));
  };

  const fetchRequests = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem("accessToken");
      let endpoint = `${API_URL}/api/v1/fund-requests/my`;
      if (type === "incoming") endpoint = `${API_URL}/api/v1/fund-requests/incoming`;
      if (type === "all") endpoint = `${API_URL}/api/v1/fund-requests/all`;

      const res = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setActionError(data.message || "Failed to fetch fund requests.");
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
      setActionError("Network error loading requests.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [type]);

  const handleAction = async (id, action) => {
    setActionError(null);
    setActionSuccess(null);
    setProcessingId(id);
    try {
      const token = localStorage.getItem("accessToken");
      
      let bodyData = {};
      if (action === 'reject') {
        bodyData = { comments: "Rejected via Dashboard" };
      } else if (action === 'approve') {
        if (overrideModes[id]) {
          bodyData = { overrideFundMode: overrideModes[id] };
        }
      }

      const res = await fetch(`${API_URL}/api/v1/fund-requests/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      
      if (data.success) {
        setActionSuccess(`Request ${action === 'approve' ? 'approved and funds allocated' : 'rejected'} successfully!`);
        fetchRequests();
      } else {
        setActionError(data.message || `Failed to ${action} request.`);
      }
    } catch (error) {
      setActionError("Network error occurred while processing action.");
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className={embedded ? "p-4 text-slate-500 text-sm" : "bg-white shadow rounded-lg p-6 mt-8"}>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading fund requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "bg-white shadow rounded-lg p-6 mt-8"}>
      {showHeader && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {type === 'outgoing' ? 'My Fund Requests' : type === 'incoming' ? 'Team Fund Requests' : 'All Fund Requests'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {type === 'outgoing' ? 'Status of your submitted wallet top-up requests' : 'Review and approve pending fund allocation requests'}
            </p>
          </div>
          <button 
            onClick={fetchRequests} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold ml-4">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 mb-4 bg-red-50 text-red-800 border border-red-200 rounded-md text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-900 text-xs font-bold ml-4">✕</button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-600">No fund requests found.</p>
          <p className="text-xs text-slate-400 mt-1">Submitted fund requests will appear here in real-time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-200 text-gray-600 text-xs font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3">Date</th>
                {type !== 'outgoing' && <th scope="col" className="px-5 py-3">Requester</th>}
                {type !== 'incoming' && <th scope="col" className="px-5 py-3">Manager / Approver</th>}
                <th scope="col" className="px-5 py-3">Amount</th>
                <th scope="col" className="px-5 py-3">Reason</th>
                <th scope="col" className="px-5 py-3">Mode</th>
                <th scope="col" className="px-5 py-3">Status</th>
                {isApproverView && <th scope="col" className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-900">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-xs text-gray-600">{new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  {type !== 'outgoing' && (
                    <td className="px-5 py-4 font-medium text-slate-800">
                      <div>{req.requester?.name || 'User'}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{req.requester?.email || req.requesterId}</div>
                    </td>
                  )}
                  {type !== 'incoming' && (
                    <td className="px-5 py-4 text-slate-700">
                      <div>{req.manager?.name || 'Authority'}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{req.manager?.email || req.managerId}</div>
                    </td>
                  )}
                  <td className="px-5 py-4 font-bold text-slate-900">₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-4 text-slate-700 max-w-xs truncate">{req.reason}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                      {req.fundMode || 'LIQUID'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' : 
                        'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {req.status}
                    </span>
                  </td>
                  {isApproverView && (
                    <td className="px-5 py-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex justify-end items-center space-x-2">
                          <select
                            value={overrideModes[req.id] || req.fundMode || 'LIQUID'}
                            onChange={(e) => handleOverrideMode(req.id, e.target.value)}
                            disabled={processingId === req.id}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="LIQUID">LIQUID</option>
                            <option value="CASH">CASH</option>
                          </select>
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => handleAction(req.id, 'approve')} 
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {processingId === req.id ? "Processing..." : "Approve"}
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => handleAction(req.id, 'reject')} 
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">—</span>
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
