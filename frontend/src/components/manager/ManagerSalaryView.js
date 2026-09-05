"use client";

import { useState, useEffect } from "react";
import { getEmployees } from "@/services/employeeService";
import Link from "next/link";
import { IndianRupee, Users, ShieldCheck, Eye, RefreshCw, AlertCircle, Landmark } from "lucide-react";

export default function ManagerSalaryView() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmployees({ status: "ACTIVE", limit: 100 });
      if (res.success) {
        setEmployees(res.employees || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load team salary records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const totalMonthlyLiability = employees.reduce((sum, e) => sum + (parseFloat(e.baseSalary) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Informational Read-Only Header */}
      <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            <strong className="font-semibold">Manager Oversight Mode:</strong> You have supervisory view rights for team salaries. Base compensation updates are restricted to Admin, and Treasury disbursements are authorized by Admin & Accounting.
          </span>
        </div>
        <div className="text-right whitespace-nowrap">
          <span className="text-purple-600 font-medium">Team Base Payroll: </span>
          <span className="font-bold text-sm text-purple-950">₹{totalMonthlyLiability.toLocaleString("en-IN")} / mo</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
          <span>Loading team salaries...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400">
          No team member records found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Team Member</th>
                <th className="px-5 py-3">Department & Role</th>
                <th className="px-5 py-3">Monthly Base Salary</th>
                <th className="px-5 py-3">Bank Account (Masked)</th>
                <th className="px-5 py-3 text-right">View Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Name & Code */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {emp.fullName?.charAt(0)?.toUpperCase() || "E"}
                      </div>
                      <div>
                        <Link
                          href={`/dashboards/employees/${emp.id}`}
                          className="font-bold text-slate-900 hover:text-purple-600 transition"
                        >
                          {emp.fullName}
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>

                  {/* Dept & Designation */}
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{emp.designation}</div>
                    <div className="text-[10px] text-slate-400">{emp.department}</div>
                  </td>

                  {/* Salary */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {emp.baseSalary && parseFloat(emp.baseSalary) > 0 ? (
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{parseFloat(emp.baseSalary).toLocaleString("en-IN")}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/ mo</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not set</span>
                    )}
                  </td>

                  {/* Bank */}
                  <td className="px-5 py-3.5">
                    {emp.bankName ? (
                      <div>
                        <div className="font-semibold text-slate-800">{emp.bankName}</div>
                        <div className="font-mono text-slate-400 text-[10px]">{emp.bankAccountNo || "—"}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/dashboards/employees/${emp.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
