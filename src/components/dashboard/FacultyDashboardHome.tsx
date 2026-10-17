"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  Users,
  ChevronRight,
  BookOpen,
  Layers,
  GraduationCap,
  ClipboardCheck,
  FileText,
  Target,
} from "lucide-react";
import Link from "next/link";
import { getTimePhrase } from "@/lib/timePhrases";

export function FacultyDashboardHome() {
  const [timeData] = useState(() => {
    const hour = new Date().getHours();
    return getTimePhrase(hour, "COORDINATOR");
  });
  const TimeIcon = timeData.icon;

  return (
    <div className="w-full space-y-6">
      {/* Hero Welcome Banner */}
      <div className="p-6 md:p-8 bg-[#F6F5F2] border border-slate-200/90 rounded-3xl shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-slate-200/40 rounded-full blur-2xl pointer-events-none translate-y-20 -translate-x-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0D3481] border border-slate-200/80 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-[#0D3481]" />
              Faculty · Project Coordinator
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#10334A] flex items-center gap-3">
              <TimeIcon className="w-7 h-7 text-[#0D3481]" />
              {timeData.phrase}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Review assigned projects, manage student submissions, and coordinate with the department seamlessly.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/coordinator/students"
          className="p-5 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-[#0D3481]/30 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D3481] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-[#0D3481] transition-colors">
                Students
              </p>
              <p className="text-xs text-slate-500">Assigned Student Roster</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0D3481] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/coordinator/projects"
          className="p-5 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-[#0D3481]/30 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                Project Directory
              </p>
              <p className="text-xs text-slate-500">Review & Evaluate</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
        </Link>


        <div className="p-5 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs flex items-center justify-between opacity-60">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Evaluations</p>
              <p className="text-xs text-slate-500">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Section */}
      <div className="p-6 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Projects assigned to you for coordination and evaluation
            </p>
          </div>
        </div>

        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No assigned projects yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Projects will appear here once the HOD assigns them to you.
          </p>
        </div>
      </div>
    </div>
  );
}
