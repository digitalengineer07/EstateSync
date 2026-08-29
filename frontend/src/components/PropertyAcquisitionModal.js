"use client";

import { useState } from "react";

export default function PropertyAcquisitionModal({ isOpen, onClose, onPropertyCreated }) {
  const [formData, setFormData] = useState({
    khataNo: "",
    plotNo: "",
    projectLocation: "",
    landOwnerName: "",
    landOwnerContact: "",
    landOwnerAddress: "",
    areaSqft: "",
    totalLandValue: "",
    agreementDate: new Date().toISOString().split("T")[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const numValue = parseFloat(formData.totalLandValue) || 0;
  const numArea = parseFloat(formData.areaSqft) || 0;
  const ratePerSqft = numArea > 0 && numValue > 0 ? (numValue / numArea).toFixed(2) : "0.00";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (numValue <= 0) {
      setError("Please enter a valid total land valuation greater than zero");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `prop-create-${Date.now()}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          ...formData,
          areaSqft: numArea || null,
          totalLandValue: numValue,
          agreementDate: new Date(formData.agreementDate).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to register property acquisition");
      }

      setSuccessMsg(`Land acquisition for Plot ${data.property.plotNo} (Khata ${data.property.khataNo}) registered successfully!`);
      setTimeout(() => {
        onPropertyCreated?.(data.property);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-700 via-orange-700 to-amber-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">New Land / Property Acquisition</h3>
            <p className="text-xs text-amber-200 mt-0.5">Register land parcel and owner liability terms (PRD §20.2)</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
              <span className="font-bold">Success:</span> {successMsg}
            </div>
          )}

          {/* Section 1: Land Parcel Details */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> 1. Land Parcel Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Khata / Mutation No *</label>
                <input
                  type="text"
                  name="khataNo"
                  required
                  value={formData.khataNo}
                  onChange={handleChange}
                  placeholder="e.g. KH-5502/2026"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Plot / Khasra No *</label>
                <input
                  type="text"
                  name="plotNo"
                  required
                  value={formData.plotNo}
                  onChange={handleChange}
                  placeholder="e.g. LA-902"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-amber-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Plot Area (Sq. Ft)</label>
                <input
                  type="number"
                  name="areaSqft"
                  min="1"
                  step="0.01"
                  value={formData.areaSqft}
                  onChange={handleChange}
                  placeholder="e.g. 15000"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project / Township Location *</label>
                <input
                  type="text"
                  name="projectLocation"
                  required
                  value={formData.projectLocation}
                  onChange={handleChange}
                  placeholder="e.g. Green Horizon Township, Sector 12"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Land Owner Details */}
          <div className="pt-3 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> 2. Land Owner Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Land Owner Full Name *</label>
                <input
                  type="text"
                  name="landOwnerName"
                  required
                  value={formData.landOwnerName}
                  onChange={handleChange}
                  placeholder="e.g. Balram Yadav"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Owner Contact Phone *</label>
                <input
                  type="text"
                  name="landOwnerContact"
                  required
                  value={formData.landOwnerContact}
                  onChange={handleChange}
                  placeholder="e.g. +91 91234 56789"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Owner Address</label>
                <input
                  type="text"
                  name="landOwnerAddress"
                  value={formData.landOwnerAddress}
                  onChange={handleChange}
                  placeholder="Village, Tehsil, District, State"
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial Terms & Total Valuation */}
          <div className="pt-3 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> 3. Valuation & Agreement Date
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Total Agreed Land Value (₹) *</label>
                <input
                  type="number"
                  name="totalLandValue"
                  required
                  min="1"
                  step="0.01"
                  value={formData.totalLandValue}
                  onChange={handleChange}
                  placeholder="e.g. 2000000"
                  className="w-full text-sm font-bold border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none text-gray-900"
                />
                {numArea > 0 && numValue > 0 && (
                  <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                    Calculated Rate: ₹{ratePerSqft} / sq.ft
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Agreement Date *</label>
                <input
                  type="date"
                  name="agreementDate"
                  required
                  value={formData.agreementDate}
                  onChange={handleChange}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Valuation Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-3 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase">Fixed Asset Land Valuation</span>
                <p className="text-[11px] text-amber-700">Posts to Chart of Accounts (Account 1510) upon payment</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-amber-900">₹{numValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || numValue <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 active:scale-95 rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? "Registering..." : "Record Land Acquisition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
