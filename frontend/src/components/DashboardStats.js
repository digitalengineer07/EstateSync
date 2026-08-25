"use client";

import { useState, useEffect } from "react";

// type can be 'wallet', 'manager', or 'admin'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 animate-pulse">
        <div className="bg-gray-100 p-6 rounded-lg h-28"></div>
        <div className="bg-gray-100 p-6 rounded-lg h-28"></div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (type === 'wallet') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-green-50 p-6 rounded-lg border border-green-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-green-800">Available Balance</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.availableBalance)}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-blue-800">Total Spent</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(stats.totalSpent)}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-orange-800">Pending Requests</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(stats.pendingRequestsAmount)}</p>
        </div>
      </div>
    );
  }

  if (type === 'manager') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-purple-800">My Budget Available</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(stats.managerAvailableBalance)}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-blue-800">Pending Approvals</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pendingApprovalsCount} <span className="text-lg font-normal text-blue-700">({formatCurrency(stats.pendingApprovalsAmount)})</span></p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-red-800">Total Team Approvals</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(stats.totalTeamApprovedFunds)}</p>
        </div>
      </div>
    );
  }

  if (type === 'admin') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-indigo-800">Total Org Cash</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{formatCurrency(stats.totalOrganizationalFunds)}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-green-800">Total Allocated</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalAllocated)}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-100 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-red-800">Total Spent</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(stats.totalSpent)}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Active Users</h3>
          <p className="text-3xl font-bold text-gray-600 mt-2">{stats.activeUsers}</p>
        </div>
      </div>
    );
  }

  return null;
}
