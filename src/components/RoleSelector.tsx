"use client";

import React from "react";
import { GraduationCap, BookOpen, LucideIcon } from "lucide-react";
import { RoleType } from "@/lib/auth";

export interface RoleOption {
  role: RoleType;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "HOD",
    icon: GraduationCap,
    title: "HOD",
    subtitle: "Administration",
  },
  {
    role: "COORDINATOR",
    icon: BookOpen,
    title: "Faculty",
    subtitle: "Project Coordinator",
  },
];

export function RoleSelector({
  selectedRole,
  onSelectRole,
}: {
  selectedRole: RoleType;
  onSelectRole: (role: RoleType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full select-none">
      {ROLE_OPTIONS.map((opt) => {
        const isSelected = selectedRole === opt.role;
        const Icon = opt.icon;
        return (
          <button
            key={opt.role}
            type="button"
            onClick={() => onSelectRole(opt.role)}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-center cursor-pointer transition-all duration-150 ${
              isSelected
                ? "bg-blue-50/70 border-2 border-[#0D3481] shadow-xs"
                : "bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 leading-none">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isSelected ? "text-[#0D3481]" : "text-slate-500"
                }`}
              />
              <span
                className={`text-xs sm:text-sm font-bold ${
                  isSelected ? "text-[#0D3481]" : "text-[#10334A]"
                }`}
              >
                {opt.title}
              </span>
            </div>
            <span
              className={`text-[10px] sm:text-[11px] leading-tight mt-1 truncate max-w-full ${
                isSelected ? "text-[#0D3481]/80 font-medium" : "text-slate-400 font-normal"
              }`}
            >
              {opt.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default RoleSelector;
