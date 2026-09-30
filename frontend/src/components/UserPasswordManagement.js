"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/api";
import {
  KeyRound,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Users,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import AdminResetPasswordModal from "./AdminResetPasswordModal";

export default function UserPasswordManagement({ onNavigateToRegistration }) {
  const { user: currentAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'DEACTIVATED'
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null); // { user, targetStatus: boolean }
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [recentActionMessage, setRecentActionMessage] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    "/api/v1/users/all",
    fetcher,
    {
      refreshInterval: 120000,
      revalidateOnFocus: true,
    }
  );

  const users = data?.users || [];

  // Extract unique roles for filtering
  const availableRoles = useMemo(() => {
    const rolesSet = new Set();
    users.forEach((u) => {
      const r = u.role?.name || (typeof u.role === "string" ? u.role : "");
      if (r) rolesSet.add(r.toUpperCase());
    });
    return Array.from(rolesSet);
  }, [users]);

  // Counts for status tabs
  const activeCount = useMemo(() => users.filter((u) => u.isActive !== false).length, [users]);
  const deactivatedCount = useMemo(() => users.filter((u) => u.isActive === false).length, [users]);

  // Filtered users based on search, role, and activation status
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const roleName = (u.role?.name || (typeof u.role === "string" ? u.role : "")).toUpperCase();
      const isUserActive = u.isActive !== false;

      // Status filter
      if (statusFilter === "ACTIVE" && !isUserActive) return false;
      if (statusFilter === "DEACTIVATED" && isUserActive) return false;

      // Role filter
      if (roleFilter !== "ALL" && roleName !== roleFilter) return false;

      // Search filter
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleResetSuccess = (targetUser) => {
    setRecentActionMessage({
      type: "success",
      title: `Password Reset Completed for ${targetUser.name}`,
      text: `Account (${targetUser.email}) updated successfully. Any active lockout restriction was cleared.`,
      timestamp: new Date().toLocaleTimeString(),
    });
    mutate();
    setTimeout(() => {
      setRecentActionMessage(null);
    }, 10000);
  };

  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    const { user, targetStatus } = userToToggleStatus;

    try {
      setStatusLoadingId(user.id);
      setActionError("");
      const token = localStorage.getItem("accessToken");

      const res = await fetch(`${API_URL}/api/v1/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to ${targetStatus ? "activate" : "deactivate"} user account.`);
      }

      setRecentActionMessage({
        type: targetStatus ? "success" : "warning",
        title: targetStatus
          ? `Account Re-activated: ${user.name}`
          : `Account Deactivated: ${user.name}`,
        text: data.message,
        timestamp: new Date().toLocaleTimeString(),
      });

      setUserToToggleStatus(null);
      await mutate();

      setTimeout(() => {
        setRecentActionMessage(null);
      }, 10000);
    } catch (err) {
      setActionError(err.message || "Something went wrong updating user status.");
    } finally {
      setStatusLoadingId(null);
    }
  };

  const getRoleBadgeClass = (roleName) => {
    switch (roleName?.toUpperCase()) {
      case "ADMIN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MANAGER":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ACCOUNTING":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SALES":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "MARKETING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff6b12] to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  User Accounts, Activation &amp; Password Management
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-50 text-[#ff6b12] border border-orange-200">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Control user credentials and platform access. Deactivate user accounts to immediately block them from signing in, re-activate when needed, or reset passwords directly without knowing current credentials.
              </p>
            </div>
          </div>

          {onNavigateToRegistration && (
            <button
              type="button"
              onClick={onNavigateToRegistration}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          )}
        </div>

        {/* Security Rule Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Direct Admin Password Override</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current password not required. Assign new passwords and clear lockout states instantly.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Account Activation / Deactivation</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Deactivated users are blocked from signing in immediately. Re-activating restores login access.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">8-Char Rule &amp; Rate Limiting</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enforces 8+ characters, rejects common passwords, and applies 15-min lockout on 5 failed attempts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {recentActionMessage && (
        <div
          className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            recentActionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                recentActionMessage.type === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {recentActionMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">{recentActionMessage.title}</p>
              <p className="text-xs opacity-90">{recentActionMessage.text}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecentActionMessage(null)}
            className="text-xs font-bold px-3 py-1 rounded-lg hover:bg-black/5 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-bold">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search, Filter & Action Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name, email, or role..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 transition font-normal"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Account Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DEACTIVATED")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === "DEACTIVATED"
                  ? "bg-white text-rose-700 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-rose-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Deactivated ({deactivatedCount})
            </button>
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 pl-1">
              <Filter className="w-3.5 h-3.5" />
              Role:
            </span>
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                roleFilter === "ALL"
                  ? "bg-[#ff6b12] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {availableRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                  roleFilter === role
                    ? "bg-[#ff6b12] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {role}
              </button>
            ))}

            <button
              type="button"
              onClick={() => mutate()}
              disabled={isValidating}
              title="Refresh User Directory"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition active:scale-95 shrink-0 ml-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-[#ff6b12]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3.5">User Identity</th>
                <th className="px-5 py-3.5">System Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Security Policy</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#ff6b12]" />
                      <span className="font-medium text-xs">Loading user accounts directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">No matching users found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search query, status filter, or role filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleName = u.role?.name || (typeof u.role === "string" ? u.role : "USER");
                  const isCurrentAdmin = u.id === currentAdmin?.id;
                  const isActive = u.isActive !== false;
                  const isProcessing = statusLoadingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`transition group ${
                        !isActive ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-orange-50/40"
                      }`}
                    >
                      {/* User Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shadow-2xs shrink-0 ${
                              isActive ? "bg-slate-900 text-white" : "bg-rose-200 text-rose-800"
                            }`}
                          >
                            {u.name
                              ? u.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrentAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(
                            roleName
                          )}`}
                        >
                          {roleName}
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="px-5 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active (Can Sign In)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Deactivated (Login Blocked)
                          </span>
                        )}
                      </td>

                      {/* Security Policy */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>8+ Chars &bull; Bcrypt</span>
                        </div>
                        <span className="text-[11px] text-slate-400">Rate limit protection enabled</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Activation / Deactivation Button */}
                          {isActive ? (
                            <button
                              type="button"
                              disabled={isCurrentAdmin || isProcessing}
                              onClick={() => setUserToToggleStatus({ user: u, targetStatus: false })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 hover:text-rose-900 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title={
                                isCurrentAdmin
                                  ? "Cannot deactivate your own administrator account"
                                  : `Deactivate ${u.name}'s account and block login access`
                              }
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => setUserToToggleStatus({ user: u, targetStatus: true })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 text-xs font-bold transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs"
                              title={`Re-activate ${u.name}'s account to restore login access`}
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>Re-activate</span>
                            </button>
                          )}

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedUserForReset(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ff6b12] hover:bg-[#ea580c] text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
                            title={`Reset password for ${u.name} without knowing current password`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Password</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2 px-1">
          <span>
            Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of{" "}
            <strong className="text-slate-700">{users.length}</strong> user accounts ({activeCount} active,{" "}
            {deactivatedCount} deactivated)
          </span>
          <span className="text-slate-400">
            Deactivating an account immediately revokes login permissions for that user.
          </span>
        </div>
      </div>

      {/* Confirmation Modal for Status Toggle (Deactivate / Re-activate) */}
      {userToToggleStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                userToToggleStatus.targetStatus ? "bg-slate-900" : "bg-rose-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-md ${
                    userToToggleStatus.targetStatus ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {userToToggleStatus.targetStatus ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {userToToggleStatus.targetStatus ? "Re-activate Account" : "Deactivate User Account"}
                  </h3>
                  <p className="text-xs text-slate-300">Administrator Governance Control</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToToggleStatus(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Target User Account
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  {userToToggleStatus.user.name}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {userToToggleStatus.user.email}
                </div>
                <div className="mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                    Role: {userToToggleStatus.user.role?.name || "USER"}
                  </span>
                </div>
              </div>

              {userToToggleStatus.targetStatus ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    Re-activating this user account will restore their login access immediately. Any previous lockout or restriction will also be removed.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> Deactivating this user will immediately block them from signing into their account. They will see a notice directing them to contact an administrator.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUserToToggleStatus(null)}
                  disabled={Boolean(statusLoadingId)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggleStatus}
                  disabled={Boolean(statusLoadingId)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white transition shadow-md flex items-center gap-2 text-xs cursor-pointer ${
                    userToToggleStatus.targetStatus
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {statusLoadingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : userToToggleStatus.targetStatus ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Confirm Re-activation</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Confirm Deactivation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {selectedUserForReset && (
        <AdminResetPasswordModal
          user={selectedUserForReset}
          isOpen={Boolean(selectedUserForReset)}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={handleResetSuccess}
        />
      )}
    </div>
  );
}
