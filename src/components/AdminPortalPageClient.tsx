"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  RoleType,
  ROLE_DATA,
  saveActiveSession,
  getActiveSession,
  getRoleHomeRoute,
  isRouteAllowedForRole,
  UserSession,
} from "@/lib/auth";
import { RoleSelector } from "@/components/RoleSelector";
import { Logo } from "@/components/Logo";

interface AdminPortalPageClientProps {
  onLoginSuccess?: (role: RoleType) => void;
}

export function AdminPortalPageClient({ onLoginSuccess }: AdminPortalPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";

  const [mounted, setMounted] = useState(false);
  const [existingSession, setExistingSession] = useState<UserSession | null>(null);
  const [role, setRole] = useState<RoleType>("HOD");
  const [email, setEmail] = useState(ROLE_DATA.HOD.email);
  const [password, setPassword] = useState("kit@projects2026");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  useEffect(() => {
    setMounted(true);
    const session = getActiveSession();
    if (session) {
      setExistingSession(session);
      setRole(session.role);
      setEmail(session.email || ROLE_DATA[session.role].email);
    }

    const expired = searchParams.get("session_expired");
    if (expired === "1" || expired === "true") {
      setSessionExpiredNotice(true);
    }
  }, [searchParams]);

  const dismissExpiredNotice = () => {
    setSessionExpiredNotice(false);
    if (typeof window !== "undefined" && window.history && window.location.search.includes("session_expired")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("session_expired");
      const clean = url.pathname + (url.search ? url.search : "");
      window.history.replaceState({}, "", clean);
    }
  };

  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    setEmail(ROLE_DATA[newRole].email);
    setPassword("kit@projects2026");
    setError("");
  };

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

      if (onLoginSuccess) {
        onLoginSuccess(role);
      } else if (
        redirectTarget &&
        redirectTarget !== "/" &&
        redirectTarget !== "/admin" &&
        isRouteAllowedForRole(redirectTarget, role)
      ) {
        router.push(redirectTarget);
      } else {
        router.push(getRoleHomeRoute(role));
      }
    }, 400);
  };

  const handleContinueExistingSession = () => {
    if (!existingSession) return;
    if (
      redirectTarget &&
      redirectTarget !== "/" &&
      redirectTarget !== "/admin" &&
      isRouteAllowedForRole(redirectTarget, existingSession.role)
    ) {
      router.push(redirectTarget);
    } else {
      router.push(getRoleHomeRoute(existingSession.role));
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-4">
        <div className="text-xs font-semibold text-slate-500">Loading admin portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5F2] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 relative text-left">
          {/* Back to Public Home Button */}
          <Link
            href="/"
            className="absolute left-6 top-6 text-xs text-slate-400 hover:text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>

          {/* Header with New Logo */}
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
            <div className="flex items-center justify-center mb-2.5">
              <Logo href="/" size="lg" />
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-xs">
              Authorized sign-in for Head of Department (HOD) and Faculty Coordinators
            </p>
          </div>

          {/* Session Expired Notice */}
          {sessionExpiredNotice && (
            <div className="mt-4 px-3.5 py-2.5 bg-neutral-100 border border-neutral-200/90 rounded-xl text-xs font-medium text-neutral-600 flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                <span className="tracking-tight">Session expired</span>
              </div>
              <button
                type="button"
                onClick={dismissExpiredNotice}
                className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer transition-colors"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Session Notice (if already signed in) */}
          {existingSession && (
            <div className="mt-4 flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900">
              <div className="truncate">
                Signed in as <strong>{existingSession.name}</strong> ({existingSession.role})
              </div>
              <button
                type="button"
                onClick={handleContinueExistingSession}
                className="text-xs font-bold text-[#0D3481] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Dashboard &rarr;
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Role Selector */}
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

          {/* Footer inside card */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Session: 2026-27</span>
            <span>Tap &amp; hold logo anytime</span>
          </div>
        </div>

        {/* Page Footer */}
        <p className="text-center text-xs text-slate-400 mt-4">
          projects.kit &bull; Academic Project Lifecycle &amp; Rubric Suite
        </p>
      </div>
    </div>
  );
}

export default AdminPortalPageClient;
