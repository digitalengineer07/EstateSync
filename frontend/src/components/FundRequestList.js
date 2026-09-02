"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { API_URL } from "@/config/api";

// type can be 'outgoing', 'incoming', or 'all'
export default function FundRequestList({ type = "outgoing", embedded = false, showHeader = true }) {
  const [processingId, setProcessingId] = useState(null);
  const [overrideModes, setOverrideModes] = useState({});
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isApproverView = type === "incoming" || type === "all";

  const handleOverrideMode = (id, mode) => {
    setOverrideModes(prev => ({ ...prev, [id]: mode }));
  };

  let endpoint = `/api/v1/fund-requests/my`;
  if (type === "incoming") endpoint = `/api/v1/fund-requests/incoming`;
  if (type === "all") endpoint = `/api/v1/fund-requests/all`;

  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher, { 
    refreshInterval: 10000,
    revalidateOnFocus: true
  });

  const requests = data?.requests || [];

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
      const responseData = await res.json();
      
      if (responseData.success) {
        setActionSuccess(`Request ${action === 'approve' ? 'approved and funds allocated' : 'rejected'} successfully!`);
        mutate();
      } else {
        setActionError(responseData.message || `Failed to ${action} request.`);
      }
    } catch (error) {
      setActionError("Network error occurred while processing action.");
    }
    setProcessingId(null);
  };

  if (isLoading && !data) {
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
    <div className={embedded ? "space-y-4" : "bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-5"}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {type === 'outgoing' ? 'My Fund Requests' : type === 'incoming' ? 'Team Fund Requests' : 'All Fund Requests'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {type === 'outgoing' ? 'Status of your submitted wallet top-up requests' : 'Review and approve pending fund allocation requests'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              {requests.length} Requests
            </span>
            <button 
              onClick={() => mutate()} 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Refresh requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {error && data && (
        <div className="p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
          <span>⚠️ Disconnected - Retrying...</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold ml-4">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-600 hover:text-red-900 text-xs font-bold ml-4">✕</button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600">No fund requests found.</p>
          <p className="text-[11px] text-slate-400 mt-1">Submitted fund requests will appear here in real-time.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  {type !== 'outgoing' && <th scope="col" className="px-4 py-3">Requester</th>}
                  {type !== 'incoming' && <th scope="col" className="px-4 py-3">Manager / Approver</th>}
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3 min-w-[180px]">Reason</th>
                  <th scope="col" className="px-4 py-3">Mode</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  {isApproverView && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-normal">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium">{new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    {type !== 'outgoing' && (
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div>{req.requester?.name || 'User'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{req.requester?.email || req.requesterId}</div>
                      </td>
                    )}
                    {type !== 'incoming' && (
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{req.manager?.name || 'Authority'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{req.manager?.email || req.managerId}</div>
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-slate-900 font-sans text-xs">₹{parseFloat(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate font-medium">{req.reason}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200/70">
                        {req.fundMode || 'LIQUID'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 inline-flex text-[10.5px] font-bold rounded-md border 
                        ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {req.status}
                      </span>
                    </td>
                    {isApproverView && (
                      <td className="px-4 py-3 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-end items-center space-x-2">
                            <select
                              value={overrideModes[req.id] || req.fundMode || 'LIQUID'}
                              onChange={(e) => handleOverrideMode(req.id, e.target.value)}
                              disabled={processingId === req.id}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="LIQUID">LIQUID</option>
                              <option value="CASH">CASH</option>
                            </select>
                            <button 
                              disabled={processingId === req.id}
                              onClick={() => handleAction(req.id, 'approve')} 
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 active:scale-95"
                            >
                              {processingId === req.id ? "Processing..." : "Approve"}
                            </button>
                            <button 
                              disabled={processingId === req.id}
                              onClick={() => handleAction(req.id, 'reject')} 
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50 active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
