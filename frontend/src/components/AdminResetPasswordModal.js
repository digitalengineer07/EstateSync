"use client";

import { useState } from "react";
import { API_URL } from "@/config/api";
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Lock,
} from "lucide-react";
import {
  validatePasswordStrength,
  generateSecurePassword,
} from "@/utils/passwordValidator";

export default function AdminResetPasswordModal({ user, isOpen, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  // Real-time criteria checks
  const isMin8 = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const validation = validatePasswordStrength(newPassword);
  const isStrong = validation.isValid;

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword(12);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirm(true);
    setError("");
  };

  const handleCopy = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    const val = validatePasswordStrength(newPassword);
    if (!val.isValid) {
      setError(val.error);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/v1/users/${user.id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset user password.");
      }

      setSuccessMsg(data.message || "Password reset successfully!");
      if (onSuccess) onSuccess(user, newPassword);

      // Auto close after brief display
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      setError(err.message || "Something went wrong resetting password.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMsg("");
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff6b12] text-white flex items-center justify-center shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset Account Password</h3>
              <p className="text-xs text-slate-300">
                Administrator Override &bull; No current password required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target User Info Banner */}
        <div className="px-6 py-3.5 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
              Target User Account
            </div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-slate-500">({user.email})</span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-orange-700 border border-orange-200 shadow-2xs">
            {user.role?.name || user.role || "USER"}
          </span>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Security Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldAlert className="w-4 h-4 text-[#ff6b12] shrink-0 mt-0.5" />
            <span>
              As an Administrator, you can assign a new password directly. If this account was temporarily locked due to failed login attempts, this reset will immediately restore active access.
            </span>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Generate Action */}
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Set New Password <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-[#ff6b12] hover:bg-orange-50 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Generate Secure Password</span>
            </button>
          </div>

          {/* New Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters (letters + numbers/symbols)"
              required
              className="w-full pl-10 pr-20 py-2.5 bg-slate-50/80 border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition font-mono"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
              {newPassword && (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy password to clipboard"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password to confirm"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-300 focus:border-[#ff6b12] focus:ring-2 focus:ring-orange-500/20 rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Real-Time Security Checklist */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Password Security Requirements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-1.5 ${isMin8 ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMin8 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter && hasDigitOrSymbol ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasLetter && hasDigitOrSymbol ? "text-emerald-600" : "text-slate-300"}`} />
                <span>Letters &amp; numbers/symbols</span>
              </div>
              <div className={`flex items-center gap-1.5 ${newPassword && isStrong ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && isStrong ? "text-emerald-600" : "text-slate-300"}`} />
                <span>Not weak or commonly used</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatch ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMatch ? "text-emerald-600" : "text-slate-300"}`} />
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isMin8 || !isMatch || !isStrong}
              className="px-5 py-2.5 rounded-xl bg-[#ff6b12] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2 text-xs"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Confirm Password Reset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
