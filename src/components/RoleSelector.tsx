"use client";

import React from "react";
import { RoleType } from "@/lib/auth";

export interface RoleOption {
  role: RoleType;
  emoji: string;
  title: string;
  subtitle: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "HOD",
    emoji: "🎓",
    title: "HOD",
    subtitle: "Manage Roles",
  },
  {
    role: "STUDENT",
    emoji: "👨‍🎓",
    title: "Student",
    subtitle: "Submit Model",
  },
  {
    role: "COORDINATOR",
    emoji: "👩‍💼",
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
    <div className="grid grid-cols-3 gap-2.5 w-full select-none">
      {ROLE_OPTIONS.map((opt) => {
        const isSelected = selectedRole === opt.role;
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
              <span className="text-sm">{opt.emoji}</span>
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
