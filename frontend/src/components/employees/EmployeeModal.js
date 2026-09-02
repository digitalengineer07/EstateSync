"use client";

import { useState, useEffect } from "react";
import { createEmployee, updateEmployee, updateSalaryConfig } from "@/services/employeeService";
import { X, UserPlus, Edit3, AlertTriangle, CheckCircle2, Loader2, IndianRupee } from "lucide-react";

export default function EmployeeModal({
  isOpen,
  onClose,
  employeeToEdit = null,
  managersList = [],
  onSuccess
}) {
  const isEditing = Boolean(employeeToEdit);

  const [formData, setFormData] = useState({
    employeeCode: "",
    fullName: "",
    displayName: "",
    mobile: "",
    alternatePhone: "",
    email: "",
    address: "",
    department: "",
    designation: "",
    employmentType: "FULL_TIME",
    joiningDate: new Date().toISOString().split("T")[0],
    confirmationDate: "",
    reportingManagerId: "",
    workLocation: "Head Office",
    baseSalary: "",
    bankName: "",
    bankAccountNo: "",
    ifscCode: "",
    upiId: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        employeeCode: employeeToEdit.employeeCode || "",
        fullName: employeeToEdit.fullName || "",
        displayName: employeeToEdit.displayName || "",
        mobile: employeeToEdit.mobile || "",
        alternatePhone: employeeToEdit.alternatePhone || "",
        email: employeeToEdit.email || "",
        address: employeeToEdit.address || "",
        department: employeeToEdit.department || "",
        designation: employeeToEdit.designation || "",
        employmentType: employeeToEdit.employmentType || "FULL_TIME",
        joiningDate: employeeToEdit.joiningDate
          ? new Date(employeeToEdit.joiningDate).toISOString().split("T")[0]
          : "",
        confirmationDate: employeeToEdit.confirmationDate
          ? new Date(employeeToEdit.confirmationDate).toISOString().split("T")[0]
          : "",
        reportingManagerId: employeeToEdit.reportingManagerId || "",
        workLocation: employeeToEdit.workLocation || "Head Office",
        baseSalary: employeeToEdit.baseSalary || "",
        bankName: employeeToEdit.bankName || "",
        bankAccountNo: employeeToEdit.bankAccountNo || "",
        ifscCode: employeeToEdit.ifscCode || "",
        upiId: employeeToEdit.upiId || ""
      });
    } else {
      setFormData({
        employeeCode: "",
        fullName: "",
        displayName: "",
        mobile: "",
        alternatePhone: "",
        email: "",
        address: "",
        department: "",
        designation: "",
        employmentType: "FULL_TIME",
        joiningDate: new Date().toISOString().split("T")[0],
        confirmationDate: "",
        reportingManagerId: "",
        workLocation: "Head Office",
        baseSalary: "",
        bankName: "",
        bankAccountNo: "",
        ifscCode: "",
        upiId: ""
      });
    }
    setError(null);
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Basic Frontend Validations
      if (!formData.fullName.trim()) throw new Error("Full Name is required.");
      if (!formData.mobile.trim()) throw new Error("Mobile number is required.");
      if (!formData.department.trim()) throw new Error("Department is required.");
      if (!formData.designation.trim()) throw new Error("Designation is required.");
      if (!formData.joiningDate) throw new Error("Joining Date is required.");

      const payload = {
        ...formData,
        fullName: formData.fullName.trim(),
        displayName: formData.displayName.trim() || formData.fullName.trim(),
        mobile: formData.mobile.trim(),
        alternatePhone: formData.alternatePhone.trim() || null,
        email: formData.email.trim() ? formData.email.trim().toLowerCase() : null,
        address: formData.address.trim() || null,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        workLocation: formData.workLocation.trim() || "Head Office",
        reportingManagerId: formData.reportingManagerId || null,
        confirmationDate: formData.confirmationDate || null
      };

      let result;
      if (isEditing) {
        // Exclude immutable code on update
        delete payload.employeeCode;
        result = await updateEmployee(employeeToEdit.id, payload);
        if (formData.baseSalary !== undefined && formData.baseSalary !== "") {
          await updateSalaryConfig(employeeToEdit.id, {
            baseSalary: parseFloat(formData.baseSalary) || 0,
            bankName: formData.bankName?.trim() || null,
            bankAccountNo: formData.bankAccountNo?.trim() || null,
            ifscCode: formData.ifscCode?.trim().toUpperCase() || null,
            upiId: formData.upiId?.trim() || null
          });
        }
      } else {
        if (!payload.employeeCode) delete payload.employeeCode;
        result = await createEmployee(payload);
      }

      if (onSuccess) onSuccess(result.employee);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save employee record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Employee (${employeeToEdit?.employeeCode})` : "Register New Employee"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? "Update employment details and designations" : "Add a new staff member to the organization directory"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Identification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Personal Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display / Preferred Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="e.g. Johnny"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  placeholder="Optional alternate contact"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. employee@company.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Street address, city, pin code"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>

          {/* Organizational Employment Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Employment & Designation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Code <span className="text-slate-400 font-normal">(Auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    name="employeeCode"
                    value={formData.employeeCode}
                    onChange={handleChange}
                    placeholder="e.g. EMP-000001"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition uppercase"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Sales, Accounts, Engineering"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Senior Accountant"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Joining Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmation Date <span className="text-[10px] text-slate-400 font-normal">(Optional — Probation End)</span>
                </label>
                <input
                  type="date"
                  name="confirmationDate"
                  value={formData.confirmationDate}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Location</label>
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  placeholder="e.g. Head Office, Site Office"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  name="reportingManagerId"
                  value={formData.reportingManagerId}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                >
                  <option value="">-- No Reporting Manager --</option>
                  {managersList
                    .filter((m) => !isEditing || m.id !== employeeToEdit?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.employeeCode}) - {m.designation}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Compensation & Banking Details */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
              <span>Compensation & Banking Details (Optional)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Base Salary (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    name="baseSalary"
                    value={formData.baseSalary || ""}
                    onChange={handleChange}
                    placeholder="e.g. 50000"
                    className="w-full text-xs pl-7 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName || ""}
                  onChange={handleChange}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  name="bankAccountNo"
                  value={formData.bankAccountNo || ""}
                  onChange={handleChange}
                  placeholder="e.g. 50100234567890"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? "Save Changes" : "Register Employee"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
