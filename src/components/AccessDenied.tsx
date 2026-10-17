"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, UserCheck, ShieldCheck, RefreshCw } from "lucide-react";
import { RoleType, ROLE_DATA, saveActiveSession } from "@/lib/auth";

interface AccessDeniedProps {
  requiredRole?: RoleType;
  currentRole?: RoleType;
  routeName?: string;
  onSwitchRole?: () => void;
}

export function AccessDenied({
  requiredRole = "HOD",
  currentRole = "COORDINATOR",
  routeName = "this page",
  onSwitchRole,
}: AccessDeniedProps) {
  const currentRoleInfo = ROLE_DATA[currentRole] || ROLE_DATA.COORDINATOR;
  const requiredRoleInfo = ROLE_DATA[requiredRole] || ROLE_DATA.HOD;

  const handleQuickSwitch = () => {
    if (onSwitchRole) {
      onSwitchRole();
      return;
    }
    // Switch to required role (HOD) for demo convenience
    const targetData = ROLE_DATA[requiredRole];
    saveActiveSession({
      role: requiredRole,
      email: targetData.email,
      name: targetData.name,
      dept: targetData.dept,
    });
    window.location.reload();
  };

  return (
    <div className="w-full flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none translate-y-12 -translate-x-12" />

        <div className="relative z-10 space-y-5">
          {/* Top Badge & Security Icon */}
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 shadow-xs mb-1">
            <ShieldAlert className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80">
              <Lock className="w-3 h-3 text-rose-600" />
              <span>403 &bull; Role-Restricted Route</span>
            </div>
            <h2 className="text-2xl font-black text-[#10334A] tracking-tight">
              Access Restricted
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              You do not have administrative clearance to access <span className="font-bold text-[#0D3481]">{routeName}</span>.
            </p>
          </div>

          {/* Role Comparison Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>Active Session</span>
              </div>
              <div className="font-extrabold text-[#10334A] flex items-center gap-1.5">
                <span className="text-sm">{currentRoleInfo.emoji}</span>
                <span>{currentRoleInfo.roleLabel}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                {currentRoleInfo.name}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
              <div className="text-[10px] font-bold text-[#0D3481] uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#0D3481]" />
                <span>Required Authority</span>
              </div>
              <div className="font-extrabold text-[#0D3481] flex items-center gap-1.5">
                <span className="text-sm">{requiredRoleInfo.emoji}</span>
                <span>{requiredRoleInfo.roleLabel}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                {requiredRoleInfo.name} (Admin)
              </div>
            </div>
          </div>

          {/* Governance Notice */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-left text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-[#0D3481] font-bold">Separation of Duties (SoD): </strong>
            Under Kanpur Institute of Technology departmental policy, only the Head of Department holds administrative privileges for role assignment and departmental project dispatches.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleQuickSwitch}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch to HOD Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
