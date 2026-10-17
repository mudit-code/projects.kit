"use client";

import { useState } from "react";
import {
  FolderPlus,
  Users,
  Layers,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { getTimePhrase } from "@/lib/timePhrases";

export type ProjectInitiative = {
  id: string;
  course: string;
  stream: string;
  year: string;
  section: string;
  category: "Academic" | "Non-Academic";
  projectType: "Mini Project" | "Other";
  customProjectName?: string;
  subjectCode?: string;
  startDate: string;
  deadline: string;
  publishedAt: string;
  status: "Active" | "Upcoming" | "Draft";
  publishedBy: string;
  assignedTo?: "self" | "faculty";
  coordinator?: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
};

export function HodDashboardHome() {
  const [timeData] = useState(() => {
    const hour = new Date().getHours();
    return getTimePhrase(hour, "HOD");
  });
  const TimeIcon = timeData.icon;

  return (
    <div className="w-full space-y-6">
      {/* Hero Welcome & Action Banner */}
      <div className="p-6 md:p-8 bg-[#F6F5F2] border border-slate-200/90 rounded-3xl shadow-xs relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-20 translate-x-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#10334A] flex items-center gap-3">
              <TimeIcon className="w-7 h-7 text-[#0D3481]" />
              {timeData.phrase}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Initiate, oversee, and publish departmental project workflows, rubric assessments, and student batch milestones.
            </p>
          </div>

          {/* PRIMARY OPTION: START A PROJECT (Navigates to dedicated page) */}
          <div className="shrink-0">
            <Link
              href="/hod/projects/new"
              className="px-6 py-3.5 rounded-2xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2.5 active:scale-98 group"
            >
              <FolderPlus className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Start a Project</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/hod/students"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md hover:border-[#0D3481]/30 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D3481] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-[#0D3481] transition-colors">
                Students Directory
              </p>
              <p className="text-xs text-slate-500">348 Enrolled Final Year Roster</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0D3481] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/hod/projects"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md hover:border-[#0D3481]/30 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                Project Directory
              </p>
              <p className="text-xs text-slate-500">Multi-Session Capstone Archive</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/hod/roles"
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md hover:border-[#0D3481]/30 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Role Management
              </p>
              <p className="text-xs text-slate-500">Faculty & Coordinator Access</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

      </div>
    </div>
  );
}
