"use client";

import { useParams } from "next/navigation";
import EmployeeDetailView from "@/components/employees/EmployeeDetailView";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id;

  return <EmployeeDetailView id={id} />;
}
