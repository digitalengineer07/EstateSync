"use client";

import { useState, useEffect } from "react";
import { 
  Landmark, 
  CreditCard, 
  TrendingDown, 
  PieChart, 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  Receipt,
  FileCheck
} from "lucide-react";

// type can be 'wallet', 'manager', 'admin', or 'accounting'
export default function DashboardStats({ type }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`http://localhost:4000/api/v1/dashboard/${type}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          console.error("Failed to load stats:", data.message);
        }
      } catch (error) {
        console.error("Network error fetching stats", error);
      }
      setLoading(false);
    };

    fetchStats();
  }, [type]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 animate-pulse">
        <div className="bg-slate-100/90 rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-slate-100/90 rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-slate-100/90 rounded-xl h-28 border border-slate-200"></div>
        <div className="bg-slate-100/90 rounded-xl h-28 border border-slate-200"></div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (type === 'wallet') {
    return (
      <div className="space-y-4 mt-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Wallet Balance</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.availableBalance)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active field liquidity
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Spent / Realized</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalSpent)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Cumulative approved expenses</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Requests</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.pendingRequestsAmount)}
            </p>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">Awaiting manager approval</span>
          </div>
        </div>

        {stats.customerCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">My Registered Bookings</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{stats.customerCount} Active Clients</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Contract Value</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.myContractValue)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Realized Collections</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.myCollections)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'manager') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">My Budget Available</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatCurrency(stats.managerAvailableBalance)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Allocated departmental liquidity</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Team Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {stats.pendingApprovalsCount} <span className="text-sm font-normal text-slate-500">({formatCurrency(stats.pendingApprovalsAmount)})</span>
          </p>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">Requests awaiting your approval</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Team Approved Funds</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatCurrency(stats.totalTeamApprovedFunds)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Disbursed to team members</span>
        </div>
      </div>
    );
  }

  if (type === 'admin') {
    return (
      <div className="space-y-4 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Treasury Cash</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalOrganizationalFunds)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Primary Bank / Treasury Liquidity</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Allocated</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalAllocated)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Assigned operational budget</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Spent</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalSpent)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Cumulative expenditures</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Users</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {stats.activeUsers}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Fund-controlled personnel</span>
          </div>
        </div>

        {stats.totalCustomers > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Customer Contracts ({stats.totalCustomers})</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalCustomerContracts)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Inflow Collected</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.totalCustomerCollections)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Outstanding Receivables</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalCustomerReceivables)}</p>
            </div>
          </div>
        )}

        {stats.totalProperties > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Land Parcels Acquired ({stats.totalProperties})</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalLandValuation)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Disbursed to Land Owners</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.totalLandPayouts)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pending Land Liabilities</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalLandLiabilities)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'accounting') {
    return (
      <div className="space-y-4 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Treasury Liquidity</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalOrganizationalFunds)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Across {stats.totalWallets || 0} active wallets</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allocated Funds</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalAllocated)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Assigned operational budget</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realized Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {formatCurrency(stats.totalRecordedExpenses)}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">{stats.expenseCount || 0} recorded receipts</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budget Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {stats.budgetUtilization || '0%'}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Spent: {formatCurrency(stats.totalSpent)}</span>
          </div>
        </div>

        {stats.totalCustomers > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Customer Contracts ({stats.totalCustomers})</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalCustomerContracts)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Bank Collections Realized</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.totalCustomerCollections)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Market Receivables</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalCustomerReceivables)}</p>
            </div>
          </div>
        )}

        {stats.totalProperties > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Fixed Land Assets (1510)</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalLandValuation)} <span className="text-xs font-normal text-slate-500">({stats.totalProperties} Parcels)</span></p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:px-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Disbursed Outflows</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.totalLandPayouts)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Outstanding Land Liabilities</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalLandLiabilities)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
