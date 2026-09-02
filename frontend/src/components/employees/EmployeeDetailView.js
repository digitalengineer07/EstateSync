"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getEmployeeById, getSalaryPayments } from "@/services/employeeService";
import EmployeeModal from "./EmployeeModal";
import EmployeeArchiveModal from "./EmployeeArchiveModal";
import EmployeeLinkUserModal from "./EmployeeLinkUserModal";
import EditSalaryModal from "./EditSalaryModal";
import PaySalaryModal from "./PaySalaryModal";
import {
  Users,
  ArrowLeft,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
  UserX,
  Edit3,
  Link2,
  Unlink,
  Briefcase,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  IndianRupee,
  Landmark,
  Send,
  Clock
} from "lucide-react";

export default function EmployeeDetailView({ id }) {
  const router = useRouter();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "account"
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const canUpdate = hasPermission(user, "employee.update");
  const canArchive = hasPermission(user, "employee.archive");
  const canViewSalary = ["ADMIN", "ACCOUNTING", "MANAGER"].includes(user?.role);
  const canEditSalary = user?.role === "ADMIN";
  const canPaySalary = ["ADMIN", "ACCOUNTING"].includes(user?.role);

  const [isSalaryEditOpen, setIsSalaryEditOpen] = useState(false);
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchSalaryHistory = useCallback(async () => {
    if (!id || !canViewSalary) return;
    setLoadingPayments(true);
    try {
      const res = await getSalaryPayments(id);
      if (res.success) {
        setSalaryPayments(res.payments || []);
      }
    } catch (err) {
      console.error("Failed to load salary payments:", err);
    } finally {
      setLoadingPayments(false);
    }
  }, [id, canViewSalary]);

  useEffect(() => {
    if (activeTab === "salary") {
      fetchSalaryHistory();
    }
  }, [activeTab, fetchSalaryHistory]);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getEmployeeById(id);
      if (res.success && res.employee) {
        setEmployee(res.employee);
      } else {
        throw new Error("Employee record not found.");
      }
    } catch (err) {
      setError(err.message || "Failed to load employee profile");
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleActionSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span>Loading employee profile...</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Employee Record Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || "The requested employee profile does not exist."}</p>
        <Link
          href="/dashboards/employees"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Employee Directory</span>
        </Link>
      </div>
    );
  }

  const isArchived = ["ARCHIVED", "RESIGNED", "TERMINATED"].includes(employee.status);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboards/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </Link>
      </div>

      {/* Success Notification */}
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

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-xs shrink-0">
              {employee.fullName?.charAt(0)?.toUpperCase() || "E"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{employee.fullName}</h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  {employee.employeeCode}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    employee.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : isArchived
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">{employee.designation}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {employee.department}
                </span>
                <span>•</span>
                <span>{employee.workLocation || "Head Office"}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {canUpdate && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </button>
            )}

            {canUpdate && (
              <button
                onClick={() => setIsLinkOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  employee.userId
                    ? "border-rose-200 hover:bg-rose-50 text-rose-700"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {employee.userId ? (
                  <>
                    <Unlink className="w-3.5 h-3.5 text-rose-500" />
                    <span>Unlink Account</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Link Login User</span>
                  </>
                )}
              </button>
            )}

            {canArchive && !isArchived && (
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700 transition"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Employment Overview
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "account"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            System Login Account
          </button>
          {canViewSalary && (
            <button
              onClick={() => setActiveTab("salary")}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "salary"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50"
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Salary & Payouts</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal & Contact Details */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Contact & Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Primary Mobile</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">{employee.mobile}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Alternate Phone</span>
                <span className="font-mono text-slate-700 mt-0.5 block">{employee.alternatePhone || "--"}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{employee.email || "No email on record"}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[11px]">Residential Address</span>
                <span className="text-slate-700 mt-0.5 block">{employee.address || "No address provided"}</span>
              </div>
            </div>
          </div>

          {/* Employment Timeline & Hierarchy */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Employment Timeline & Hierarchy</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Employment Type</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.employmentType?.replace("_", " ")}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Work Location</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{employee.workLocation || "Head Office"}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Joining Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.joiningDate
                    ? new Date(employee.joiningDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "--"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Confirmation Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {employee.confirmationDate
                    ? new Date(employee.confirmationDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "Pending"}
                </span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[11px]">Reporting Manager</span>
                {employee.reportingManager ? (
                  <div className="mt-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{employee.reportingManager.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {employee.reportingManager.employeeCode} • {employee.reportingManager.designation}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 italic mt-0.5 block">No reporting manager assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Account & Wallet */}
      {activeTab === "account" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>System Login Account Credentials</span>
          </h3>

          {employee.user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{employee.user.name}</div>
                    <div className="text-xs font-mono text-slate-500">{employee.user.email}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Role: {employee.user.role?.name || "STAFF"}
                  </span>
                </div>

                {employee.user.wallet && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Corporate Liquid Balance</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{Number(employee.user.wallet.availableBalanceLiquid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Corporate Cash Balance</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{Number(employee.user.wallet.availableBalanceCash || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {canUpdate && (
                <button
                  onClick={() => setIsLinkOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700 transition flex items-center gap-1.5"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink Login Account</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-900">No Login Account Linked</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This employee operates as a non-login staff member. Linking an account grants dashboard login credentials and wallet allocations.
              </p>
              {canUpdate && (
                <button
                  onClick={() => setIsLinkOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link Existing System User</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Salary & Treasury Disbursements */}
      {activeTab === "salary" && canViewSalary && (
        <div className="space-y-6">
          {/* Top Row: Salary & Banking Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Monthly Base Compensation */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Monthly Base Salary
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 mt-3 font-sans">
                  ₹{Number(employee.baseSalary || 0).toLocaleString("en-IN")}
                  <span className="text-xs font-medium text-slate-400 ml-1.5 font-normal">/ month</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Configured baseline monthly compensation.
                </p>
              </div>

              {canEditSalary && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsSalaryEditOpen(true)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Salary & Banking Details</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Beneficiary Banking Information */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Beneficiary Account
                </span>
                <Landmark className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Bank Name</span>
                  <span className="font-semibold text-slate-800">{employee.bankName || "Not configured"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Account Number</span>
                  <span className="font-mono font-semibold text-slate-800">{employee.bankAccountNo || "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">IFSC Code</span>
                  <span className="font-mono font-semibold text-slate-800">{employee.ifscCode || "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">UPI ID</span>
                  <span className="font-mono font-semibold text-slate-800">{employee.upiId || "—"}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Treasury Payout Action */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Corporate Treasury
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-3">
                  Direct Salary Payout
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Disburse monthly salary directly from Primary Corporate Treasury Wallet (`1010`) with automated General Ledger double-entry posting.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                {canPaySalary ? (
                  <button
                    onClick={() => setIsPaySalaryOpen(true)}
                    disabled={!employee.baseSalary || employee.baseSalary <= 0 || employee.status !== "ACTIVE"}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pay Monthly Salary</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-center font-medium">
                    Read-Only View • Payout authorization held by Admin & Accounting
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Table: Disbursement History */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Salary Disbursement History</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological record of corporate treasury salary outflows for this employee
                </p>
              </div>
              <button
                onClick={fetchSalaryHistory}
                disabled={loadingPayments}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingPayments ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading salary history...</span>
              </div>
            ) : salaryPayments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <IndianRupee className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-800">No Salary Disbursements Recorded</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No monthly salary payments have been disbursed from Treasury to this employee yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5">Payment #</th>
                      <th className="px-4 py-2.5">Month</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Mode</th>
                      <th className="px-4 py-2.5">Reference / UTR</th>
                      <th className="px-4 py-2.5">Disbursed On</th>
                      <th className="px-4 py-2.5">Disbursed By</th>
                      <th className="px-4 py-2.5">GL Journal</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{pay.paymentNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{pay.month}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          ₹{Number(pay.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {pay.paymentMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{pay.referenceNo || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(pay.paidAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{pay.paidBy}</td>
                        <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">{pay.journalNumber || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {pay.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <EmployeeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        employeeToEdit={employee}
        onSuccess={() => handleActionSuccess("Employee profile updated successfully.")}
      />

      <EmployeeArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        employee={employee}
        onSuccess={() => handleActionSuccess("Employee status updated.")}
      />

      <EmployeeLinkUserModal
        isOpen={isLinkOpen}
        onClose={() => setIsLinkOpen(false)}
        employee={employee}
        onSuccess={() => handleActionSuccess("User login credentials updated.")}
      />

      {/* Edit Salary Modal (Admin Only) */}
      {isSalaryEditOpen && (
        <EditSalaryModal
          isOpen={isSalaryEditOpen}
          onClose={() => setIsSalaryEditOpen(false)}
          employee={employee}
          onUpdated={(updatedEmp) => {
            setEmployee(updatedEmp);
            handleActionSuccess("Salary & banking details updated successfully.");
          }}
        />
      )}

      {/* Pay Salary Modal (Admin & Accounting) */}
      {isPaySalaryOpen && (
        <PaySalaryModal
          isOpen={isPaySalaryOpen}
          onClose={() => setIsPaySalaryOpen(false)}
          employee={employee}
          onPaid={(payoutData) => {
            handleActionSuccess(`Salary of ₹${payoutData.amount.toLocaleString("en-IN")} disbursed successfully!`);
            fetchSalaryHistory();
            fetchProfile();
          }}
        />
      )}
    </div>
  );
}
