"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DashboardStats from "@/components/DashboardStats";
import UserWalletLedger from "@/components/UserWalletLedger";
import ExpenseList from "@/components/ExpenseList";
import TransactionLedger from "@/components/TransactionLedger";
import GeneralLedgerView from "@/components/GeneralLedgerView";
import CustomerPortfolioList from "@/components/CustomerPortfolioList";
import PropertyAcquisitionList from "@/components/PropertyAcquisitionList";
import TreasuryInflowList from "@/components/TreasuryInflowList";
import AccountingSalaryView from "@/components/accounting/AccountingSalaryView";
import Link from "next/link";
import { Users, MapPin, Scale, Wallet, Receipt, ArrowLeftRight, ShieldCheck, Landmark, IndianRupee, ChevronLeft, ChevronRight } from "lucide-react";

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState("treasury");
  const [walletSubTab, setWalletSubTab] = useState("expenses");

  const tabContainerRef = useRef(null);
  const tabRefs = useRef({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = [
    { id: "treasury", label: "Bank Inflow & Treasury", icon: Landmark, badge: "PRD §4.1" },
    { id: "collections", label: "Customer Collections", icon: Users, badge: "PRD §19" },
    { id: "properties", label: "Land Acquisitions", icon: MapPin, badge: "PRD §20" },
    { id: "salaries", label: "Staff Salaries & Payouts", icon: IndianRupee, badge: "Treasury Sync" },
    { id: "ledger", label: "General Ledger", icon: Scale, badge: "Dr = Cr" },
    { id: "wallets", label: "Wallets & Expenses", icon: Wallet, badge: "Corporate" },
  ];

  const checkScroll = useCallback(() => {
    const el = tabContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  // Genius Auto-Scroll: Whenever activeTab changes, smoothly center it in view
  useEffect(() => {
    const container = tabContainerRef.current;
    const activeBtn = tabRefs.current[activeTab];
    if (container && activeBtn) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      
      const scrollOffset =
        btnRect.left - containerRect.left - (containerRect.width / 2) + (btnRect.width / 2);
      
      container.scrollBy({
        left: scrollOffset,
        behavior: "smooth"
      });
    }
    const timer = setTimeout(checkScroll, 350);
    return () => clearTimeout(timer);
  }, [activeTab, checkScroll]);

  const handleScroll = (direction) => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth"
      });
      setTimeout(checkScroll, 250);
    }
  };

  const handleWheel = (e) => {
    if (tabContainerRef.current) {
      if (e.deltaY !== 0) {
        tabContainerRef.current.scrollLeft += e.deltaY;
        checkScroll();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 bg-gradient-to-r from-slate-50/80 via-white to-indigo-50/20 p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Accounting & Financial Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Full Audit Authority
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">
            Corporate treasury inflows, customer collections, land acquisitions, balanced double-entry ledger, and expense governance.
          </p>
        </div>

        {/* Top-Right Tab Navigation Island with Genius Auto-Scroll & Nav Controls */}
        <div className="relative flex items-center max-w-full self-start lg:self-auto group">
          {/* Left Scroll Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll("left")}
              className="absolute -left-3 z-10 p-1.5 rounded-full bg-white/95 border border-slate-200 text-slate-700 shadow-md hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all"
              title="Scroll Left"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Fade Mask */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-[5] rounded-l-2xl" />
          )}

          {/* Scrollable Tab Container (Scrollbar Hidden, Auto-Centering Active Tab) */}
          <div
            ref={tabContainerRef}
            onWheel={handleWheel}
            onScroll={checkScroll}
            className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto no-scrollbar scroll-smooth max-w-[85vw] sm:max-w-xl lg:max-w-2xl"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 shrink-0 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Fade Mask */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-[5] rounded-r-2xl" />
          )}

          {/* Right Scroll Arrow Button */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll("right")}
              className="absolute -right-3 z-10 p-1.5 rounded-full bg-white/95 border border-slate-200 text-slate-700 shadow-md hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all"
              title="Scroll Right"
              aria-label="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Clean Key Metrics */}
      <DashboardStats type="accounting" />

      {/* Active Tab Content */}
      <div>
        {activeTab === "treasury" && (
          <TreasuryInflowList userRole="ACCOUNTING" />
        )}

        {activeTab === "collections" && (
          <CustomerPortfolioList mode="accounting" userRole="ACCOUNTING" />
        )}

        {activeTab === "properties" && (
          <PropertyAcquisitionList userRole="ACCOUNTING" />
        )}

        {activeTab === "salaries" && (
          <AccountingSalaryView />
        )}

        {activeTab === "ledger" && (
          <GeneralLedgerView />
        )}

        {activeTab === "wallets" && (
          <div className="space-y-6">
            <UserWalletLedger />
            
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {walletSubTab === "expenses" ? "All Corporate Expense Records" : "Global Transaction Ledger"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {walletSubTab === "expenses"
                      ? "Audit user receipts, line-item expenses, and execute administrative reversals."
                      : "Complete audit record of fund allocations, collections, debits, and credits (PRD §4.4)."}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setWalletSubTab("expenses")}
                    className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      walletSubTab === "expenses"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    All Expenses
                  </button>
                  <button
                    onClick={() => setWalletSubTab("transactions")}
                    className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      walletSubTab === "transactions"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
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
        )}
      </div>
    </div>
  );
}
