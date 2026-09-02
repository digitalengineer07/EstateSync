"use client";

import { useState, useEffect } from "react";
import { createSalaryAssignment } from "@/services/employeeService";
import { getStructures } from "@/services/payrollService";
import { X, Layers, AlertTriangle, CheckCircle2, Loader2, Calendar, FileSpreadsheet } from "lucide-react";

export default function SalaryAssignmentModal({
  isOpen,
  onClose,
  employee,
  onSuccess
}) {
  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    salaryStructureId: "",
    baseGross: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    reason: "New Assignment",
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      const fetchStructuresList = async () => {
        setLoadingStructures(true);
        setError(null);
        try {
          const res = await getStructures();
          if (res.success && Array.isArray(res.structures)) {
            // Filter to only ACTIVE structures
            setStructures(res.structures.filter((s) => s.status === "ACTIVE"));
          }
        } catch (err) {
          setError("Failed to load salary structures: " + err.message);
        } finally {
          setLoadingStructures(false);
        }
      };
      fetchStructuresList();

      setFormData({
        salaryStructureId: "",
        baseGross: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
        reason: "New Assignment",
        notes: ""
      });
    }
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  const selectedStructure = structures.find((s) => s.id === formData.salaryStructureId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.salaryStructureId) {
      setError("Please select a Salary Structure to assign.");
      return;
    }
    if (!formData.effectiveFrom) {
      setError("Effective From date is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        salaryStructureId: formData.salaryStructureId,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        reason: formData.reason.trim() || "Structure Revision",
        notes: formData.notes.trim() || null
      };

      if (formData.baseGross && Number(formData.baseGross) > 0) {
        payload.baseGross = Number(formData.baseGross);
      }

      const result = await createSalaryAssignment(employee.id, payload);
      if (onSuccess) onSuccess(result.assignment);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to assign salary structure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Salary Structure</h3>
              <p className="text-xs text-slate-500">Effective-dated compensation assignment</p>
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

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="font-bold text-slate-900">{employee.fullName}</div>
            <div className="text-slate-500 mt-0.5">
              Code: <span className="font-mono text-slate-700">{employee.employeeCode}</span> • {employee.designation} ({employee.department})
            </div>
          </div>

          {/* Structure Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Salary Structure <span className="text-rose-500">*</span>
            </label>
            {loadingStructures ? (
              <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading active structures...</span>
              </div>
            ) : (
              <select
                name="salaryStructureId"
                value={formData.salaryStructureId}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                required
              >
                <option value="">-- Select Structure Template --</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.lines?.length || 0} Components
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Structure Line Component Preview */}
          {selectedStructure && selectedStructure.lines && selectedStructure.lines.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-2">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Structure Components: {selectedStructure.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedStructure.lines.map((line) => (
                  <span
                    key={line.id}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-indigo-200 text-indigo-800"
                  >
                    {line.component?.name || line.component?.code} ({line.calculationMethod})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Base Gross Salary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Base Monthly Gross Salary (₹) <span className="text-slate-400 font-normal">(Optional reference amount)</span>
            </label>
            <input
              type="number"
              name="baseGross"
              value={formData.baseGross}
              onChange={handleChange}
              placeholder="e.g. 50000"
              min="0"
              step="0.01"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="effectiveFrom"
                value={formData.effectiveFrom}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Effective To Date (Optional)</label>
              <input
                type="date"
                name="effectiveTo"
                value={formData.effectiveTo}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Reason & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Reason</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g. Initial Onboarding, Annual Appraisal, Role Revision"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Optional administrative remarks"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          {/* Effective-Date Notice */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              This salary structure will become active starting from{" "}
              <strong className="text-slate-900">{formData.effectiveFrom || "[date]"}</strong>. Any existing active assignment will be superseded.
            </span>
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
            disabled={submitting || loadingStructures}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <span>Confirm Assignment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
