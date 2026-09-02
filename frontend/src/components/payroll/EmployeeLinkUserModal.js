"use client";

import { useState, useEffect } from "react";
import { linkUser, unlinkUser } from "@/services/employeeService";
import { apiRequest } from "@/services/apiClient";
import { X, Link2, Unlink, AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export default function EmployeeLinkUserModal({
  isOpen,
  onClose,
  employee,
  onSuccess
}) {
  const isLinked = Boolean(employee?.userId);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && !isLinked) {
      const fetchAvailableUsers = async () => {
        setLoadingUsers(true);
        setError(null);
        try {
          const res = await apiRequest("/api/v1/users/all", { method: "GET" });
          if (res.success && Array.isArray(res.users)) {
            setUsers(res.users);
          }
        } catch (err) {
          setError("Failed to load system user accounts: " + err.message);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchAvailableUsers();
    }
  }, [isOpen, isLinked]);

  if (!isOpen || !employee) return null;

  const handleLink = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select a User account to link.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await linkUser(employee.id, selectedUserId);
      if (onSuccess) onSuccess(result.employee);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to link user account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await unlinkUser(employee.id);
      if (onSuccess) onSuccess(result.employee);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to unlink user account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLinked
                ? "bg-rose-50 border border-rose-100 text-rose-600"
                : "bg-indigo-50 border border-indigo-100 text-indigo-600"
            }`}>
              {isLinked ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isLinked ? "Unlink System User Account" : "Link Login User Account"}
              </h3>
              <p className="text-xs text-slate-500">
                {isLinked ? "Sever login credential binding" : "Bind an active system login to this employee"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="font-bold text-slate-900">{employee.fullName}</div>
            <div className="text-slate-500 mt-0.5">
              Code: <span className="font-mono text-slate-700">{employee.employeeCode}</span> • {employee.designation} ({employee.department})
            </div>
          </div>

          {isLinked ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="text-slate-500">Currently Linked User:</div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{employee.user?.name || "Linked User"}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {employee.user?.email || "No email on record"} • Role: {employee.user?.role?.name || "STAFF"}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Unlinking will convert this staff profile to a non-login employee. The login User account itself will remain active in the system.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Unlinking...</span>
                    </>
                  ) : (
                    <span>Confirm Unlink</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select System User Account <span className="text-rose-500">*</span>
                </label>
                {loadingUsers ? (
                  <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading system accounts...</span>
                  </div>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    required
                  >
                    <option value="">-- Choose User Login Account --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role?.name || "USER"}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Connects the employee's HR master record with their active login session and role permissions.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loadingUsers}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Linking...</span>
                    </>
                  ) : (
                    <span>Link Account</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
