"use client";

import { useState, useEffect } from "react";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6 animate-pulse">
        <div className="bg-slate-100/80 rounded-2xl h-32 border border-slate-200"></div>
        <div className="bg-slate-100/80 rounded-2xl h-32 border border-slate-200"></div>
        <div className="bg-slate-100/80 rounded-2xl h-32 border border-slate-200"></div>
        <div className="bg-slate-100/80 rounded-2xl h-32 border border-slate-200"></div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (type === 'wallet') {
    return (
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Available Wallet Balance</h3>
              <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 text-xs">💰</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 tracking-tight">
              {formatCurrency(stats.availableBalance)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Live balance ready for field expenses</span>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-5 rounded-2xl border border-indigo-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">Total Spent / Realized</h3>
              <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700 text-xs">🧾</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalSpent)}
            </p>
            <span className="text-[11px] text-indigo-600 font-medium mt-1 block">Cumulative approved expenditures</span>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Requests</h3>
              <span className="p-1.5 bg-amber-100 rounded-lg text-amber-700 text-xs">⏳</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-2 tracking-tight">
              {formatCurrency(stats.pendingRequestsAmount)}
            </p>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">Awaiting manager approval</span>
          </div>
        </div>

        {stats.customerCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-indigo-50/70 p-4.5 rounded-2xl border border-indigo-200/80 shadow-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-indigo-200/60 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">My Registered Bookings</span>
              <p className="text-xl font-extrabold text-indigo-950 mt-1">{stats.customerCount} Active Clients</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-indigo-200/60 pb-3 sm:pb-0 sm:px-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total Contract Value</span>
              <p className="text-xl font-extrabold text-emerald-800 mt-1">{formatCurrency(stats.myContractValue)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Realized Collections</span>
              <p className="text-xl font-extrabold text-purple-900 mt-1">{formatCurrency(stats.myCollections)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'manager') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-5 rounded-2xl border border-purple-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800">My Budget Available</h3>
            <span className="p-1.5 bg-purple-100 rounded-lg text-purple-700 text-xs">🏛️</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-2 tracking-tight">
            {formatCurrency(stats.managerAvailableBalance)}
          </p>
          <span className="text-[11px] text-purple-600 font-medium mt-1 block">Allocated departmental liquidity</span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 p-5 rounded-2xl border border-blue-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">Pending Team Approvals</h3>
            <span className="p-1.5 bg-blue-100 rounded-lg text-blue-700 text-xs">📋</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-2 tracking-tight">
            {stats.pendingApprovalsCount} <span className="text-base font-medium text-blue-800">({formatCurrency(stats.pendingApprovalsAmount)})</span>
          </p>
          <span className="text-[11px] text-blue-600 font-medium mt-1 block">Requests awaiting your approval</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Team Approved Funds</h3>
            <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 text-xs">✅</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 tracking-tight">
            {formatCurrency(stats.totalTeamApprovedFunds)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Disbursed to team members</span>
        </div>
      </div>
    );
  }

  if (type === 'admin') {
    return (
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-5 rounded-2xl border border-indigo-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Total Treasury Cash</h3>
              <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700 text-xs">🏦</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalOrganizationalFunds)}
            </p>
            <span className="text-[11px] text-indigo-600 font-medium mt-1 block">Primary Bank / Treasury Liquidity</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">Total Allocated Funds</h3>
              <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 text-xs">💳</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalAllocated)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Assigned operational budget</span>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-red-50/50 p-5 rounded-2xl border border-rose-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">Total Spent / Realized</h3>
              <span className="p-1.5 bg-rose-100 rounded-lg text-rose-700 text-xs">📉</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalSpent)}
            </p>
            <span className="text-[11px] text-rose-600 font-medium mt-1 block">Cumulative company expenditures</span>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-gray-100/80 p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Active Users</h3>
              <span className="p-1.5 bg-slate-200 rounded-lg text-slate-700 text-xs">👥</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">
              {stats.activeUsers}
            </p>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Fund-controlled personnel</span>
          </div>
        </div>

        {stats.totalCustomers > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-4.5 rounded-2xl border border-emerald-200/80 shadow-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-emerald-200/60 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Total Customer Contracts ({stats.totalCustomers})</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.totalCustomerContracts)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-emerald-200/60 pb-3 sm:pb-0 sm:px-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total Inflow Collected</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatCurrency(stats.totalCustomerCollections)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Outstanding Receivables</span>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{formatCurrency(stats.totalCustomerReceivables)}</p>
            </div>
          </div>
        )}

        {stats.totalProperties > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-amber-50/90 to-orange-50/70 p-4.5 rounded-2xl border border-amber-200/80 shadow-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-amber-200/60 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Land Parcels Acquired ({stats.totalProperties})</span>
              <p className="text-xl font-extrabold text-amber-950 mt-1">{formatCurrency(stats.totalLandValuation)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-amber-200/60 pb-3 sm:pb-0 sm:px-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Disbursed to Land Owners</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatCurrency(stats.totalLandPayouts)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Pending Land Liabilities</span>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{formatCurrency(stats.totalLandLiabilities)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'accounting') {
    return (
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-5 rounded-2xl border border-indigo-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Treasury Liquidity</h3>
              <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700 text-xs">🏦</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalOrganizationalFunds)}
            </p>
            <span className="text-[11px] text-indigo-600 font-medium mt-1 block">Across {stats.totalWallets || 0} active wallets</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Allocated Funds</h3>
              <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 text-xs">💳</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalAllocated)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Assigned operational budget</span>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-red-50/50 p-5 rounded-2xl border border-rose-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Realized Expenses</h3>
              <span className="p-1.5 bg-rose-100 rounded-lg text-rose-700 text-xs">📉</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-2 tracking-tight">
              {formatCurrency(stats.totalRecordedExpenses)}
            </p>
            <span className="text-[11px] text-rose-600 font-medium mt-1 block">{stats.expenseCount || 0} recorded receipts</span>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Budget Utilization</h3>
              <span className="p-1.5 bg-amber-100 rounded-lg text-amber-700 text-xs">📊</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-2 tracking-tight">
              {stats.budgetUtilization || '0%'}
            </p>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">Spent: {formatCurrency(stats.totalSpent)}</span>
          </div>
        </div>

        {stats.totalCustomers > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-teal-50/90 to-emerald-50/80 p-4.5 rounded-2xl border border-teal-200/80 shadow-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-teal-200/60 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">Total Customer Contracts ({stats.totalCustomers})</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.totalCustomerContracts)}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-teal-200/60 pb-3 sm:pb-0 sm:px-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Bank Collections Realized</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatCurrency(stats.totalCustomerCollections)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Total Market Receivables</span>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{formatCurrency(stats.totalCustomerReceivables)}</p>
            </div>
          </div>
        )}

        {stats.totalProperties > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gradient-to-r from-amber-50/90 to-orange-50/70 p-4.5 rounded-2xl border border-amber-200/80 shadow-sm">
            <div className="border-b sm:border-b-0 sm:border-r border-amber-200/60 pb-3 sm:pb-0 sm:pr-4">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">Fixed Land Assets (1510)</span>
              <p className="text-xl font-extrabold text-amber-950 mt-1">{formatCurrency(stats.totalLandValuation)} <span className="text-sm font-semibold text-amber-800">({stats.totalProperties} Parcels)</span></p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-amber-200/60 pb-3 sm:pb-0 sm:px-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Disbursed Outflows</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatCurrency(stats.totalLandPayouts)}</p>
            </div>
            <div className="sm:pl-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Outstanding Land Liabilities</span>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{formatCurrency(stats.totalLandLiabilities)}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
