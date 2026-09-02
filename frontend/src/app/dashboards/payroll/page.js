"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  FileSpreadsheet,
  Calendar,
  Calculator,
  Scale,
  Landmark,
  Sliders,
  ArrowRight,
  Layers,
  ShieldCheck
} from "lucide-react";

export default function PayrollDashboardPage() {
  const { user } = useAuth();

  const submodules = [
    {
      title: "Salary Components",
      desc: "Earnings, statutory deductions (PF/ESI/TDS), and calculation rules.",
      icon: Sliders,
      phase: "Phase 2 Master",
      href: "/dashboards/payroll/components",
      active: true
    },
    {
      title: "Salary Structures",
      desc: "CTC formula templates and grade-level compensation blueprints.",
      icon: FileSpreadsheet,
      phase: "Phase 2 Master",
      href: "/dashboards/payroll/structures",
      active: true
    },
    {
      title: "Monthly Periods",
      desc: "Fiscal calendar periods and active monthly calculation windows.",
      icon: Calendar,
      phase: "Phase 3 (F6)",
      href: null,
      active: false
    },
    {
      title: "Calculation Engine & Runs",
      desc: "1-click batch calculation, exception flags, and run approvals.",
      icon: Calculator,
      phase: "Phase 3 (F6)",
      href: null,
      active: false
    },
    {
      title: "GL Accrual Posting",
      desc: "Double-entry Dr/Cr preview and automated ledger posting.",
      icon: Scale,
      phase: "Phase 4 (F7)",
      href: null,
      active: false
    },
    {
      title: "Treasury Disbursements",
      desc: "Multi-employee batch reservation, UTR settlement, and reversals.",
      icon: Landmark,
      phase: "Phase 5 (F8)",
      href: null,
      active: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Payroll & Compensation Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Configuration & Engine
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage salary components, compensation blueprints, automated payroll runs, balanced GL accruals, and disbursements.
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
              className={`bg-white p-5 rounded-xl border transition flex flex-col justify-between ${
                mod.active
                  ? "border-indigo-100 hover:border-indigo-300 shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
                  : "border-slate-200/90 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      mod.active
                        ? "bg-indigo-50 border border-indigo-100 text-indigo-600"
                        : "bg-slate-100 border border-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      mod.active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {mod.phase}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-3">{mod.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{mod.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {mod.href ? (
                  <Link
                    href={mod.href}
                    className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-slate-400">Backend Ready (Queued)</span>
                )}
                <span
                  className={`w-2 h-2 rounded-full ${mod.active ? "bg-emerald-500" : "bg-slate-300"}`}
                ></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
