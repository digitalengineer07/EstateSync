"use client";

import { useAuth } from "@/context/AuthContext";
import { FileSpreadsheet, Calendar, Calculator, Scale, Landmark, Sliders } from "lucide-react";

export default function PayrollDashboardPage() {
  const { user } = useAuth();

  const submodules = [
    {
      title: "Salary Components",
      desc: "Earnings, statutory deductions (PF/ESI/TDS), and calculation rules.",
      icon: Sliders,
      phase: "Phase 2"
    },
    {
      title: "Salary Structures",
      desc: "CTC formula templates and grade-level compensation blueprints.",
      icon: FileSpreadsheet,
      phase: "Phase 2"
    },
    {
      title: "Monthly Periods",
      desc: "Fiscal calendar periods and active monthly calculation windows.",
      icon: Calendar,
      phase: "Phase 3"
    },
    {
      title: "Calculation Engine & Runs",
      desc: "1-click batch calculation, exception flags, and run approvals.",
      icon: Calculator,
      phase: "Phase 3"
    },
    {
      title: "GL Accrual Posting",
      desc: "Double-entry Dr/Cr preview and automated ledger posting.",
      icon: Scale,
      phase: "Phase 4"
    },
    {
      title: "Treasury Disbursements",
      desc: "Multi-employee batch reservation, UTR settlement, and reversals.",
      icon: Landmark,
      phase: "Phase 5"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Payroll Engine & Salary Treasury Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Phases 1–5B Production Ready
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            End-to-end salary calculations, exception controls, balanced GL accruals, and corporate treasury settlements.
          </p>
        </div>
      </div>

      {/* Submodule Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {submodules.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {mod.phase}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-3">{mod.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{mod.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Status: API Ready</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Shell Placeholder Box */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Calculator className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Payroll Engine Architecture</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
          Monthly calculation wizard, employee payslips grid, General Ledger accrual modal, and Treasury disbursement drawer are connected to the F1 service layer and ready for interactive UI implementation (Phases F5–F8).
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Backend API Service Layer Verified
        </div>
      </div>
    </div>
  );
}
