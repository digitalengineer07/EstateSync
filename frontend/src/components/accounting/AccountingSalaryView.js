"use client";

import { useState, useEffect, useCallback } from "react";
import { getEmployees } from "@/services/employeeService";
import { getSalarySummary } from "@/services/salaryService";
import PaySalaryModal from "@/components/employees/PaySalaryModal";
import EditSalaryModal from "@/components/employees/EditSalaryModal";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  IndianRupee,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Search,
  RefreshCw,
  Landmark,
  ShieldCheck,
  AlertCircle,
  Edit3
} from "lucide-react";

export default function AccountingSalaryView() {
  const { user } = useAuth();
  const canEditSalary = user?.role === "ADMIN";

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeToPay, setEmployeeToPay] = useState(null);
  const [employeeToEditSalary, setEmployeeToEditSalary] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, sumRes] = await Promise.all([
        getEmployees({ status: "ACTIVE", limit: 100 }),
        getSalarySummary(selectedMonth)
      ]);

      if (empRes.success) {
        setEmployees(empRes.employees || []);
      }
      if (sumRes.success) {
        setSummary(sumRes.summary || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load salary dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePaySuccess = (payoutData) => {
    setSuccessMsg(`Salary of ₹${payoutData.amount.toLocaleString("en-IN")} disbursed successfully! Deducted from Corporate Treasury.`);
    setTimeout(() => setSuccessMsg(null), 5000);
    fetchData();
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(term) ||
      emp.employeeCode?.toLowerCase().includes(term) ||
      emp.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payroll Liability */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Payroll Liability
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-sans">
            ₹{summary ? Number(summary.totalMonthlyPayrollLiability || 0).toLocaleString("en-IN") : "--"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary ? summary.totalActiveEmployees : "--"} active employees baseline
          </p>
        </div>

        {/* Total Disbursed This Month */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disbursed ({selectedMonth})
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-sans">
            ₹{summary ? Number(summary.totalDisbursedThisMonth || 0).toLocaleString("en-IN") : "--"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary ? summary.paidEmployeesCount : 0} staff paid for this month
          </p>
        </div>

        {/* Pending Employees Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Payouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {summary ? summary.pendingEmployeesCount : "--"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Staff awaiting {selectedMonth} salary
          </p>
        </div>

        {/* Available Corporate Treasury Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Treasury Bank Liquidity
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            ₹{summary ? Number(summary.treasuryAvailableLiquid || 0).toLocaleString("en-IN") : "--"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Corporate Treasury Account (1010)
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Staff Salaries & Treasury Outflow Registry
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Accounting has view & disbursement authorization. Payouts deduct from Main Corporate Treasury (`1010`).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span>Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 w-44"
              />
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading staff salary records...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No active employees found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Monthly Base Salary</th>
                  <th className="px-5 py-3">Beneficiary Bank Details</th>
                  <th className="px-5 py-3 text-right">Disbursement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const hasSalary = emp.baseSalary && parseFloat(emp.baseSalary) > 0;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Code */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.fullName?.charAt(0)?.toUpperCase() || "E"}
                          </div>
                          <div>
                            <Link
                              href={`/dashboards/employees/${emp.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition"
                            >
                              {emp.fullName}
                            </Link>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{emp.department}</div>
                        <div className="text-[10px] text-slate-400">{emp.designation}</div>
                      </td>

                      {/* Monthly Base Salary */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {hasSalary ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{parseFloat(emp.baseSalary).toLocaleString("en-IN")}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">/ mo</span>
                            </span>
                            {canEditSalary && (
                              <button
                                onClick={() => setEmployeeToEditSalary(emp)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                                title="Edit Base Salary"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : canEditSalary ? (
                          <button
                            onClick={() => setEmployeeToEditSalary(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition shadow-xs"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>+ Add Salary</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Not set by Admin</span>
                        )}
                      </td>

                      {/* Bank Details */}
                      <td className="px-5 py-3.5">
                        {emp.bankName ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800">{emp.bankName}</div>
                            <div className="font-mono text-slate-500 text-[10px]">
                              A/C: {emp.bankAccountNo || "—"} • IFSC: {emp.ifscCode || "—"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Bank details pending</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboards/employees/${emp.id}`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
                          >
                            View
                          </Link>

                          {canEditSalary && (
                            <button
                              onClick={() => setEmployeeToEditSalary(emp)}
                              className="p-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 text-indigo-600 transition"
                              title="Configure Salary & Banking"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setEmployeeToPay(emp)}
                            disabled={!hasSalary}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Disburse Monthly Salary from Treasury"
                          >
                            <Send className="w-3 h-3" />
                            <span>Pay Salary</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Salary Modal */}
      {employeeToPay && (
        <PaySalaryModal
          isOpen={Boolean(employeeToPay)}
          onClose={() => setEmployeeToPay(null)}
          employee={employeeToPay}
          onPaid={handlePaySuccess}
        />
      )}

      {/* Edit Salary Modal (Admin Only) */}
      {employeeToEditSalary && (
        <EditSalaryModal
          isOpen={Boolean(employeeToEditSalary)}
          onClose={() => setEmployeeToEditSalary(null)}
          employee={employeeToEditSalary}
          onUpdated={(updatedEmp) => {
            setSuccessMsg(`Salary for ${updatedEmp.fullName} updated to ₹${Number(updatedEmp.baseSalary).toLocaleString("en-IN")}`);
            setTimeout(() => setSuccessMsg(null), 5000);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
