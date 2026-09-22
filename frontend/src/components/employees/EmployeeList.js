"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/utils/permissions";
import { getEmployees } from "@/services/employeeService";
import EmployeeModal from "./EmployeeModal";
import EmployeeArchiveModal from "./EmployeeArchiveModal";
import EmployeeLinkUserModal from "./EmployeeLinkUserModal";
import EditSalaryModal from "./EditSalaryModal";
import PaySalaryModal from "./PaySalaryModal";
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  UserX,
  Link2,
  Unlink,
  Eye,
  ShieldCheck,
  Building,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  Briefcase,
  IndianRupee,
  Send
} from "lucide-react";

export default function EmployeeList() {
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("ALL");

  useEffect(() => {
    const checkHighlight = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const hId = params.get("highlight");
      const storedId = sessionStorage.getItem("estatesync_pending_highlight");
      if (hId) {
        setHighlightedId(hId);
      } else if (storedId) {
        setHighlightedId(storedId);
      }
    };

    checkHighlight();

    const onHighlightEvent = (e) => {
      if (e.detail?.id) setHighlightedId(e.detail.id);
    };

    window.addEventListener("estatesync:highlight-record", onHighlightEvent);
    return () => window.removeEventListener("estatesync:highlight-record", onHighlightEvent);
  }, []);

  // Smooth scroll and focus on highlighted employee record
  useEffect(() => {
    if (!highlightedId || loading || employees.length === 0) return;

    const matched = employees.find((e) => e.id === highlightedId);
    if (matched) {
      if (statusFilter !== "ALL" && matched.status !== statusFilter) {
        setStatusFilter("ALL");
      }
      if (
        searchTerm &&
        !matched.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !matched.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        setSearchTerm("");
      }
    }

    const scrollToEmployee = () => {
      const el =
        document.getElementById(`employee-${highlightedId}`) ||
        document.getElementById(`employee-mobile-${highlightedId}`);
      if (!el) return false;

      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - (window.innerHeight / 2) + (rect.height / 2);

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth",
      });

      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}

      return true;
    };

    // Staggered attempts to guarantee scroll after route change, layout reflow, and images settling
    scrollToEmployee();
    const t1 = setTimeout(scrollToEmployee, 120);
    const t2 = setTimeout(scrollToEmployee, 350);
    const t3 = setTimeout(scrollToEmployee, 700);

    // Auto-fade highlight back to normal after 3.5 seconds
    const fadeTimer = setTimeout(() => {
      setHighlightedId(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("estatesync_pending_highlight");
        const url = new URL(window.location.href);
        if (url.searchParams.has("highlight")) {
          url.searchParams.delete("highlight");
          window.history.replaceState({}, "", url.toString());
        }
      }
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(fadeTimer);
    };
  }, [highlightedId, loading, employees]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [employeeToArchive, setEmployeeToArchive] = useState(null);
  const [employeeToLink, setEmployeeToLink] = useState(null);
  const [employeeToEditSalary, setEmployeeToEditSalary] = useState(null);
  const [employeeToPaySalary, setEmployeeToPaySalary] = useState(null);

  const canCreate = ["ADMIN", "MANAGER"].includes(user?.role) || (hasPermission(user, "employee.create") && user?.role !== "ACCOUNTING");
  const canUpdate = ["ADMIN", "MANAGER", "ACCOUNTING"].includes(user?.role) || hasPermission(user, "employee.update");
  const canArchive = ["ADMIN"].includes(user?.role) || hasPermission(user, "employee.archive");
  const canViewSalary = ["ADMIN", "ACCOUNTING", "MANAGER"].includes(user?.role);
  const canEditSalary = user?.role === "ADMIN";
  const canPaySalary = ["ADMIN", "ACCOUNTING"].includes(user?.role);

  const fetchEmployeeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (departmentFilter !== "ALL") params.department = departmentFilter;
      if (employmentTypeFilter !== "ALL") params.employmentType = employmentTypeFilter;

      const res = await getEmployees(params);
      if (res.success && Array.isArray(res.employees)) {
        setEmployees(res.employees);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load employee directory");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, departmentFilter, employmentTypeFilter]);

  useEffect(() => {
    fetchEmployeeData();
    const handleRefresh = () => fetchEmployeeData();
    window.addEventListener("estatesync:data-refresh", handleRefresh);
    return () => window.removeEventListener("estatesync:data-refresh", handleRefresh);
  }, [fetchEmployeeData]);

  // Derived Metrics from live list
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const archivedCount = employees.filter((e) => ["ARCHIVED", "RESIGNED", "TERMINATED"].includes(e.status)).length;
  const linkedCount = employees.filter((e) => Boolean(e.userId)).length;
  const totalMonthlyPayroll = employees
    .filter((e) => e.status === "ACTIVE")
    .reduce((sum, e) => sum + (parseFloat(e.baseSalary) || 0), 0);

  // Extract unique departments for filter dropdown
  const departmentsList = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean))
  ).sort();

  const handleActionSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
    fetchEmployeeData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Employee Master Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              <Users className="w-3.5 h-3.5" />
              Phase 1 Master
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage organizational staff profiles, department structures, user login credentials, and employment status.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white shadow-xs transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Success / Error Feedback */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-orange-600 hover:text-orange-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchEmployeeData} className="text-orange-600 hover:text-orange-800 text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans mt-3">
              {loading ? "--" : totalCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>Directory Records</span>
            <span className="font-semibold text-orange-600">{activeCount} active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans mt-3">
              {loading ? "--" : activeCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>In Service</span>
            <span className="font-semibold text-orange-700">Ready for payroll</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Logins</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans mt-3">
              {loading ? "--" : linkedCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>User Accounts</span>
            <span className="font-semibold text-orange-600">Portal Authorized</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Payroll</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-digital mt-3">
              {loading ? "--" : `₹${Math.round(totalMonthlyPayroll).toLocaleString("en-IN")}`}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>Active Base Salary</span>
            <span className="font-semibold text-orange-700">Monthly Run</span>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Container */}
      <div className="bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, name, mobile, email..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition font-medium"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Employment Type */}
            <select
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>

            <button
              onClick={fetchEmployeeData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition disabled:opacity-50 shadow-2xs active:scale-95"
              title="Refresh directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
            <span>Loading employee records...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No Employees Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL" || departmentFilter !== "ALL"
                ? "No employee records match your search criteria. Try resetting filters."
                : "No employee records registered in the system yet."}
            </p>
            {canCreate && !searchTerm && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Employee</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 backdrop-blur-xs text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Employee</th>
                    <th scope="col" className="px-5 py-3.5">Designation & Dept</th>
                    <th scope="col" className="px-5 py-3.5">Contact</th>
                    <th scope="col" className="px-5 py-3.5">Employment</th>
                    {canViewSalary && <th scope="col" className="px-5 py-3.5">Monthly Salary</th>}
                    <th scope="col" className="px-5 py-3.5">System Login</th>
                    <th scope="col" className="px-5 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const isArchived = ["ARCHIVED", "RESIGNED", "TERMINATED"].includes(emp.status);
                    return (
                      <tr 
                        key={emp.id} 
                        id={`employee-${emp.id}`}
                        className={`transition-all duration-700 border-l-4 ${
                          highlightedId === emp.id
                            ? "bg-[#fff3ea] border-l-[#ff6b12]"
                            : "border-l-transparent hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Employee Name & Code */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {emp.fullName?.charAt(0)?.toUpperCase() || "E"}
                            </div>
                            <div>
                              <Link
                                href={`/dashboards/employees/${emp.id}`}
                                className="font-bold text-slate-900 hover:text-orange-600 transition"
                              >
                                {emp.fullName}
                              </Link>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {emp.employeeCode}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Designation & Dept */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{emp.designation}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{emp.department}</span>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.mobile}</span>
                          </div>
                          {emp.email ? (
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">{emp.email}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic">No email</span>
                          )}
                        </td>

                        {/* Employment Type & Joining */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">
                            {emp.employmentType?.replace("_", " ") || "FULL TIME"}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Joined {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "--"}
                          </span>
                        </td>

                        {/* Monthly Base Salary */}
                        {canViewSalary && (
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {emp.baseSalary && parseFloat(emp.baseSalary) > 0 ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200/90 text-orange-800 text-xs font-bold font-digital tracking-wide">
                                    ₹{parseFloat(emp.baseSalary).toLocaleString("en-IN")}
                                  </span>
                                  {canEditSalary && (
                                    <button
                                      onClick={() => setEmployeeToEditSalary(emp)}
                                      className="text-[10.5px] text-orange-600 hover:text-orange-800 font-semibold underline"
                                      title="Edit Salary"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                                {emp.bankName && (
                                  <div className="text-[10.5px] text-slate-400 mt-1 font-mono">
                                    🏦 {emp.bankName} {emp.bankAccountNo ? `(${emp.bankAccountNo.slice(-4)})` : ""}
                                  </div>
                                )}
                              </div>
                            ) : canEditSalary ? (
                              <button
                                onClick={() => setEmployeeToEditSalary(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200 transition shadow-2xs active:scale-95"
                                title="Configure Salary & Banking"
                              >
                                <IndianRupee className="w-3 h-3" />
                                <span>+ Add Salary</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Not configured</span>
                            )}
                          </td>
                        )}

                        {/* Linked Login */}
                        <td className="px-5 py-3.5">
                          {emp.userId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{emp.user?.role?.name || "Linked"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <span>Non-Login Staff</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                              emp.status === "ACTIVE"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : isArchived
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboards/employees/${emp.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-orange-600 transition shadow-2xs active:scale-95"
                              title="View Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {canPaySalary && emp.status === "ACTIVE" && (
                              <button
                                onClick={() => setEmployeeToPaySalary(emp)}
                                disabled={!emp.baseSalary || parseFloat(emp.baseSalary) <= 0}
                                className="p-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition disabled:opacity-30 disabled:hover:bg-orange-50 shadow-2xs active:scale-95"
                                title="Disburse Monthly Salary"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canEditSalary && (
                              <button
                                onClick={() => setEmployeeToEditSalary(emp)}
                                className="p-1.5 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-600 transition shadow-2xs active:scale-95"
                                title="Configure Salary & Banking"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canUpdate && (
                              <button
                                onClick={() => setEmployeeToEdit(emp)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs active:scale-95"
                                title="Edit Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canUpdate && (
                              <button
                                onClick={() => setEmployeeToLink(emp)}
                                className={`p-1.5 rounded-lg border bg-white transition shadow-2xs active:scale-95 ${
                                  emp.userId
                                    ? "border-orange-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-orange-600"
                                }`}
                                title={emp.userId ? "Unlink User Account" : "Link Login User Account"}
                              >
                                {emp.userId ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {canArchive && !isArchived && (
                              <button
                                onClick={() => setEmployeeToArchive(emp)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition shadow-2xs active:scale-95"
                                title="Archive / Separate"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {employees.map((emp) => {
                const isArchived = ["ARCHIVED", "RESIGNED", "TERMINATED"].includes(emp.status);
                return (
                  <div 
                    key={emp.id} 
                    id={`employee-mobile-${emp.id}`}
                    className={`p-4 space-y-3 transition-all duration-700 border-l-4 ${
                      highlightedId === emp.id
                        ? "bg-[#fff3ea] border-l-[#ff6b12] rounded-xl"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {emp.fullName?.charAt(0)?.toUpperCase() || "E"}
                        </div>
                        <div>
                          <Link
                            href={`/dashboards/employees/${emp.id}`}
                            className="font-bold text-slate-900 hover:text-orange-600 transition text-xs"
                          >
                            {emp.fullName}
                          </Link>
                          <div className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.status === "ACTIVE"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : isArchived
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Department</span>
                        <span className="font-semibold">{emp.department}</span> ({emp.designation})
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Mobile</span>
                        <span className="font-mono">{emp.mobile}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {emp.userId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Linked ({emp.user?.role?.name || "User"})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Non-Login Staff</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/dashboards/employees/${emp.id}`}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-orange-600"
                        >
                          View
                        </Link>
                        {canUpdate && (
                          <button
                            onClick={() => setEmployeeToEdit(emp)}
                            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        managersList={employees.filter((e) => e.status === "ACTIVE")}
        onSuccess={() => handleActionSuccess("Employee registered successfully.")}
      />

      <EmployeeModal
        isOpen={Boolean(employeeToEdit)}
        onClose={() => setEmployeeToEdit(null)}
        employeeToEdit={employeeToEdit}
        managersList={employees.filter((e) => e.status === "ACTIVE")}
        onSuccess={() => handleActionSuccess("Employee details updated successfully.")}
      />

      <EmployeeArchiveModal
        isOpen={Boolean(employeeToArchive)}
        onClose={() => setEmployeeToArchive(null)}
        employee={employeeToArchive}
        onSuccess={() => handleActionSuccess("Employee status updated.")}
      />

      <EmployeeLinkUserModal
        isOpen={Boolean(employeeToLink)}
        onClose={() => setEmployeeToLink(null)}
        employee={employeeToLink}
        onSuccess={() => handleActionSuccess("User login credentials updated.")}
      />

      {/* Edit Salary Modal (Admin Only) */}
      {employeeToEditSalary && (
        <EditSalaryModal
          isOpen={Boolean(employeeToEditSalary)}
          onClose={() => setEmployeeToEditSalary(null)}
          employee={employeeToEditSalary}
          onUpdated={() => handleActionSuccess("Salary & banking configuration updated successfully.")}
        />
      )}

      {/* Pay Salary Modal (Admin & Accounting) */}
      {employeeToPaySalary && (
        <PaySalaryModal
          isOpen={Boolean(employeeToPaySalary)}
          onClose={() => setEmployeeToPaySalary(null)}
          employee={employeeToPaySalary}
          onPaid={(payout) => handleActionSuccess(`Salary of ₹${payout.amount.toLocaleString("en-IN")} disbursed successfully!`)}
        />
      )}
    </div>
  );
}
