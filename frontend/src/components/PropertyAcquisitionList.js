"use client";

import { useState, useEffect } from "react";
import PropertyAcquisitionModal from "./PropertyAcquisitionModal";
import RecordPropertyPaymentModal from "./RecordPropertyPaymentModal";
import { MapPin, Search, RefreshCw, Plus, Building2, Coins, TrendingDown, Clock } from "lucide-react";
import { API_URL } from "@/config/api";

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
      const res = await fetch(`${API_URL}/api/v1/properties`, {
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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-7">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl font-bold text-slate-900">
              Land & Property Acquisition Portfolio
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              PRD §20
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage acquired land parcels, tract valuations, and owner payout disbursements against Corporate Treasury (1010).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Land Acquisition</span>
            </button>
          )}
          <button
            onClick={fetchProperties}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200/80"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-5">
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Land Parcels</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{summary.totalProperties}</p>
          </div>
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Asset Valuation</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">₹{parseFloat(summary.totalLandValuation || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Paid to Owners</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">₹{parseFloat(summary.totalPaidToOwners || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pending Liabilities</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">₹{parseFloat(summary.totalOutstandingLiabilities || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by owner, khata, plot, or location..."
            className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-8 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white font-medium text-slate-700"
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
        <div className="py-12 text-center text-slate-400 text-xs">Loading land acquisitions...</div>
      ) : filteredProperties.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="font-semibold text-xs">No property records found</p>
          <p className="text-[11px] text-slate-400 mt-1">Register a new land acquisition to start tracking land parcels and owner payouts.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/90 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Khata & Plot</th>
                <th className="px-4 py-3">Land Owner</th>
                <th className="px-4 py-3 text-right">Total Land Value</th>
                <th className="px-4 py-3">Payout Progress</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProperties.map((prop) => {
                const total = parseFloat(prop.totalLandValue || 0);
                const paid = parseFloat(prop.totalPaidToOwner || 0);
                const balance = parseFloat(prop.balanceRemaining || 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">Plot {prop.plotNo}</div>
                      <div className="text-[11px] text-slate-500">{prop.projectLocation}</div>
                      <div className="text-[10px] text-indigo-600 font-mono">Khata: {prop.khataNo} • {prop.areaDescription || "N/A"}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{prop.landOwnerName}</div>
                      <div className="text-[11px] text-slate-500">{prop.landOwnerContact}</div>
                      <div className="text-[10px] text-slate-400">Owner A/C: {prop.ownerBankAccount || "Direct"}</div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900 text-sm">₹{total.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400 font-sans">Agreement: {new Date(prop.agreementDate).toLocaleDateString()}</div>
                    </td>

                    <td className="px-4 py-3.5 min-w-[160px]">
                      <div className="flex justify-between text-[11px] font-semibold mb-1 font-mono">
                        <span className="text-emerald-700">₹{paid.toLocaleString('en-IN')}</span>
                        <span className="text-slate-500">Rem: ₹{balance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-0.5 font-medium">{pct}% Disbursed</div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prop.status === 'FULLY_PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>
                        {prop.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canRecordPayout && prop.status !== 'FULLY_PAID' && (
                          <button
                            onClick={() => handleOpenPayment(prop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold transition"
                          >
                            <Coins className="w-3 h-3" />
                            <span>Record Payout</span>
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryProperty(prop)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="View Payout History"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <PropertyAcquisitionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPropertyCreated={() => fetchProperties()}
      />

      {selectedPropertyForPayment && (
        <RecordPropertyPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setSelectedPropertyForPayment(null);
          }}
          property={selectedPropertyForPayment}
          onPaymentRecorded={() => fetchProperties()}
        />
      )}

      {/* History Drawer */}
      {historyProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Disbursement Ledger: {historyProperty.landOwnerName}</h3>
                <p className="text-xs text-slate-400">Khata {historyProperty.khataNo}, Plot {historyProperty.plotNo} ({historyProperty.projectLocation}) • Valuation: ₹{parseFloat(historyProperty.totalLandValue).toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => setHistoryProperty(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {!historyProperty.payments || historyProperty.payments.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">No payout payments recorded yet for this land parcel.</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Source Account</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {historyProperty.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{new Date(p.dateOfPayment).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-sans font-medium text-slate-800">{p.paymentMode}</td>
                        <td className="px-3 py-2 text-slate-500 text-[11px] font-sans">{p.paidFromAccount}</td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">{p.referenceNo || "N/A"}</td>
                        <td className="px-3 py-2 text-right font-bold text-rose-600">₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryProperty(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
