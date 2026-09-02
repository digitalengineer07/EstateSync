"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getStructures, archiveStructure } from "@/services/payrollService";
import SalaryStructureBuilderModal from "./SalaryStructureBuilderModal";
import {
  FileSpreadsheet,
  Search,
  Plus,
  Eye,
  Archive,
  RefreshCw,
  Layers,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Calendar,
  Users,
  X,
  Building
} from "lucide-react";

export default function SalaryStructureList() {
  const { user } = useAuth();

  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedStructureForView, setSelectedStructureForView] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  const canCreate = hasPermission(user, "payroll.structure.create");
  const canArchive = hasPermission(user, "payroll.structure.archive");

  const fetchStructuresList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await getStructures(params);
      if (res.success && Array.isArray(res.structures)) {
        setStructures(res.structures);
      } else {
        setStructures([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary structures");
      setStructures([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchStructuresList();
  }, [fetchStructuresList]);

  // Metrics
  const totalCount = structures.length;
  const activeCount = structures.filter((s) => s.status === "ACTIVE").length;
  const archivedCount = structures.filter((s) => s.status === "ARCHIVED").length;

  const handleArchive = async (structure) => {
    if (!canArchive) return;
    if (!window.confirm(`Are you sure you want to archive salary structure "${structure.name}"?`)) {
      return;
    }

    setArchivingId(structure.id);
    setError(null);
    try {
      await archiveStructure(structure.id);
      setSuccessMsg(`Salary Structure "${structure.name}" has been archived.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchStructuresList();
    } catch (err) {
      setError(err.message || "Failed to archive salary structure");
    } finally {
      setArchivingId(null);
    }
  };

  const handleBuilderSuccess = (newStruct) => {
    setSuccessMsg(`Salary Structure "${newStruct.name}" created successfully.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    fetchStructuresList();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Salary Structure Templates
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Compensation Schemes
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Build standardized compensation templates, sequence component calculations, and map to employee grades.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboards/payroll/components"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Manage Components</span>
          </Link>

          {canCreate && (
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Structure</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchStructuresList} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Templates</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Defined salary structures</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Templates</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : activeCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Available for employee assignment</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived Templates</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : archivedCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Deactivated compensation plans</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, template name, description..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <button
              onClick={fetchStructuresList}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
              title="Refresh structures"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading salary structures...</span>
          </div>
        ) : structures.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Salary Structures Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL"
                ? "No salary structures match your filters. Try resetting search."
                : "No salary structures configured yet."}
            </p>
            {canCreate && !searchTerm && (
              <button
                onClick={() => setIsBuilderOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Structure</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-5 py-3">Structure Template</th>
                    <th scope="col" className="px-5 py-3">Components</th>
                    <th scope="col" className="px-5 py-3">Assigned Staff</th>
                    <th scope="col" className="px-5 py-3">Effective Date</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {structures.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Code */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                            {s.code?.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">{s.code}</div>
                            {s.description && (
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{s.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Component Count */}
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {s.lines?.length || 0} Components
                        </span>
                      </td>

                      {/* Assigned Staff */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s._count?.assignments || 0} Staff</span>
                        </div>
                      </td>

                      {/* Effective Date */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {s.effectiveFrom
                              ? new Date(s.effectiveFrom).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "--"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStructureForView(s)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition"
                            title="View Itemized Components"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canArchive && s.status === "ACTIVE" && (
                            <button
                              onClick={() => handleArchive(s)}
                              disabled={archivingId === s.id}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              title="Archive Structure"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {structures.map((s) => (
                <div key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.code}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lines</span>
                      <span className="font-semibold">{s.lines?.length || 0} Components</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assigned Staff</span>
                      <span className="font-semibold">{s._count?.assignments || 0}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedStructureForView(s)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-indigo-600"
                    >
                      View Lines
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Structure Builder Modal */}
      <SalaryStructureBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={handleBuilderSuccess}
      />

      {/* Structure Inspector View Modal */}
      {selectedStructureForView && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedStructureForView.name}</h3>
                  <div className="text-xs font-mono text-slate-500">{selectedStructureForView.code}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStructureForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-xs text-slate-600 flex flex-wrap gap-4 pb-3 border-b border-slate-100">
                <span>
                  Status: <strong className="text-slate-900">{selectedStructureForView.status}</strong>
                </span>
                <span>
                  Effective:{" "}
                  <strong className="text-slate-900">
                    {new Date(selectedStructureForView.effectiveFrom).toISOString().slice(0, 10)}
                  </strong>
                </span>
                <span>
                  Active Assignments:{" "}
                  <strong className="text-slate-900">{selectedStructureForView._count?.assignments || 0} Staff</strong>
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Seq</th>
                      <th className="px-4 py-2.5">Component</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Rate / Amount</th>
                      <th className="px-4 py-2.5">GL Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedStructureForView.lines?.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2.5 font-mono text-slate-500">#{line.sequence}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900">{line.component?.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{line.component?.code}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {line.component?.componentType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{line.calculationMethod}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                          {line.calculationMethod?.startsWith("PERCENTAGE")
                            ? `${line.percentage}%`
                            : `₹${Number(line.value || 0).toLocaleString("en-IN")}`}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{line.component?.glAccountCode || "5060"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
              <button
                onClick={() => setSelectedStructureForView(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
