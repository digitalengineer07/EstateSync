"use client";

import { useState } from "react";
import Link from "next/link";
import AuditLogViewer from "@/components/AuditLogViewer";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import DirectFundAllocationForm from "@/components/DirectFundAllocationForm";
import FundRequestList from "@/components/FundRequestList";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import PropertyAcquisitionList from "@/components/PropertyAcquisitionList";
import SoftDashboardShell from "@/components/SoftDashboardShell";
import TreasuryInflowList from "@/components/TreasuryInflowList";
import TransactionLedger from "@/components/TransactionLedger";
import UserRegistrationForm from "@/components/UserRegistrationForm";
import UserWalletLedger from "@/components/UserWalletLedger";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Columns2,
  Coins,
  Landmark,
  MapPin,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";

const ADMIN_PANELS = [
  {
    id: "treasury",
    label: "Corporate Treasury & Cashflow Audit",
    shortLabel: "Treasury Audit",
    description: "Bank inflows, outflows, and treasury cashflow controls.",
    icon: Landmark,
  },
  {
    id: "allocation",
    label: "Direct Fund Allocation",
    shortLabel: "Fund Allocation",
    description: "Move approved corporate funds to team wallets.",
    icon: Coins,
  },
  {
    id: "registration",
    label: "Register New User",
    shortLabel: "New User",
    description: "Create staff logins and assign platform roles.",
    icon: UserPlus,
  },
  {
    id: "wallets",
    label: "Corporate Wallet Audit & Overview",
    shortLabel: "Wallet Audit",
    description: "Inspect balances and apply controlled wallet corrections.",
    icon: SlidersHorizontal,
  },
  {
    id: "staff",
    label: "Staff & Workforce Directory",
    shortLabel: "Staff Directory",
    description: "Open employee master records and staff governance.",
    icon: Users,
  },
  {
    id: "customers",
    label: "Customer Collections & Receivables",
    shortLabel: "Collections",
    description: "Review customer portfolios, collections, and receivables.",
    icon: Users,
  },
  {
    id: "properties",
    label: "Land & Property Acquisition Portfolio",
    shortLabel: "Land Portfolio",
    description: "Manage acquired land parcels and owner payout records.",
    icon: MapPin,
  },
  {
    id: "ledger",
    label: "Double-Entry General Ledger & Accounts",
    shortLabel: "General Ledger",
    description: "Inspect balanced journals and chart of accounts.",
    icon: Scale,
  },
  {
    id: "requests",
    label: "All Organization Fund Requests",
    shortLabel: "Fund Requests",
    description: "Review company-wide fund requests and approvals.",
    icon: ClipboardCheck,
  },
  {
    id: "transactions",
    label: "Global Transaction Ledger",
    shortLabel: "Transactions",
    description: "Audit all credit, debit, allocation, and payout movements.",
    icon: ArrowLeftRight,
  },
  {
    id: "audit",
    label: "Security & Audit Trail",
    shortLabel: "Audit Trail",
    description: "Review system activity and permission-sensitive actions.",
    icon: ShieldCheck,
  },
  {
    id: "both",
    label: "Side-by-Side (Both)",
    shortLabel: "Side-by-Side",
    description: "Show fund allocation and user registration together.",
    icon: Columns2,
  },
];

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState("treasury");

  const renderPanel = () => {
    if (activePanel === "allocation") return <DirectFundAllocationForm />;
    if (activePanel === "registration") return <UserRegistrationForm />;
    if (activePanel === "wallets") return <UserWalletLedger />;
    if (activePanel === "staff") {
      return (
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-950">Staff & Workforce Directory</h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-50 text-[#ff6b12] border border-orange-200">
                  Active Staff
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Employee master records, staff governance, department allocations, and user login bindings.
              </p>
            </div>
            <Link
              href="/dashboards/employees"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6b12] hover:bg-[#f25f05] text-xs font-extrabold text-white shadow-[0_12px_24px_-16px_rgba(255,107,18,0.9)] transition"
            >
              <Users className="w-3.5 h-3.5" />
              Employee Master
            </Link>
          </div>

          <Link
            href="/dashboards/employees"
            className="mt-4 p-4 rounded-xl bg-zinc-50 hover:bg-orange-50/60 border border-zinc-200 hover:border-orange-200 transition group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-950">Employee Master Directory</span>
              <Users className="w-4 h-4 text-zinc-400 group-hover:text-[#ff6b12]" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Manage staff directory, employment status, designations, work locations, and system login bindings.
            </p>
          </Link>
        </div>
      );
    }
    if (activePanel === "customers") return <CustomerPortfolioList mode="accounting" userRole="ADMIN" />;
    if (activePanel === "properties") return <PropertyAcquisitionList userRole="ADMIN" />;
    if (activePanel === "ledger") return <GeneralLedgerView />;
    if (activePanel === "requests") return <FundRequestList type="all" embedded={true} showHeader={false} />;
    if (activePanel === "transactions") return <TransactionLedger embedded={true} showHeader={false} />;
    if (activePanel === "audit") return <AuditLogViewer />;
    if (activePanel === "both") {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <DirectFundAllocationForm />
          <UserRegistrationForm />
        </div>
      );
    }

    return <TreasuryInflowList userRole="ADMIN" />;
  };

  return (
    <SoftDashboardShell
      title="Admin Dashboard"
      description="Corporate treasury controls, user provisioning, direct allocation, and wallet audits in a focused single-panel workspace."
      badge="Master Control"
      navItems={ADMIN_PANELS}
      activeId={activePanel}
      onSelect={setActivePanel}
      statsType="admin"
      helperText="Use the sidebar buttons to open one admin control panel at a time."
    >
      {renderPanel()}
    </SoftDashboardShell>
  );
}
