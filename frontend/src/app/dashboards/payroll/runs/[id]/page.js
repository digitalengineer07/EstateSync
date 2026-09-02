"use client";

import { useParams } from "next/navigation";
import PayrollRunDetailView from "@/components/payroll/PayrollRunDetailView";

export default function PayrollRunDetailPage() {
  const params = useParams();
  const id = params?.id;

  return <PayrollRunDetailView id={id} />;
}
