"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { RoleType, ROLE_DATA, saveActiveSession } from "@/lib/auth";
import { RoleSelector } from "@/components/RoleSelector";

export function LoginPageClient({
  onLoginSuccess,
  onBackToPublic,
}: {
  onLoginSuccess?: (role: RoleType) => void;
  onBackToPublic?: () => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState<RoleType>("HOD");
  const [email, setEmail] = useState(ROLE_DATA.HOD.email);
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    setEmail(ROLE_DATA[newRole].email);
    setPassword("••••••••");
    setError("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your institutional email.");
      return;
    }

    setLoading(true);
    setError("");

    // Simulate login & establish role session
    setTimeout(() => {
      const roleData = ROLE_DATA[role];
      saveActiveSession({
        role,
        email,
        name: roleData.name,
        dept: roleData.dept,
      });

      if (onLoginSuccess) {
        onLoginSuccess(role);
      } else {
        router.push(role === "HOD" ? "/hod" : "/coordinator");
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#F6F5F2] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 relative">
          {onBackToPublic && (
            <button
              onClick={onBackToPublic}
              type="button"
              className="absolute left-6 top-6 text-xs text-slate-400 hover:text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              ← Student Portal
            </button>
          )}
          {/* Header with KIT Logo */}
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
            <div className="h-14 sm:h-16 max-w-[240px] flex items-center justify-center mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kit.png"
                alt="KIT Logo"
                className="max-h-full w-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-extrabold text-[#10334A] tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sign in to your <span className="font-bold text-[#0D3481]">projects.kit</span> account
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            {/* Role Selector Cards matching user design */}
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
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@kit.ac.in"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#10334A]">
                  Password
                </label>
                <span className="text-[11px] text-[#0D3481] font-semibold cursor-pointer hover:underline">
                  Forgot?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Active Role Preview */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-[#0D3481] shrink-0" />
              <div className="truncate">
                Logging in as <strong className="text-[#0D3481]">{ROLE_DATA[role].name}</strong> ({ROLE_DATA[role].roleLabel})
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0D3481] hover:bg-[#0A2761] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#0D3481]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In as {ROLE_DATA[role].roleLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Campus SSO Enabled</span>
            </div>
            <div className="font-semibold text-slate-400">
              Session: 2026-27
            </div>
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

export default LoginPageClient;
