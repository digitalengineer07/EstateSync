"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getComponents, updateComponent } from "@/services/payrollService";
import SalaryComponentModal from "./SalaryComponentModal";
import {
  Sliders,
  Search,
  Plus,
  Edit3,
  RefreshCw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Percent,
  Check,
  X,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";

export default function SalaryComponentManager() {
  const { user } = useAuth();

  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const canManage = hasPermission(user, "payroll.component.manage");

  const fetchComponentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (typeFilter !== "ALL") params.componentType = typeFilter;
      if (activeFilter !== "ALL") params.isActive = activeFilter === "true";

      const res = await getComponents(params);
      if (res.success && Array.isArray(res.components)) {
        setComponents(res.components);
      } else {
        setComponents([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary components");
      setComponents([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, activeFilter]);

  useEffect(() => {
    fetchComponentsList();
  }, [fetchComponentsList]);

  // Metrics
  const totalCount = components.length;
  const earningsCount = components.filter((c) => c.componentType === "EARNING" && c.isActive).length;
  const deductionsCount = components.filter((c) => c.componentType === "DEDUCTION" && c.isActive).length;
  const employerContribsCount = components.filter((c) => c.componentType === "EMPLOYER_CONTRIBUTION" && c.isActive).length;

  const handleToggleStatus = async (comp) => {
    if (!canManage) return;
    setTogglingId(comp.id);
    setError(null);
    try {
      await updateComponent(comp.id, { isActive: !comp.isActive });
      setSuccessMsg(`Component "${comp.name}" ${comp.isActive ? "deactivated" : "activated"} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchComponentsList();
    } catch (err) {
      setError(err.message || "Failed to update component status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleModalSuccess = (savedComp) => {
    setSuccessMsg(`Salary Component "${savedComp.name}" saved successfully.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    fetchComponentsList();
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "EARNING":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DEDUCTION":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "EMPLOYER_CONTRIBUTION":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Salary Component Master
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sliders className="w-3.5 h-3.5" />
              Formula Elements
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Configure atomic earning categories, statutory employee deductions, and employer payroll contributions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/dashboards/payroll/structures"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>View Salary Structures</span>
          </Link>

          {canManage && (
            <button
              onClick={() => {
                setComponentToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Component</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Banners */}
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
          <button onClick={fetchComponentsList} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Components</span>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Configured items</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Earnings</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : earningsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Basic, HRA, Allowances</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statutory Deductions</span>
            <Percent className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : deductionsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">PF, ESI, TDS, PT</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employer Contribs</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? "--" : employerContribsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Employer PF / ESI</p>
        </div>
      </div>

      {/* Main Table & Filter Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, name, or description..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Component Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Component Types</option>
              <option value="EARNING">Earnings</option>
              <option value="DEDUCTION">Deductions</option>
              <option value="EMPLOYER_CONTRIBUTION">Employer Contributions</option>
              <option value="REIMBURSEMENT">Reimbursements</option>
            </select>

            {/* Status Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              onClick={fetchComponentsList}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition disabled:opacity-50"
              title="Refresh components"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading salary component rules...</span>
          </div>
        ) : components.length === 0 ? (
          <div className="p-12 text-center">
            <Sliders className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Salary Components Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || typeFilter !== "ALL" || activeFilter !== "ALL"
                ? "No salary components match your search filters. Try resetting filters."
                : "No salary components defined yet in the system."}
            </p>
            {canManage && !searchTerm && (
              <button
                onClick={() => {
                  setComponentToEdit(null);
                  setIsModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Component</span>
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
                    <th scope="col" className="px-5 py-3">Code & Name</th>
                    <th scope="col" className="px-5 py-3">Type</th>
                    <th scope="col" className="px-5 py-3">Calculation Method</th>
                    <th scope="col" className="px-5 py-3">Default Value / %</th>
                    <th scope="col" className="px-5 py-3">GL Account</th>
                    <th scope="col" className="px-5 py-3">Seq / Tax</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {components.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code & Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                            {comp.code?.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{comp.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">{comp.code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(comp.componentType)}`}>
                          {comp.componentType?.replace("_", " ")}
                        </span>
                      </td>

                      {/* Calculation Method */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{comp.calculationMethod}</div>
                        {comp.calculationBase && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Base: <span className="font-mono text-indigo-600 font-semibold">{comp.calculationBase}</span>
                          </div>
                        )}
                      </td>

                      {/* Default Value / % */}
                      <td className="px-5 py-3.5 font-mono text-slate-800">
                        {comp.calculationMethod?.startsWith("PERCENTAGE")
                          ? `${comp.percentageValue}%`
                          : `₹${Number(comp.defaultValue || 0).toLocaleString("en-IN")}`}
                      </td>

                      {/* GL Account */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {comp.glAccountCode || "5060"}
                        </span>
                      </td>

                      {/* Seq & Taxable */}
                      <td className="px-5 py-3.5">
                        <div className="text-[11px] text-slate-600">Seq: #{comp.sequence}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {comp.isTaxable ? <span className="text-amber-600 font-semibold">Taxable</span> : "Exempt"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            comp.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {comp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              onClick={() => {
                                setComponentToEdit(comp);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
                              title="Edit Component"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => handleToggleStatus(comp)}
                              disabled={togglingId === comp.id}
                              className={`p-1.5 rounded-lg border transition ${
                                comp.isActive
                                  ? "border-rose-200 hover:bg-rose-50 text-rose-600"
                                  : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                              }`}
                              title={comp.isActive ? "Deactivate Component" : "Activate Component"}
                            >
                              {comp.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
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
              {components.map((comp) => (
                <div key={comp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{comp.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{comp.code}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getTypeBadgeClass(comp.componentType)}`}>
                      {comp.componentType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Method</span>
                      <span className="font-semibold">{comp.calculationMethod}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Value / Rate</span>
                      <span className="font-mono">
                        {comp.calculationMethod?.startsWith("PERCENTAGE") ? `${comp.percentageValue}%` : `₹${comp.defaultValue}`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">GL: {comp.glAccountCode || "5060"}</span>
                    {canManage && (
                      <button
                        onClick={() => {
                          setComponentToEdit(comp);
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <SalaryComponentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        componentToEdit={componentToEdit}
        existingComponents={components}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
