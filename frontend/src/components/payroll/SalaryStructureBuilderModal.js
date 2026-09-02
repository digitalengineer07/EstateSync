"use client";

import { useState, useEffect } from "react";
import { getComponents, createStructure } from "@/services/payrollService";
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Scale,
  Layers,
  Calendar,
  Sparkles,
  Info
} from "lucide-react";

export default function SalaryStructureBuilderModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [availableComponents, setAvailableComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [headerData, setHeaderData] = useState({
    code: "",
    name: "",
    description: "",
    effectiveFrom: new Date().toISOString().split("T")[0]
  });

  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchComponents = async () => {
        setLoadingComponents(true);
        setError(null);
        try {
          const res = await getComponents({ isActive: true });
          if (res.success && Array.isArray(res.components)) {
            setAvailableComponents(res.components);
          }
        } catch (err) {
          setError("Failed to load active components: " + err.message);
        } finally {
          setLoadingComponents(false);
        }
      };
      fetchComponents();

      setHeaderData({
        code: "",
        name: "",
        description: "",
        effectiveFrom: new Date().toISOString().split("T")[0]
      });
      setLines([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLine = (componentId) => {
    if (!componentId) return;

    // Check duplicate
    if (lines.some((l) => l.componentId === componentId)) {
      setError("This component has already been added to the structure.");
      return;
    }

    const comp = availableComponents.find((c) => c.id === componentId);
    if (!comp) return;

    setError(null);
    setLines((prev) => [
      ...prev,
      {
        componentId: comp.id,
        component: comp,
        calculationMethod: comp.calculationMethod,
        calculationBase: comp.calculationBase || "",
        value: comp.defaultValue ?? 0,
        percentage: comp.percentageValue ?? 0,
        sequence: prev.length + 1,
        isMandatory: true
      }
    ]);
  };

  const handleRemoveLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!headerData.code.trim() || !headerData.name.trim()) {
      setError("Structure Code and Structure Name are compulsory.");
      return;
    }
    if (lines.length === 0) {
      setError("A Salary Structure must contain at least one Salary Component line item.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        code: headerData.code.trim().toUpperCase(),
        name: headerData.name.trim(),
        description: headerData.description.trim() || null,
        effectiveFrom: headerData.effectiveFrom,
        currency: "INR",
        lines: lines.map((l, idx) => ({
          componentId: l.componentId,
          calculationMethod: l.calculationMethod,
          calculationBase: l.calculationBase ? l.calculationBase.trim().toUpperCase() : null,
          value: Number(l.value) || 0,
          percentage: Number(l.percentage) || 0,
          sequence: parseInt(l.sequence, 10) || idx + 1,
          isMandatory: Boolean(l.isMandatory)
        }))
      };

      const result = await createStructure(payload);
      if (onSuccess) onSuccess(result.structure);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create salary structure");
    } finally {
      setSubmitting(false);
    }
  };

  const unusedComponents = availableComponents.filter(
    (comp) => !lines.some((l) => l.componentId === comp.id)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Salary Structure Builder</h3>
              <p className="text-xs text-slate-500">Configure template lines, formula dependencies, and sequence rules</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Structure Header Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Structure Template Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Structure Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={headerData.code}
                  onChange={handleHeaderChange}
                  placeholder="e.g. STR_EXEC_V1, STAFF_STD_V2"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Structure Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={headerData.name}
                  onChange={handleHeaderChange}
                  placeholder="e.g. Executive Leadership Compensation Template"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={headerData.description}
                  onChange={handleHeaderChange}
                  placeholder="e.g. Full-time management grade staff with standard statutory benefits"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Effective From <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={headerData.effectiveFrom}
                  onChange={handleHeaderChange}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Component Line Item Configurator */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Itemized Structure Lines ({lines.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Attach salary components, specify evaluation sequence order, and override calculation rates.
                </p>
              </div>

              {/* Add Component Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    handleAddLine(e.target.value);
                    e.target.value = "";
                  }}
                  disabled={loadingComponents || unusedComponents.length === 0}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {loadingComponents
                      ? "Loading components..."
                      : unusedComponents.length === 0
                      ? "All components attached"
                      : "+ Attach Salary Component"}
                  </option>
                  {unusedComponents.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} ({comp.code}) - {comp.componentType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No Component Lines Attached</div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Select a salary component from the dropdown above to add earnings, deductions, or employer contributions to this structure.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Seq</th>
                      <th className="px-4 py-2.5">Component & Type</th>
                      <th className="px-4 py-2.5">Calculation Method</th>
                      <th className="px-4 py-2.5">Rate / Amount</th>
                      <th className="px-4 py-2.5">GL Mapping</th>
                      <th className="px-4 py-2.5 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={line.componentId} className="hover:bg-slate-50/50">
                        {/* Sequence */}
                        <td className="px-4 py-2.5 w-16">
                          <input
                            type="number"
                            value={line.sequence}
                            onChange={(e) => handleLineChange(idx, "sequence", e.target.value)}
                            min="1"
                            className="w-12 text-xs px-2 py-1 rounded border border-slate-200 font-mono text-center"
                          />
                        </td>

                        {/* Component Name & Code */}
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900">{line.component.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {line.component.code} •{" "}
                            <span className="font-sans font-semibold text-slate-600">
                              {line.component.componentType}
                            </span>
                          </div>
                        </td>

                        {/* Method */}
                        <td className="px-4 py-2.5">
                          <select
                            value={line.calculationMethod}
                            onChange={(e) => handleLineChange(idx, "calculationMethod", e.target.value)}
                            className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
                          >
                            <option value="FIXED_AMOUNT">Fixed Amount</option>
                            <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                            <option value="PERCENTAGE_OF_GROSS">% of Gross</option>
                            <option value="PERCENTAGE_OF_COMPONENT">% of Component</option>
                            <option value="MANUAL_AMOUNT">Manual Ad-Hoc</option>
                          </select>
                        </td>

                        {/* Value / Percentage */}
                        <td className="px-4 py-2.5">
                          {line.calculationMethod.startsWith("PERCENTAGE") ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={line.percentage}
                                onChange={(e) => handleLineChange(idx, "percentage", e.target.value)}
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-16 text-xs px-2 py-1 rounded border border-slate-200 font-mono"
                              />
                              <span className="text-slate-400 font-semibold">%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={line.value}
                                onChange={(e) => handleLineChange(idx, "value", e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-20 text-xs px-2 py-1 rounded border border-slate-200 font-mono"
                              />
                            </div>
                          )}
                        </td>

                        {/* GL Mapping */}
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                          {line.component.glAccountCode || "5060"}
                        </td>

                        {/* Remove */}
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            title="Remove Line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            disabled={submitting || lines.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating Structure...</span>
              </>
            ) : (
              <span>Create Structure Template</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
