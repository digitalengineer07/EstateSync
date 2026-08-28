"use client";

import { useState, useEffect } from "react";
import PropertyAcquisitionModal from "./PropertyAcquisitionModal";
import RecordPropertyPaymentModal from "./RecordPropertyPaymentModal";

export default function PropertyAcquisitionList({ userRole = "ACCOUNTING" }) {
  const [properties, setProperties] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPropertyForPayment, setSelectedPropertyForPayment] = useState(null);

  // History detail drawer/modal state
  const [historyProperty, setHistoryProperty] = useState(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:4000/api/v1/properties", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch property acquisitions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleOpenPayment = (property) => {
    setSelectedPropertyForPayment(property);
    setIsPaymentOpen(true);
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch =
      p.landOwnerName?.toLowerCase().includes(search.toLowerCase()) ||
      p.khataNo?.toLowerCase().includes(search.toLowerCase()) ||
      p.plotNo?.toLowerCase().includes(search.toLowerCase()) ||
      p.projectLocation?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManage = ["ACCOUNTING", "ADMIN"].includes(userRole);

  return (
    <div className="bg-white shadow rounded-xl p-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">
              Land & Property Acquisition Portfolio
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              PRD §20
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage acquired land parcels, tract valuations, and owner payout disbursements against Corporate Treasury (1010).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <span>+</span> New Land Acquisition
            </button>
          )}
          <button
            onClick={fetchProperties}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition text-xs font-medium"
            title="Refresh list"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Land Parcels</span>
            <p className="text-2xl font-black text-amber-900 mt-1">{summary.totalProperties}</p>
          </div>
          <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">Total Land Asset Valuation</span>
            <p className="text-2xl font-black text-orange-900 mt-1">₹{summary.totalLandValuation?.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Paid to Owners</span>
            <p className="text-2xl font-black text-emerald-900 mt-1">₹{summary.totalPaidToOwners?.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Pending Liabilities</span>
            <p className="text-2xl font-black text-rose-900 mt-1">₹{summary.totalOutstandingLiabilities?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by owner, khata, plot, or location..."
            className="w-full text-xs border border-gray-300 rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none bg-white font-medium text-gray-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ONGOING">Ongoing</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading land acquisitions...</div>
      ) : filteredProperties.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="font-semibold text-sm">No land acquisition records found</p>
          <p className="text-xs text-gray-400 mt-1">Register a land parcel to begin tracking owner disbursements.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3">Parcel & Khata</th>
                <th className="px-4 py-3">Land Owner</th>
                <th className="px-4 py-3">Project Location</th>
                <th className="px-4 py-3 text-right">Agreed Value</th>
                <th className="px-4 py-3">Payout Progress</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProperties.map((prop) => {
                const total = parseFloat(prop.totalLandValue || 0);
                const paid = parseFloat(prop.totalPaidToOwner || 0);
                const remaining = parseFloat(prop.balanceRemaining || 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <tr key={prop.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">Plot {prop.plotNo}</div>
                      <div className="text-[11px] text-amber-900 font-mono">Khata: {prop.khataNo}</div>
                      {prop.areaSqft && (
                        <div className="text-[10px] text-gray-500">{parseFloat(prop.areaSqft).toLocaleString()} sq.ft</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900">{prop.landOwnerName}</div>
                      <div className="text-[11px] text-gray-500">{prop.landOwnerContact}</div>
                      {prop.landOwnerAddress && (
                        <div className="text-[10px] text-gray-400 truncate max-w-xs">{prop.landOwnerAddress}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-gray-700">
                      <div className="font-medium text-gray-800">{prop.projectLocation}</div>
                      <div className="text-[10px] text-gray-400">
                        Logged by: {prop.createdBy?.name || "Accounting"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 text-sm">
                      ₹{total.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 min-w-[160px]">
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-emerald-700">₹{paid.toLocaleString()}</span>
                        <span className="text-amber-900">Due: ₹{remaining.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-amber-600" : "bg-orange-500"}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-gray-500 text-right mt-0.5 font-medium">{pct}% Paid</div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prop.status === 'FULLY_PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {prop.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setHistoryProperty(prop)}
                        className="px-2.5 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition"
                      >
                        Payouts ({prop.payments?.length || 0})
                      </button>

                      {canManage && prop.status === 'ONGOING' && remaining > 0 && (
                        <button
                          onClick={() => handleOpenPayment(prop)}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-md shadow-sm transition active:scale-95"
                        >
                          + Record Payout
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      <PropertyAcquisitionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPropertyCreated={() => fetchProperties()}
      />

      {/* Record Payment Modal */}
      <RecordPropertyPaymentModal
        isOpen={isPaymentOpen}
        property={selectedPropertyForPayment}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedPropertyForPayment(null);
        }}
        onPaymentRecorded={() => fetchProperties()}
      />

      {/* Payout History Detail Modal */}
      {historyProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-amber-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Land Owner Payout Ledger: {historyProperty.landOwnerName}</h3>
                <p className="text-xs text-amber-200">Plot {historyProperty.plotNo} (Khata {historyProperty.khataNo}) • Agreed Valuation: ₹{parseFloat(historyProperty.totalLandValue).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setHistoryProperty(null)}
                className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {!historyProperty.payments || historyProperty.payments.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">No disbursements recorded yet for this land acquisition.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50 font-bold uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Disbursed Amount</th>
                      <th className="px-3 py-2 text-center">Entry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyProperty.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-700">{new Date(p.dateOfPayment).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{p.paymentMode}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-500">{p.referenceNo || "N/A"}</td>
                        <td className="px-3 py-2.5 font-bold text-rose-700 text-right">₹{parseFloat(p.amount).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            − DEBIT
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500">Remaining Owner Liability: </span>
                <span className="font-bold text-amber-900">₹{parseFloat(historyProperty.balanceRemaining).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setHistoryProperty(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 font-semibold rounded-lg text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
