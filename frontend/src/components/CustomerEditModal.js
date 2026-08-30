"use client";

import { useState, useEffect } from "react";
import { Edit3, CheckCircle2, AlertCircle, X, ShieldAlert, FileText } from "lucide-react";

export default function CustomerEditModal({ isOpen, onClose, customer, onCustomerUpdated }) {
  const [formData, setFormData] = useState({
    customerName: "",
    customerContact: "",
    customerAddress: "",
    identityType: "Aadhaar",
    identityNumber: "",
    projectLocation: "",
    plotNo: "",
    khataNo: "",
    areaSqft: "",
    status: "ACTIVE"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName || "",
        customerContact: customer.customerContact || "",
        customerAddress: customer.customerAddress || "",
        identityType: customer.identityType || "Aadhaar",
        identityNumber: customer.identityNumber || "",
        projectLocation: customer.projectLocation || "",
        plotNo: customer.plotNo || "",
        khataNo: customer.khataNo || "",
        areaSqft: customer.areaSqft || "",
        status: customer.status || "ACTIVE"
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:4000/api/v1/customers/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update customer record.");
      }

      setSuccessMsg("Customer information updated successfully!");
      setTimeout(() => {
        onCustomerUpdated?.(data.customer);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Error updating customer:", err);
      setError(err.message || "Network error updating customer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Edit Customer & Booking Record</h3>
              <p className="text-xs text-slate-400">Update customer personal and property allotment details (PRD §19)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span><strong>Error:</strong> {error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span><strong>Success:</strong> {successMsg}</span>
            </div>
          )}

          {/* Section 1: Customer Personal Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. Customer Personal Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone / Email *</label>
                <input
                  type="text"
                  name="customerContact"
                  required
                  value={formData.customerContact}
                  onChange={handleChange}
                  placeholder="+91 9876543210 / email@domain.com"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Address</label>
                <input
                  type="text"
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  placeholder="e.g. Flat 402, Green Valley Apartments, Bangalore"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Identity Document Type</label>
                <select
                  name="identityType"
                  value={formData.identityType}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-white"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other Government ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Identity Number / Reference</label>
                <input
                  type="text"
                  name="identityNumber"
                  value={formData.identityNumber}
                  onChange={handleChange}
                  placeholder="e.g. XXXX-XXXX-1234"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Property Allotment Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 2. Property & Plot Allotment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name / Location *</label>
                <input
                  type="text"
                  name="projectLocation"
                  required
                  value={formData.projectLocation}
                  onChange={handleChange}
                  placeholder="e.g. Green Acres Phase 1"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plot Number *</label>
                <input
                  type="text"
                  name="plotNo"
                  required
                  value={formData.plotNo}
                  onChange={handleChange}
                  placeholder="e.g. 104-A"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khata Number *</label>
                <input
                  type="text"
                  name="khataNo"
                  required
                  value={formData.khataNo}
                  onChange={handleChange}
                  placeholder="e.g. KH-8892"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area (sq.ft) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="areaSqft"
                  required
                  value={formData.areaSqft}
                  onChange={handleChange}
                  placeholder="e.g. 1500"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-slate-50/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Read-Only Financial Ledger Guard */}
          <div className="pt-2 border-t border-slate-100 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                <span>Financial Ledger Snapshot (Read-Only)</span>
              </div>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                Immutable Ledger
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">Contract Value</span>
                <span className="font-bold text-slate-900">₹{parseFloat(customer.totalContractValue || 0).toLocaleString()}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">Total Collected</span>
                <span className="font-bold text-emerald-600">₹{parseFloat(customer.totalPaid || 0).toLocaleString()}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 block font-sans">Balance Due</span>
                <span className="font-bold text-slate-700">₹{parseFloat(customer.balanceDue || 0).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-sans leading-tight">
              Note: Customer collection payments and financial ledger journals are recorded exclusively by Accounting through verified banking transactions.
            </p>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? "Saving Changes..." : "Save Customer Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
