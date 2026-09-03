"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";

const INITIAL_FORM_DATA = {
  customerName: "",
  customerContact: "",
  customerAddress: "",
  projectLocation: "",
  plotNo: "",
  areaSqft: "",
  khataNo: "",
  identityType: "Aadhaar",
  identityNumber: "",
  ratePerSqft: "",
  landCost: "",
  registryCost: "",
  otherCharges: "",
  discount: "",
  taxes: ""
};

export default function CustomerRegistrationModal({ isOpen, onClose, onCustomerCreated }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleClose = () => {
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  // Ensure fresh, empty columns every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Live commercial calculation
  const area = parseFloat(formData.areaSqft) || 0;
  const rate = parseFloat(formData.ratePerSqft) || 0;
  const computedLandCost = parseFloat(formData.landCost) || (area * rate);
  const registry = parseFloat(formData.registryCost) || 0;
  const other = parseFloat(formData.otherCharges) || 0;
  const disc = parseFloat(formData.discount) || 0;
  const tax = parseFloat(formData.taxes) || 0;
  const totalContractValue = Math.max(0, (computedLandCost + registry + other + tax) - disc);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!formData.customerName?.trim() || !formData.customerContact?.trim() || !formData.projectLocation?.trim()) {
      setError("Customer Name, Contact, and Project Location are required.");
      setLoading(false);
      return;
    }

    if (!formData.plotNo?.trim()) {
      setError("Plot Number is compulsory and cannot be empty.");
      setLoading(false);
      return;
    }

    if (!formData.khataNo?.trim()) {
      setError("Khata Number is compulsory and cannot be empty.");
      setLoading(false);
      return;
    }

    if (area <= 0) {
      setError("Plot Area (sq.ft) must be greater than zero.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const idempotencyKey = `cust-create-${Date.now()}`;

      const payload = {
        ...formData,
        customerName: formData.customerName.trim(),
        customerContact: formData.customerContact.trim(),
        customerAddress: formData.customerAddress?.trim() || null,
        projectLocation: formData.projectLocation.trim(),
        plotNo: formData.plotNo.trim(),
        khataNo: formData.khataNo.trim(),
        identityType: formData.identityType.trim(),
        identityNumber: formData.identityNumber.trim(),
        areaSqft: area,
        ratePerSqft: rate,
        landCost: computedLandCost,
        registryCost: registry,
        otherCharges: other,
        discount: disc,
        taxes: tax
      };

      const res = await fetch(`${API_URL}/api/v1/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to register customer");
      }

      setSuccessMsg(`Customer ${data.customer.customerName} registered successfully! (Contract: ₹${parseFloat(data.customer.totalContractValue).toLocaleString('en-IN')})`);
      setFormData(INITIAL_FORM_DATA);
      setTimeout(() => {
        onCustomerCreated?.(data.customer);
        handleClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Register Customer & Sale Contract</h3>
            <p className="text-xs text-indigo-200 mt-0.5">Plot booking master registration with frozen commercial terms (PRD §19)</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center gap-2">
              <span className="font-bold">Success:</span> {successMsg}
            </div>
          )}

          {/* Section 1: Customer Master Information */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 1. Customer Master Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  name="customerContact"
                  required
                  value={formData.customerContact}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  placeholder="Street, City, State, PIN"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Identity KYC Type *</label>
                <select
                  name="identityType"
                  value={formData.identityType}
                  onChange={handleChange}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Identity / Document Number *</label>
                <input
                  type="text"
                  name="identityNumber"
                  required
                  value={formData.identityNumber}
                  onChange={handleChange}
                  placeholder="e.g. 5489-1234-8890"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Property & Land Allocation */}
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 2. Property & Plot Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project / Township Location *</label>
                <input
                  type="text"
                  name="projectLocation"
                  required
                  value={formData.projectLocation}
                  onChange={handleChange}
                  placeholder="e.g. Palm Meadows Phase 2"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Plot Number *</label>
                <input
                  type="text"
                  name="plotNo"
                  required
                  value={formData.plotNo}
                  onChange={handleChange}
                  placeholder="e.g. PM-204"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Khata / Mutation No *</label>
                <input
                  type="text"
                  name="khataNo"
                  required
                  value={formData.khataNo}
                  onChange={handleChange}
                  placeholder="e.g. KH-8849/2026"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Plot Area (Sq. Ft) *</label>
                <input
                  type="number"
                  name="areaSqft"
                  required
                  min="1"
                  step="0.01"
                  value={formData.areaSqft}
                  onChange={handleChange}
                  placeholder="e.g. 2400"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rate per Sq. Ft (₹)</label>
                <input
                  type="number"
                  name="ratePerSqft"
                  min="0"
                  step="0.01"
                  value={formData.ratePerSqft}
                  onChange={handleChange}
                  placeholder="e.g. 1250"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Terms Calculator */}
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 3. Commercial Terms & Pricing Breakdown (₹)
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Land / Base Cost (₹)</label>
                <input
                  type="number"
                  name="landCost"
                  min="0"
                  value={formData.landCost}
                  onChange={handleChange}
                  placeholder={area && rate ? `${area * rate}` : "0"}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-gray-400">Auto: Area × Rate if empty</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Registry / Stamp (₹)</label>
                <input
                  type="number"
                  name="registryCost"
                  min="0"
                  value={formData.registryCost}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Development Charges (₹)</label>
                <input
                  type="number"
                  name="otherCharges"
                  min="0"
                  value={formData.otherCharges}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Taxes / GST (₹)</label>
                <input
                  type="number"
                  name="taxes"
                  min="0"
                  value={formData.taxes}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-600 mb-1">Discount Allowed (₹)</label>
                <input
                  type="number"
                  name="discount"
                  min="0"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full text-sm border border-rose-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-rose-500 bg-rose-50/30"
                />
              </div>
            </div>

            {/* Frozen Total Preview Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Final Frozen Contract Value</span>
                <p className="text-xs text-gray-500 mt-0.5">Calculated once and frozen upon profile submission (PRD §19.3)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700">₹{totalContractValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalContractValue <= 0}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Confirm & Freeze Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
