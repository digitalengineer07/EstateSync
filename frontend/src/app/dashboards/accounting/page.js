"use client";

import { useState } from "react";
import AccountingSalaryView from "@/components/accounting/AccountingSalaryView";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import ExpenseList from "@/components/ExpenseList";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import PropertyAcquisitionList from "@/components/PropertyAcquisitionList";
import SoftDashboardShell from "@/components/SoftDashboardShell";
import TransactionLedger from "@/components/TransactionLedger";
import TreasuryInflowList from "@/components/TreasuryInflowList";
import UserWalletLedger from "@/components/UserWalletLedger";
import OperationalNotesView from "@/components/OperationalNotesView";
import { ArrowLeftRight, IndianRupee, Landmark, MapPin, NotebookPen, Receipt, Scale, Users, Wallet } from "lucide-react";

const ACCOUNTING_PANELS = [
  {
    id: "treasury",
    label: "Bank Inflow & Treasury",
    shortLabel: "Treasury",
    description: "Record bank inflows and inspect corporate cashflow.",
    icon: Landmark,
  },
  {
    id: "collections",
    label: "Customer Collections",
    shortLabel: "Customer Collections",
    description: "Review customer portfolios and collection status.",
    icon: Users,
  },
  {
    id: "properties",
    label: "Land Acquisitions",
    shortLabel: "Land Acquisitions",
    description: "Manage acquired land parcels and owner payout records.",
    icon: MapPin,
  },
  {
    id: "salaries",
    label: "Staff Salaries & Payouts",
    shortLabel: "Staff & Payouts",
    description: "Disburse salary payouts from corporate treasury.",
    icon: IndianRupee,
  },
  {
    id: "ledger",
    label: "General Ledger",
    shortLabel: "General Ledger",
    description: "Inspect balanced double-entry journals.",
    icon: Scale,
  },
  {
    id: "wallets",
    label: "Wallets & Reports",
    shortLabel: "Reports",
    description: "Audit staff wallets, expenses, and transactions.",
    icon: Wallet,
  },
  {
    id: "notes",
    label: "Cash & Operational Notes Diary",
    shortLabel: "Cash Notes",
    description: "Knowledge memory logs for cash collections, land payments, and operations.",
    icon: NotebookPen,
  },
];

export default function AccountingDashboard() {
  const [activePanel, setActivePanel] = useState("treasury");
  const [walletSubTab, setWalletSubTab] = useState("expenses");

  const renderWalletPanel = () => (
    <div className="space-y-5">
      <UserWalletLedger />

      <div className="bg-white rounded-[16px] border border-zinc-200 p-5 shadow-[0_10px_24px_-20px_rgba(20,20,20,0.45)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-extrabold text-zinc-950">
              {walletSubTab === "expenses" ? "All Corporate Expense Records" : "Global Transaction Ledger"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {walletSubTab === "expenses"
                ? "Audit user receipts, line-item expenses, and administrative reversals."
                : "Complete audit record of fund allocations, collections, debits, and credits."}
            </p>
          </div>

          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold">
            <button
              onClick={() => setWalletSubTab("expenses")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                walletSubTab === "expenses"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              All Expenses
            </button>
            <button
              onClick={() => setWalletSubTab("transactions")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                walletSubTab === "transactions"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transaction Ledger
            </button>
          </div>
        </div>

        <div className="mt-4">
          {walletSubTab === "expenses" ? (
            <ExpenseList type="all" />
          ) : (
            <TransactionLedger embedded={true} showHeader={false} />
          )}
        </div>
      </div>
    </div>
  );

  const renderPanel = () => {
    if (activePanel === "collections") return <CustomerPortfolioList mode="accounting" userRole="ACCOUNTING" />;
    if (activePanel === "properties") return <PropertyAcquisitionList userRole="ACCOUNTING" />;
    if (activePanel === "salaries") return <AccountingSalaryView />;
    if (activePanel === "ledger") return <GeneralLedgerView />;
    if (activePanel === "wallets") return renderWalletPanel();
    if (activePanel === "notes") return <OperationalNotesView userRole="ACCOUNTING" />;
    return <TreasuryInflowList userRole="ACCOUNTING" />;
  };

  return (
    <SoftDashboardShell
      title="Accounting & Financial Hub"
      description="Corporate treasury inflows, customer collections, land acquisitions, balanced double-entry ledger, and expense governance."
      badge="Full Audit Authority"
      navItems={ACCOUNTING_PANELS}
      activeId={activePanel}
      onSelect={setActivePanel}
      statsType="accounting"
      helperText="Open one finance workspace at a time from treasury through ledger audit."
    >
      {renderPanel()}
    </SoftDashboardShell>
  );
}
