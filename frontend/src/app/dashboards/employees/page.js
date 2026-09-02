"use client";

import { useAuth } from "@/context/AuthContext";
import { Users, ShieldCheck, UserCheck, Building } from "lucide-react";

export default function EmployeesDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Employee Master Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Users className="w-3.5 h-3.5" />
              Phase 1 & 2 Master
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Organizational employee records, department structures, user account links, and salary assignments.
          </p>
        </div>
      </div>

      {/* Overview Metric Placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">--</div>
          <p className="text-[11px] text-slate-400 mt-1">Active organization records</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">--</div>
          <p className="text-[11px] text-slate-400 mt-1">Eligible for payroll calculation</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Users</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">--</div>
          <p className="text-[11px] text-slate-400 mt-1">With system login credentials</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Departments</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">--</div>
          <p className="text-[11px] text-slate-400 mt-1">Operational divisions</p>
        </div>
      </div>

      {/* Module Shell Placeholder Box */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Employee Master Subsystem</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
          Staff onboarding, employee directory, profile management, and salary structure assignment interface are registered and ready for interactive UI components (Phase F3 & F4).
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Backend API Service Connected
        </div>
      </div>
    </div>
  );
}
