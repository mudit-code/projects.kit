"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { RoleType, ROLE_DATA, saveActiveSession, getRoleHomeRoute } from "@/lib/auth";
import { RoleSelector } from "@/components/RoleSelector";
import { Logo } from "@/components/Logo";

interface HiddenLoginPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (role: RoleType) => void;
  sessionExpired?: boolean;
}

export function HiddenLoginPanel({
  isOpen,
  onClose,
  onLoginSuccess,
  sessionExpired = false,
}: HiddenLoginPanelProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<RoleType>("HOD");
  const [email, setEmail] = useState(ROLE_DATA.HOD.email);
  const [password, setPassword] = useState("kit@projects2026");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync role change
  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    setEmail(ROLE_DATA[newRole].email);
    setPassword("kit@projects2026");
    setError("");
  };

  // Lock body scroll and handle Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your institutional email.");
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      const roleData = ROLE_DATA[role];
      saveActiveSession({
        role,
        email: email.trim(),
        name: roleData.name,
        dept: roleData.dept,
      });

      onClose();

      if (onLoginSuccess) {
        onLoginSuccess(role);
      } else {
        router.push(getRoleHomeRoute(role));
      }
    }, 400);
  };

  if (!mounted || !isOpen || typeof document === "undefined") {
    return null;
  }

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hidden-login-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200/90 p-6 sm:p-7 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 relative text-left"
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-4 sm:hidden" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close hidden login panel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with New Logo */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
          <div className="flex items-center justify-center mb-2.5">
            <Logo href="/" size="lg" />
          </div>

          <p
            id="hidden-login-title"
            className="text-xs sm:text-sm text-slate-500 max-w-xs"
          >
            Authorized sign-in for Head of Department (HOD) and Faculty Coordinators
          </p>
        </div>

        {/* Session Expired Notice */}
        {sessionExpired && (
          <div className="mt-4 px-3.5 py-2.5 bg-neutral-100 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-600 flex items-center gap-2 animate-in fade-in duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
            <span className="tracking-tight">Session expired</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Role Selector Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Role
            </label>
            <RoleSelector selectedRole={role} onSelectRole={handleRoleChange} />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-[#10334A] mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@kit.ac.in"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-[#10334A] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Active Persona Confirmation */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-[#0D3481] shrink-0" />
            <div className="truncate">
              Signing in as <strong className="text-[#0D3481]">{ROLE_DATA[role].name}</strong> ({ROLE_DATA[role].roleLabel})
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#0D3481] hover:bg-[#0A2761] active:bg-[#081F4D] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#0D3481]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {ROLE_DATA[role].roleLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/admin");
            }}
            className="text-[#0D3481] hover:underline font-semibold cursor-pointer"
          >
            Open Standalone Admin Page &rarr;
          </button>
          <span>Tap &amp; hold logo anytime</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default HiddenLoginPanel;
