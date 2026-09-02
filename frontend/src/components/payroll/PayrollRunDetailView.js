"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import {
  getRunById,
  calculateRun,
  getRunItems,
  getRunExceptions,
  approveRun,
  lockRun
} from "@/services/payrollService";
import PayrollItemDetailModal from "./PayrollItemDetailModal";
import PayrollAccountingSection from "./PayrollAccountingSection";
import SalaryDisbursementsSection from "./SalaryDisbursementsSection";
import {
  Calculator,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  Check,
  ShieldCheck,
  Scale,
  Landmark,
  Sparkles,
  Info,
  Search,
  FileSpreadsheet
} from "lucide-react";

export default function PayrollRunDetailView({ id }) {
  const { user } = useAuth();

  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("items"); // "items" or "exceptions"

  // Action states
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [locking, setLocking] = useState(false);

  // Filters for items
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected item modal
  const [selectedItemId, setSelectedItemId] = useState(null);

  const canCalculate = hasPermission(user, "payroll.run.calculate");
  const canApprove = hasPermission(user, "payroll.approve");
  const canLock = hasPermission(user, "payroll.lock");

  const fetchRunData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Run details
      const runRes = await getRunById(id);
      if (runRes.success && runRes.run) {
        setRun(runRes.run);
      } else {
        throw new Error("Payroll Run record not found.");
      }

      // 2. Fetch Run items
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;

      const itemsRes = await getRunItems(id, params);
      if (itemsRes.success && Array.isArray(itemsRes.items)) {
        setItems(itemsRes.items);
      } else {
        setItems([]);
      }

      // 3. Fetch Run exceptions
      const exRes = await getRunExceptions(id);
      if (exRes.success && Array.isArray(exRes.exceptions)) {
        setExceptions(exRes.exceptions);
      } else {
        setExceptions([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load payroll run details");
    } finally {
      setLoading(false);
    }
  }, [id, searchTerm, statusFilter]);

  useEffect(() => {
    fetchRunData();
  }, [fetchRunData]);

  // Actions
  const handleCalculate = async () => {
    if (!canCalculate) return;
    setCalculating(true);
    setError(null);
    try {
      const res = await calculateRun(id);
      setSuccessMsg(res.message || "Batch payroll calculated successfully.");
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchRunData();
    } catch (err) {
      setError(err.message || "Calculation failed");
    } finally {
      setCalculating(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    if (!window.confirm("Are you sure you want to approve this calculated payroll run?")) {
      return;
    }
    setApproving(true);
    setError(null);
    try {
      const res = await approveRun(id);
      setSuccessMsg(res.message || "Payroll Run approved successfully.");
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchRunData();
    } catch (err) {
      setError(err.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleLock = async () => {
    if (!canLock) return;
    if (!window.confirm("WARNING: Locking this payroll run will permanently freeze calculation snapshot values. Continue?")) {
      return;
    }
    setLocking(true);
    setError(null);
    try {
      const res = await lockRun(id);
      setSuccessMsg(res.message || "Payroll Run locked successfully.");
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchRunData();
    } catch (err) {
      setError(err.message || "Lock failed");
    } finally {
      setLocking(false);
    }
  };

  if (loading && !run) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span>Loading payroll calculation run details...</span>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Calculation Run Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
        <Link
          href="/dashboards/payroll/runs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Payroll Runs</span>
        </Link>
      </div>
    );
  }

  const isDraft = run?.status === "DRAFT";
  const isCalculated = run?.status === "CALCULATED";
  const isApproved = run?.status === "APPROVED";
  const isLocked = run?.status === "LOCKED";
  const blockingExceptions = exceptions.filter((e) => e.severity === "BLOCKING");

  const getStatusBadge = (status) => {
    switch (status) {
      case "CALCULATED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOCKED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "DRAFT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboards/payroll/runs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payroll Runs</span>
        </Link>
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
          <button onClick={fetchRunData} className="text-rose-600 hover:text-rose-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-lg flex items-center justify-center font-mono shrink-0">
              #{run?.runNumber}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Payroll Run #{run?.runNumber}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  Period: {run?.payrollPeriod?.year}-{String(run?.payrollPeriod?.month).padStart(2, "0")}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(run?.status)}`}>
                  {run?.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Created on {new Date(run?.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • Batch ID:{" "}
                <span className="font-mono">{run?.id?.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Calculate Button */}
            {canCalculate && (isDraft || isCalculated) && (
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>{isCalculated ? "Recalculate Batch" : "Calculate Payroll"}</span>
                  </>
                )}
              </button>
            )}

            {/* Approve Button */}
            {canApprove && isCalculated && (
              <button
                onClick={handleApprove}
                disabled={approving || blockingExceptions.length > 0}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 ${
                  blockingExceptions.length > 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                title={blockingExceptions.length > 0 ? "Resolve blocking exceptions before approval" : "Approve Run"}
              >
                {approving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Approve Run</span>
              </button>
            )}

            {/* Lock Button */}
            {canLock && isApproved && (
              <button
                onClick={handleLock}
                disabled={locking}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {locking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                <span>Lock Run</span>
              </button>
            )}

            <button
              onClick={fetchRunData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh run"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards (Directly from backend snapshot) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Eligible Staff</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">{run?.totalEmployees ?? 0}</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Gross</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              ₹{Number(run?.totalGross || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Deductions</span>
            <div className="text-xl font-bold text-rose-700 font-mono mt-1">
              -₹{Number(run?.totalDeductions || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Net Payable</span>
            <div className="text-xl font-bold text-emerald-950 font-mono mt-1">
              ₹{Number(run?.totalNet || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">Employer Cost</span>
            <div className="text-xl font-bold text-indigo-950 font-mono mt-1">
              ₹{Number(run?.totalEmployerCost || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "items"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Calculated Payslips ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("exceptions")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "exceptions"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>Exceptions & Warnings</span>
            {exceptions.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  blockingExceptions.length > 0 ? "bg-rose-500 text-white" : "bg-amber-400 text-slate-900"
                }`}
              >
                {exceptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("accounting")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "accounting"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>GL Accrual & Accounting</span>
          </button>
          <button
            onClick={() => setActiveTab("disbursements")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "disbursements"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Treasury & Disbursements</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Calculated Items Table */}
      {activeTab === "items" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name, code, or department..."
                className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              >
                <option value="ALL">All Statuses</option>
                <option value="CALCULATED">Calculated</option>
                <option value="EXCEPTION">Exception</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900">No Calculated Items</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isDraft
                  ? "This run is in DRAFT status. Click 'Calculate Payroll' above to execute batch payroll."
                  : "No employee payroll records match your search filter."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-5 py-3">Employee</th>
                      <th scope="col" className="px-5 py-3">Department</th>
                      <th scope="col" className="px-5 py-3 text-right">Gross Earnings</th>
                      <th scope="col" className="px-5 py-3 text-right">Deductions</th>
                      <th scope="col" className="px-5 py-3 text-right">Net Payable</th>
                      <th scope="col" className="px-5 py-3 text-right">Employer Cost</th>
                      <th scope="col" className="px-5 py-3">Status</th>
                      <th scope="col" className="px-5 py-3 text-right">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{it.employeeNameSnapshot}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{it.employeeCodeSnapshot}</div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">
                          {it.departmentSnapshot}
                          <div className="text-[10px] text-slate-400">{it.designationSnapshot}</div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-800 text-right">
                          ₹{Number(it.grossEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-rose-700 text-right">
                          -₹{Number(it.totalDeductions || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5 font-mono font-bold text-emerald-800 text-right">
                          ₹{Number(it.netPayable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-indigo-950 text-right">
                          ₹{Number(it.employerCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              it.status === "CALCULATED" || it.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {it.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedItemId(it.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition text-[11px] font-semibold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Payslip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {items.map((it) => (
                  <div key={it.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{it.employeeNameSnapshot}</div>
                        <div className="text-[10px] font-mono text-slate-400">{it.employeeCodeSnapshot}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-xs">
                        ₹{Number(it.netPayable || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gross</span>
                        <span className="font-mono">₹{Number(it.grossEarnings || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Deductions</span>
                        <span className="font-mono text-rose-600">-₹{Number(it.totalDeductions || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => setSelectedItemId(it.id)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-indigo-600"
                      >
                        View Payslip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Exceptions View */}
      {activeTab === "exceptions" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Calculation Exceptions & Flagged Records ({exceptions.length})</span>
            </h4>
          </div>

          {blockingExceptions.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Approval Blocked</strong>
                <span>
                  This payroll run contains {blockingExceptions.length} blocking exception(s). You must resolve employee salary assignments or structure errors before approving.
                </span>
              </div>
            </div>
          )}

          {exceptions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <span>Zero exceptions detected. All employee calculations resolved cleanly.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              {exceptions.map((ex) => (
                <div key={ex.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ex.severity === "BLOCKING"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ex.severity || "EXCEPTION"}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">{ex.exceptionType}</span>
                    </div>
                    <p className="text-xs text-slate-700">{ex.message}</p>
                    {ex.employee && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Employee: {ex.employee.fullName} ({ex.employee.employeeCode}) • {ex.employee.department}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(ex.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: GL Accrual & Accounting Section */}
      {activeTab === "accounting" && (
        <PayrollAccountingSection run={run} onStatusChange={fetchRunData} />
      )}

      {/* Tab 4: Treasury & Disbursements Section */}
      {activeTab === "disbursements" && (
        <SalaryDisbursementsSection run={run} onStatusChange={fetchRunData} />
      )}

      {/* Item Detail Payslip Modal */}
      <PayrollItemDetailModal
        isOpen={Boolean(selectedItemId)}
        onClose={() => setSelectedItemId(null)}
        payrollItemId={selectedItemId}
      />
    </div>
  );
}
