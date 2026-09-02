"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { 
  Landmark, 
  CreditCard, 
  TrendingUp,
  Receipt,
  Users, 
  MapPin,
  Clock, 
  CheckCircle2,
  Coins
} from "lucide-react";
export default function DashboardStats({ type }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/v1/dashboard/${type}`, fetcher, { 
    refreshInterval: 10000,
    revalidateOnFocus: true
  });

  useEffect(() => {
    const handleRefresh = () => {
      mutate();
    };
    window.addEventListener("estatesync:data-refresh", handleRefresh);
    return () => window.removeEventListener("estatesync:data-refresh", handleRefresh);
  }, [mutate]);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        <div className="bg-white rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-white rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-white rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-white rounded-xl h-28 border border-slate-200"></div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const stats = data?.stats || {};

  if (type === 'accounting' || type === 'admin') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Treasury Liquidity (Corporate Main Balance) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Treasury Liquidity</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Liquid:</span>
                <span className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight font-sans">
                  {formatCurrency(stats.totalOrganizationalFundsLiquid)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Cash:</span>
                <span className="text-base sm:text-[17px] font-bold text-slate-700 tracking-tight font-sans">
                  {formatCurrency(stats.totalOrganizationalFundsCash)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>Across {stats.totalWallets || stats.activeUsers || 0} active wallets</span>
          </div>
        </div>

        {/* Card 2: Customer Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Collections</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3.5">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans block">
                {formatCurrency(stats.totalCustomerCollections || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>{stats.totalCustomers || 0} Clients</span>
            <span className="text-rose-600 font-semibold">{formatCurrency(stats.totalCustomerReceivables || 0)} due</span>
          </div>
        </div>

        {/* Card 3: Land Acquisitions (Asset 1510) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Land Assets (1510)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3.5">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans block">
                {formatCurrency(stats.totalLandValuation || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>{stats.totalProperties || 0} Parcels</span>
            <span className="text-emerald-700 font-semibold">{formatCurrency(stats.totalLandPayouts || 0)} paid</span>
          </div>
        </div>

        {/* Card 4: Operating Expenses & Allocations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3.5">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight font-sans block">
                {formatCurrency(stats.totalRecordedExpenses ?? stats.totalExpenses ?? 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
            <span>{stats.expenseCount || 0} receipts</span>
            <span className="text-slate-500">Liq: <strong className="text-slate-700 font-semibold">{formatCurrency(stats.totalAllocatedLiquid)}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'manager') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Budget Available</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Liquid:</span>
              {formatCurrency(stats.managerAvailableBalanceLiquid)}
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Cash:</span>
              {formatCurrency(stats.managerAvailableBalanceCash)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-2 border-t pt-2 border-slate-100">Departmental liquidity ready for team</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Team Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {stats.pendingApprovalsCount} Requests
          </p>
          <p className="text-xs text-slate-500 mt-1">{formatCurrency(stats.pendingApprovalsAmount)} total requested</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Team Disbursed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {formatCurrency(stats.totalTeamApprovedFunds)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Approved to team members</p>
        </div>
      </div>
    );
  }

  if (type === 'wallet') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Wallet Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Liquid:</span>
              {formatCurrency(stats.availableBalanceLiquid)}
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Cash:</span>
              {formatCurrency(stats.availableBalanceCash)}
            </p>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active field liquidity
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent / Realized</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Liquid:</span>
              {formatCurrency(stats.totalSpentLiquid)}
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-between">
              <span className="text-sm font-normal text-slate-500">Cash:</span>
              {formatCurrency(stats.totalSpentCash)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">Cumulative filed expenses</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Fund Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {formatCurrency(stats.pendingRequestsAmount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Awaiting manager approval</p>
        </div>
      </div>
    );
  }

  return null;
}
