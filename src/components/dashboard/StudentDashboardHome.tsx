"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  FileText,
  GraduationCap,
  ArrowRight,
  Clock,
  CalendarDays,
  BookOpen,
  Inbox,
  Layers,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { getTimePhrase } from "@/lib/timePhrases";
import { isStudentEligibleForForm } from "@/lib/formTargeting";
import { DEFAULT_STUDENT_PROFILE } from "./EditProfileModal";

export function StudentDashboardHome() {
  const [studentName, setStudentName] = useState("Student");
  const [formCount, setFormCount] = useState(0);
  const [timeData, setTimeData] = useState(() => {
    return getTimePhrase(12);
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kit_student_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setStudentName(parsed.name.split(" ")[0]);
      }
    } catch {
      // ignore
    }

    // Count pending forms eligible for this student
    try {
      let prof = DEFAULT_STUDENT_PROFILE;
      const storedProf = localStorage.getItem("kit_student_profile");
      if (storedProf) prof = JSON.parse(storedProf);

      const stored = localStorage.getItem("kit_published_initiatives");
      if (stored) {
        const parsed: any[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const eligible = parsed.filter((item) => isStudentEligibleForForm(prof, item));
          setFormCount(eligible.length);
        }
      }
    } catch {
      // ignore
    }

    const currentHour = new Date().getHours();
    setTimeData(getTimePhrase(currentHour));
  }, []);

  const TimeIcon = timeData.icon;

  return (
    <div className="w-full space-y-6">
      {/* Hero Welcome Banner */}
      <div className="p-6 md:p-8 bg-[#F6F5F2] border border-slate-200/90 rounded-3xl shadow-xs relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-slate-200/40 rounded-full blur-2xl pointer-events-none translate-y-20 -translate-x-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0D3481] border border-slate-200/80 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-[#0D3481]" />
              Student Dashboard
            </div>
            <h1 suppressHydrationWarning className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#10334A] flex items-center gap-3">
              <TimeIcon className="w-7 h-7 text-[#0D3481]" />
              <span suppressHydrationWarning>{timeData.phrase}</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Hey {studentName} — access your projects, respond to faculty forms, and track your
              academic milestones all in one place.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
              <p className="text-2xl font-extrabold text-[#0D3481]">{formCount}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Pending Forms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — GO TO PROJECTS & FORMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Go to My Projects */}
        <Link
          href="/projects"
          className="group relative p-6 bg-[#F6F5F2] border-2 border-slate-200/80 rounded-2xl shadow-xs hover:shadow-lg hover:border-[#0D3481]/40 transition-all overflow-hidden"
        >
          {/* Decorative gradient corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-bl-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D3481] to-[#143d8f] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#0D3481] group-hover:translate-x-1 transition-all mt-1" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mt-4 group-hover:text-[#0D3481] transition-colors">
              My Projects
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              View your active projects, track submissions, deadlines, and
              milestones across all academic sessions.
            </p>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Layers className="w-3.5 h-3.5 text-[#0D3481]" />
                All Sessions
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Target className="w-3.5 h-3.5 text-[#0D3481]" />
                Track Progress
              </div>
            </div>
          </div>
        </Link>

        {/* Go to Forms */}
        <Link
          href="/forms"
          className="group relative p-6 bg-[#F6F5F2] border-2 border-slate-200/80 rounded-2xl shadow-xs hover:shadow-lg hover:border-purple-400/40 transition-all overflow-hidden"
        >
          {/* Decorative gradient corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100/40 to-transparent rounded-bl-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                {formCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 animate-pulse">
                    {formCount} New
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all mt-1" />
              </div>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mt-4 group-hover:text-purple-700 transition-colors">
              Forms & Notices
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              View and respond to project forms, academic notices, and
              requirements published by HOD or faculty.
            </p>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Inbox className="w-3.5 h-3.5 text-purple-600" />
                Faculty Forms
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                Deadlines
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Academic</p>
            <p className="text-[11px] text-slate-500">
              Mini Project &amp; Capstone
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Session</p>
            <p className="text-[11px] text-slate-500">2023-27 Batch</p>
          </div>
        </div>

        <div className="p-4 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D3481] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Quick Start</p>
            <p className="text-[11px] text-slate-500">
              All tools in sidebar →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
