"use client";

import { useState } from "react";
import EmployeeList from "@/components/employees/EmployeeList";
import SoftDashboardShell from "@/components/SoftDashboardShell";
import { Users } from "lucide-react";

const EMPLOYEE_PANELS = [
  {
    id: "directory",
    label: "Employee Master Directory",
    shortLabel: "Employees",
    description: "Manage staff records, roles, work locations, and login bindings.",
    icon: Users,
  },
];

export default function EmployeesDashboardPage() {
  const [activePanel, setActivePanel] = useState("directory");

  return (
    <SoftDashboardShell
      title="Staff & Workforce Directory"
      description="Employee master records, staff governance, department allocations, salary configuration, and user login bindings."
      badge="Active Staff"
      navItems={EMPLOYEE_PANELS}
      activeId={activePanel}
      onSelect={setActivePanel}
      helperText="Employee controls stay in one focused directory panel."
    >
      <EmployeeList />
    </SoftDashboardShell>
  );
}
