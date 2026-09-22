"use client";

import { useState } from "react";
import ExpenseList from "@/components/ExpenseList";
import FundRequestList from "@/components/FundRequestList";
import ManagerSalaryView from "@/components/manager/ManagerSalaryView";
import OperationalNotesView from "@/components/OperationalNotesView";
import SoftDashboardShell from "@/components/SoftDashboardShell";
import { FileCheck, IndianRupee, NotebookPen, Receipt } from "lucide-react";

const MANAGER_PANELS = [
  {
    id: "approvals",
    label: "Incoming Team Fund Requests",
    shortLabel: "Approvals",
    description: "Review and approve pending team fund allocations.",
    icon: FileCheck,
  },
  {
    id: "expenses",
    label: "Team Expense Submissions",
    shortLabel: "Team Expenses",
    description: "Monitor itemized receipts and expenditures filed by the team.",
    icon: Receipt,
  },
  {
    id: "salaries",
    label: "Department Team Salaries & Compensation",
    shortLabel: "Team Salaries",
    description: "Read-only salary governance and compensation oversight.",
    icon: IndianRupee,
  },
  {
    id: "notes",
    label: "Cash & Operational Notes Diary",
    shortLabel: "Cash Notes",
    description: "Knowledge memory logs for customer cash, site payments, and field operations.",
    icon: NotebookPen,
  },
];

export default function ManagerDashboard() {
  const [activePanel, setActivePanel] = useState("approvals");

  const renderPanel = () => {
    if (activePanel === "expenses") return <ExpenseList type="team" />;
    if (activePanel === "salaries") return <ManagerSalaryView />;
    if (activePanel === "notes") return <OperationalNotesView userRole="MANAGER" />;
    return <FundRequestList type="incoming" embedded={true} showHeader={false} />;
  };

  return (
    <SoftDashboardShell
      title="Operations & Management Hub"
      description="Supervise departmental workflows, approve field team fund requisitions, monitor expenditures, and oversee operations."
      badge="Operations Authority"
      navItems={MANAGER_PANELS}
      activeId={activePanel}
      onSelect={setActivePanel}
      statsType="manager"
      helperText="Switch between approvals, team expenses, and salary oversight without leaving the manager workspace."
    >
      {renderPanel()}
    </SoftDashboardShell>
  );
}
