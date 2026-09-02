"use client";

import { useState, useEffect } from "react";
import { createComponent, updateComponent } from "@/services/payrollService";
import { X, Sliders, Edit3, Plus, AlertTriangle, Loader2, Scale, Info } from "lucide-react";

const COMPONENT_TYPES = [
  { value: "EARNING", label: "Earning", color: "emerald", desc: "Base salary, HRA, allowances, incentives" },
  { value: "DEDUCTION", label: "Statutory Deduction", color: "rose", desc: "PF employee, ESI employee, TDS, Professional Tax" },
  { value: "EMPLOYER_CONTRIBUTION", label: "Employer Contribution", color: "indigo", desc: "Employer PF, Employer ESI" },
  { value: "REIMBURSEMENT", label: "Reimbursement", color: "amber", desc: "Travel, medical, telephone claims" }
];

const CALCULATION_METHODS = [
  { value: "FIXED_AMOUNT", label: "Fixed Amount (₹)" },
  { value: "PERCENTAGE_OF_BASIC", label: "Percentage of Basic (%)" },
  { value: "PERCENTAGE_OF_GROSS", label: "Percentage of Gross (%)" },
  { value: "PERCENTAGE_OF_COMPONENT", label: "Percentage of Other Component (%)" },
  { value: "MANUAL_AMOUNT", label: "Manual Ad-Hoc Amount" }
];

export default function SalaryComponentModal({
  isOpen,
  onClose,
  componentToEdit = null,
  existingComponents = [],
  onSuccess
}) {
  const isEditing = Boolean(componentToEdit);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    componentType: "EARNING",
    calculationMethod: "FIXED_AMOUNT",
    calculationBase: "",
    defaultValue: "0",
    percentageValue: "0",
    sequence: "1",
    isTaxable: true,
    isRecurring: true,
    isActive: true,
    glAccountCode: "5060"
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (componentToEdit) {
      setFormData({
        code: componentToEdit.code || "",
        name: componentToEdit.name || "",
        description: componentToEdit.description || "",
        componentType: componentToEdit.componentType || "EARNING",
        calculationMethod: componentToEdit.calculationMethod || "FIXED_AMOUNT",
        calculationBase: componentToEdit.calculationBase || "",
        defaultValue: String(componentToEdit.defaultValue ?? 0),
        percentageValue: String(componentToEdit.percentageValue ?? 0),
        sequence: String(componentToEdit.sequence ?? 1),
        isTaxable: componentToEdit.isTaxable !== false,
        isRecurring: componentToEdit.isRecurring !== false,
        isActive: componentToEdit.isActive !== false,
        glAccountCode: componentToEdit.glAccountCode || ""
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        componentType: "EARNING",
        calculationMethod: "FIXED_AMOUNT",
        calculationBase: "",
        defaultValue: "0",
        percentageValue: "0",
        sequence: String(existingComponents.length + 1),
        isTaxable: true,
        isRecurring: true,
        isActive: true,
        glAccountCode: "5060"
      });
    }
    setError(null);
  }, [componentToEdit, isOpen, existingComponents.length]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };

      // Default GL code suggestions based on component type
      if (name === "componentType" && !isEditing) {
        if (value === "EARNING") updated.glAccountCode = "5060";
        else if (value === "DEDUCTION") updated.glAccountCode = "2020";
        else if (value === "EMPLOYER_CONTRIBUTION") updated.glAccountCode = "5070";
        else if (value === "REIMBURSEMENT") updated.glAccountCode = "5040";
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Component Name is required.");
      return;
    }
    if (!isEditing && !formData.code.trim()) {
      setError("Component Code is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        componentType: formData.componentType,
        calculationMethod: formData.calculationMethod,
        calculationBase: formData.calculationBase ? formData.calculationBase.trim().toUpperCase() : null,
        defaultValue: Number(formData.defaultValue) || 0,
        percentageValue: Number(formData.percentageValue) || 0,
        sequence: parseInt(formData.sequence, 10) || 1,
        isTaxable: Boolean(formData.isTaxable),
        isRecurring: Boolean(formData.isRecurring),
        isActive: Boolean(formData.isActive),
        glAccountCode: formData.glAccountCode.trim() || null
      };

      let result;
      if (isEditing) {
        result = await updateComponent(componentToEdit.id, payload);
      } else {
        payload.code = formData.code.trim().toUpperCase();
        result = await createComponent(payload);
      }

      if (onSuccess) onSuccess(result.component);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save salary component");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Component (${componentToEdit?.code})` : "Create Salary Component"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? "Update component calculation method and GL mapping" : "Define an earning, statutory deduction, or employer contribution rule"}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Component Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Component Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={isEditing}
                placeholder="e.g. BASIC, HRA, PF_EE, TDS"
                className={`w-full text-xs px-3 py-2 rounded-lg border uppercase font-mono transition ${
                  isEditing
                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                }`}
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Unique uppercase identifier (immutable)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Basic Salary, House Rent Allowance"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. Statutory employee Provident Fund deduction at 12%"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Component Type & Calculation Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Component Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="componentType"
                value={formData.componentType}
                onChange={handleChange}
                disabled={isEditing}
                className={`w-full text-xs px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition ${
                  isEditing ? "bg-slate-100 cursor-not-allowed" : "border-slate-200"
                }`}
              >
                {COMPONENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculation Method <span className="text-rose-500">*</span>
              </label>
              <select
                name="calculationMethod"
                value={formData.calculationMethod}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                {CALCULATION_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Values based on calculation method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {formData.calculationMethod.startsWith("PERCENTAGE") ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Percentage Value (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="percentageValue"
                  value={formData.percentageValue}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Fixed Amount (₹)</label>
                <input
                  type="number"
                  name="defaultValue"
                  value={formData.defaultValue}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>
            )}

            {formData.calculationMethod === "PERCENTAGE_OF_COMPONENT" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calculation Base Component</label>
                <select
                  name="calculationBase"
                  value={formData.calculationBase}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition uppercase font-mono"
                >
                  <option value="">-- Select Base Component --</option>
                  {existingComponents
                    .filter((c) => !isEditing || c.id !== componentToEdit?.id)
                    .map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sequence / Calculation Order</label>
              <input
                type="number"
                name="sequence"
                value={formData.sequence}
                onChange={handleChange}
                min="1"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">Lower sequence items evaluate first (e.g. Basic = 1)</p>
            </div>
          </div>

          {/* GL Mapping & Accounting */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>General Ledger Mapping Metadata</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GL Control Account Code <span className="text-slate-400 font-normal">(e.g. 5060, 2020, 2025, 2030)</span>
              </label>
              <input
                type="text"
                name="glAccountCode"
                value={formData.glAccountCode}
                onChange={handleChange}
                placeholder="e.g. 5060 (Salaries Expense), 2020 (PF Payable)"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Flags & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="isTaxable"
                checked={formData.isTaxable}
                onChange={handleChange}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="font-semibold text-slate-800">Taxable Component</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="font-semibold text-slate-800">Recurring Monthly</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="font-semibold text-emerald-800">Active Status</span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? "Save Changes" : "Create Component"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
