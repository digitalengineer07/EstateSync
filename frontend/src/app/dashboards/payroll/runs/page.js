"use client";

import { Suspense } from "react";
import PayrollRunList from "@/components/payroll/PayrollRunList";
import { Loader2 } from "lucide-react";

export default function PayrollRunsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading calculation runs...</span>
        </div>
      }
    >
      <PayrollRunList />
    </Suspense>
  );
}
