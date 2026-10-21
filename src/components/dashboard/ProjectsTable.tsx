"use client";

import { useState, useMemo, useEffect } from "react";
import projectsData from "@/data/projects.json";
import Link from "next/link";
import { getActiveSession } from "@/lib/auth";
import {
  Search,
  Filter,
  X,
  FolderGit2,
  Users,
  UserCheck,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  FileText,
  RotateCw,
  Download,
  Trash2,
} from "lucide-react";

export type Project = {
  id: number | string;
  code: string;
  title: string;
  domain: string;
  branch: string;
  course: string;
  year: string;
  session: string;
  facultyGuide: string;
  teamLead: string;
  teamLeadAfn: string;
  teamLeadRoll: string;
  teamSize: number;
  status: string;
  submissionDate: string;
  isInitiative?: boolean;
  coordinator?: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  deadline?: string;
  startDate?: string;
  subjectCode?: string;
  category?: string;
  section?: string;
  publishedBy?: string;
};

type SortField = "code" | "title" | "branch" | "teamLead" | "facultyGuide" | "status";
type SortDirection = "asc" | "desc";
type StatusTab = "ALL" | "ONGOING" | "COMPLETED";

const SESSIONS = [
  "All Sessions",
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
  "2021-22",
  "2020-21",
  "2019-20",
];

const COURSES = ["All Courses", "B.Tech", "MCA", "M.Tech"];

const BRANCHES = [
  "All Branches",
  "Computer Science & Engineering",
  "Computer Science (AI & ML)",
  "Information Technology",
  "Biotechnology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Electrical & Electronics",
];

const YEARS = ["All Years", "4th Year", "3rd Year", "2nd Year", "1st Year"];

const ROWS_PER_PAGE = 12;

function initiativeToProject(item: any): Project {
  return {
    id: item.id,
    code: item.subjectCode || item.id,
    title: item.customProjectName || item.projectType || "Departmental Project Form",
    domain: `${item.category || "Academic"} · ${item.projectType || "Mini Project"}`,
    branch: item.stream,
    course: item.course,
    year: item.year,
    session: "2026-27",
    facultyGuide: item.coordinator?.name || item.publishedBy || "Rahul Singh (HOD)",
    teamLead: `Sec ${item.section || "All"}`,
    teamLeadAfn: item.section ? `Sec ${item.section}` : "All",
    teamLeadRoll: item.id,
    teamSize: 0,
    status: item.status || "Published",
    submissionDate: item.publishedAt || item.startDate || "Current",
    isInitiative: true,
    coordinator: item.coordinator,
    deadline: item.deadline,
    startDate: item.startDate,
    subjectCode: item.subjectCode,
    category: item.category,
    section: item.section,
    publishedBy: item.publishedBy,
  };
}

function getSectionLetter(project: Project): string {
  if (project.section) {
    const cleaned = project.section.replace(/Sec(?:tion)?\s*/i, "").trim();
    if (cleaned) return cleaned.toUpperCase();
  }
  const match = (project.teamLead || "").match(/Sec(?:tion)?\s*([A-Za-z0-9]+)/i);
  if (match && match[1]) return match[1].toUpperCase();
  if (project.teamLeadAfn) {
    const cleaned = project.teamLeadAfn.replace(/Sec(?:tion)?\s*/i, "").trim();
    if (cleaned) return cleaned.toUpperCase();
  }
  return "A";
}

/**
 * Checks whether a deadline date string has ended.
 * For YYYY-MM-DD inputs, considers the date ended after 23:59:59.999 local/system time.
 */
export function isDateEnded(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  if (!dateStr.includes("T") || dateStr.endsWith("T00:00:00") || dateStr.endsWith("00:00:00.000Z")) {
    d.setHours(23, 59, 59, 999);
  }
  return new Date().getTime() > d.getTime();
}

/**
 * Determines if a project form has completed its full lifecycle.
 * A form lifecycle is ended if:
 * 1. Form status is explicitly "completed", "closed", or "archived"
 * 2. OR the form's final submission deadline (if defined) has passed
 * 3. OR the form's registration last date (deadline) has passed
 */
export function isFormLifecycleEnded(form: any): boolean {
  if (!form) return false;
  if (form.isTrashed) return false;

  const statusLower = String(form.status || "").toLowerCase().trim();
  if (statusLower === "completed" || statusLower === "closed" || statusLower === "archived") {
    return true;
  }

  // The last date of the entire lifecycle is either finalSubmissionDeadline (if configured) or deadline
  const finalDeadline = form.finalSubmissionDeadline || form.deadline;
  if (!finalDeadline) return false;

  return isDateEnded(finalDeadline);
}

export function ProjectsTable() {
  // Horizontal filter states in the exact required order: session -> course -> branch -> year
  const [selectedSession, setSelectedSession] = useState<string>("2026-27");
  const [selectedCourse, setSelectedCourse] = useState<string>("All Courses");
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [selectedYear, setSelectedYear] = useState<string>("All Years");

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [publicSubmissions, setPublicSubmissions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    setIsMounted(true);
    setSession(getActiveSession());

    // Instant local cache read on client mount (safe from SSR hydration mismatch)
    try {
      const storedInit = localStorage.getItem("kit_published_initiatives");
      if (storedInit) setInitiatives(JSON.parse(storedInit));
      const rawSubs = localStorage.getItem("kit_public_submissions");
      if (rawSubs) {
        const parsed = JSON.parse(rawSubs);
        delete parsed["INIT-759402"];
        delete parsed["INIT-BCS751"];
        delete parsed["BCS751"];
        setPublicSubmissions(parsed);
      }
    } catch {}

    const loadData = async () => {
      try {
        const [formsRes, subsRes] = await Promise.all([
          fetch("/api/forms").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/submissions").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (formsRes?.success && Array.isArray(formsRes.forms)) {
          setInitiatives(formsRes.forms);
          localStorage.setItem("kit_published_initiatives", JSON.stringify(formsRes.forms));
        }

        if (subsRes?.success && subsRes.submissions) {
          setPublicSubmissions(subsRes.submissions);
          localStorage.setItem("kit_public_submissions", JSON.stringify(subsRes.submissions));
        }
      } catch {
        // silent fallback
      }
    };

    loadData();
    window.addEventListener("kit-initiatives-change", loadData);
    window.addEventListener("kit-submissions-change", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("kit-initiatives-change", loadData);
      window.removeEventListener("kit-submissions-change", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [res, resSubs] = await Promise.all([
        fetch("/api/forms").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/submissions").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (res?.success && Array.isArray(res.forms)) {
        setInitiatives(res.forms);
        localStorage.setItem("kit_published_initiatives", JSON.stringify(res.forms));
      }
      if (resSubs?.success && resSubs.submissions) {
        setPublicSubmissions(resSubs.submissions);
        localStorage.setItem("kit_public_submissions", JSON.stringify(resSubs.submissions));
      }
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const projects = useMemo<Project[]>(() => {
    if (!isMounted) return [];

    const result: Project[] = [];

    // The Project Directory is strictly the archive for completed projects
    // after a full lifecycle (when the project is submitted and the form last date & whole lifecycle have ended).
    Object.keys(publicSubmissions).forEach((formKey) => {
      const subs = publicSubmissions[formKey];
      if (Array.isArray(subs)) {
        const cleanFormKey = String(formKey || "").trim().toLowerCase();
        const matchedForm = initiatives.find((f: any) => {
          const fId = String(f.id || "").trim().toLowerCase();
          const fCode = String(f.subjectCode || "").trim().toLowerCase();
          return (fId && fId === cleanFormKey) || (fCode && fCode === cleanFormKey);
        });

        subs.forEach((sub: any, idx: number) => {
          const subFormKey = String(sub.formId || "").trim().toLowerCase();
          const effectiveForm =
            matchedForm ||
            (subFormKey
              ? initiatives.find((f: any) => {
                  const fId = String(f.id || "").trim().toLowerCase();
                  const fCode = String(f.subjectCode || "").trim().toLowerCase();
                  return (fId && fId === subFormKey) || (fCode && fCode === subFormKey);
                })
              : null) ||
            sub.form;

          // Projects only appear in the Project Directory once the form last date
          // has ended and the whole lifecycle is completed
          if (!effectiveForm) {
            return;
          }

          if (!isFormLifecycleEnded(effectiveForm)) {
            return;
          }

          // Disregard rejected submissions
          const isRejected =
            String(sub.approvalStatus || "").toLowerCase() === "not_approved" ||
            String(sub.approvalStatus || "").toLowerCase() === "rejected" ||
            String(sub.verificationStatus || "").toLowerCase() === "rejected";
          if (isRejected) {
            return;
          }

          // A project submitted by a student
          const isSubmitted =
            sub.status?.toLowerCase() === "completed" ||
            sub.finalSubmissionCompleted === true ||
            sub.verificationStatus?.toLowerCase() === "verified" ||
            sub.approvalStatus?.toLowerCase() === "approved" ||
            Boolean(sub.submittedAt) ||
            Boolean(sub.projectName);

          if (isSubmitted) {
            result.push({
              id: `PRJ-${sub.student?.afn || idx}-${formKey}`,
              code: sub.formId || effectiveForm.id || formKey,
              title: sub.projectName || "Student Project",
              domain: sub.projectDescription ? sub.projectDescription.slice(0, 60) + "..." : "Completed Project",
              branch: sub.student?.stream || effectiveForm.stream || "Computer Science & Engineering",
              course: sub.student?.course || effectiveForm.course || "B.Tech",
              year: sub.student?.year || effectiveForm.year || "4th Year",
              session: sub.session || "2026-27",
              facultyGuide: sub.guideName || effectiveForm.coordinator?.name || effectiveForm.publishedBy || "Rahul Singh (HOD)",
              teamLead: sub.student?.name || "Student Lead",
              teamLeadAfn: sub.student?.afn || "—",
              teamLeadRoll: sub.student?.rollNumber || "—",
              teamSize: 1 + (sub.teamMembers?.length || 0),
              status: "Completed",
              submissionDate: sub.submittedAt
                ? new Date(sub.submittedAt).toLocaleDateString("en-IN")
                : "Completed",
              isInitiative: false,
              section: sub.student?.section || effectiveForm.section || "A",
            });
          }
        });
      }
    });

    return result;
  }, [isMounted, publicSubmissions, initiatives]);

  const isCompleted = (p: Project) => {
    return p.status?.toLowerCase() === "completed";
  };

  const isOngoing = (p: Project) => {
    return !isCompleted(p);
  };

  // Tab counts based on all projects
  const tabCounts = useMemo(() => {
    return {
      ALL: projects.length,
      ONGOING: projects.filter(isOngoing).length,
      COMPLETED: projects.filter(isCompleted).length,
    };
  }, [projects]);

  // Filter logic
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Status Tab Filter
    if (activeTab === "ONGOING") {
      result = result.filter(isOngoing);
    } else if (activeTab === "COMPLETED") {
      result = result.filter(isCompleted);
    }

    // 1. Session filter
    if (selectedSession !== "All Sessions") {
      result = result.filter((p) => p.session === selectedSession);
    }

    // 2. Course filter
    if (selectedCourse !== "All Courses") {
      result = result.filter((p) => p.course === selectedCourse);
    }

    // 3. Branch filter
    if (selectedBranch !== "All Branches") {
      result = result.filter((p) => p.branch === selectedBranch);
    }

    // 4. Year filter
    if (selectedYear !== "All Years") {
      result = result.filter((p) => p.year === selectedYear);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.domain.toLowerCase().includes(q) ||
          p.teamLead.toLowerCase().includes(q) ||
          p.facultyGuide.toLowerCase().includes(q) ||
          p.teamLeadAfn.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      if (sortDirection === "asc") return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return result;
  }, [
    projects,
    activeTab,
    selectedSession,
    selectedCourse,
    selectedBranch,
    selectedYear,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE));
  const startIndex = filteredProjects.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ROWS_PER_PAGE, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportCSV = (type: "ALL" | "CURRENT") => {
    const dataToExport = type === "ALL" ? projects : filteredProjects;
    if (dataToExport.length === 0) return;

    const headers = [
      "Project ID",
      "Title",
      "Domain",
      "Branch",
      "Course",
      "Year",
      "Session",
      "Team Lead",
      "AFN",
      "Faculty Guide",
      "Status",
      "Date",
    ];

    const rows = dataToExport.map((p) => [
      `"${p.code}"`,
      `"${(p.title || "").replace(/"/g, '""')}"`,
      `"${(p.domain || "").replace(/"/g, '""')}"`,
      `"${p.branch}"`,
      `"${p.course}"`,
      `"${p.year}"`,
      `"${p.session}"`,
      `"${(p.teamLead || "").replace(/"/g, '""')}"`,
      `"${p.teamLeadAfn || ""}"`,
      `"${(p.facultyGuide || "").replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.submissionDate}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `projects_directory_${type.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#0D3481]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#0D3481]" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "Ongoing":
      case "Published":
      case "Active":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#0D3481] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D3481]" />
            Ongoing
          </span>
        );
    }
  };

  const shortBranch = (branch: string) => {
    const map: Record<string, string> = {
      "Computer Science & Engineering": "CSE",
      "Computer Science (AI & ML)": "CSE (AI/ML)",
      "Information Technology": "IT",
      "Biotechnology": "BT",
      "Electronics & Communication": "ECE",
      "Mechanical Engineering": "ME",
      "Electrical & Electronics": "EEE",
    };
    return map[branch] || branch;
  };

  const isFiltered =
    selectedSession !== "2026-27" ||
    selectedCourse !== "All Courses" ||
    selectedBranch !== "All Branches" ||
    selectedYear !== "All Years" ||
    activeTab !== "ALL" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    setSelectedSession("2026-27");
    setSelectedCourse("All Courses");
    setSelectedBranch("All Branches");
    setSelectedYear("All Years");
    setActiveTab("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full flex-1 min-h-[calc(100vh-12rem)] flex flex-col space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
      {/* Pinned Top Header */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#10334A] tracking-tight flex items-center gap-2.5">
            <span className="flex items-center gap-2">
              <FileText size={22} className="text-[#0D3481]" />
              <span>Project Directory</span>
            </span>
            <span suppressHydrationWarning className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredProjects.length}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
          {isMounted && session?.role === "HOD" && (
            <Link
              href="/hod/projects/new"
              className="px-3.5 py-1.5 rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Start a Project</span>
            </Link>
          )}
        </div>
      </div>

      {/* FILTER DIRECTORY CARD (Clean title without horizontal description) */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Filter className="w-3.5 h-3.5 text-[#0D3481]" />
            <span>Filter Directory</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Session Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#0D3481]" />
              Session
            </label>
            <div className="relative">
              <select
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all cursor-pointer text-slate-800"
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "2026-27" ? "2026-27 (Current)" : s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Course Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#0D3481]" />
              Course
            </label>
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all cursor-pointer text-slate-800"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Branch Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FolderGit2 className="w-3 h-3 text-[#0D3481]" />
              Branch
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all cursor-pointer text-slate-800"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Year Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#0D3481]" />
              Year
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all cursor-pointer text-slate-800"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search / Export Bar (Completed Projects Archive) */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Minimal Tab Bar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 self-start overflow-x-auto max-w-full">
          <div className="px-3.5 py-1.5 rounded-lg bg-white text-emerald-800 shadow-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Completed Projects Archive</span>
            <span className="opacity-70 ml-1">({filteredProjects.length})</span>
          </div>
        </div>

        {/* Right Controls: Refresh, CSV Export & Search */}
        <div className="flex items-center gap-2">
          {/* Refresh Table Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Fetch latest projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors whitespace-nowrap"
          >
            <RotateCw size={13} className={`text-slate-500 ${isRefreshing ? "animate-spin text-[#0D3481]" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* CSV Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors whitespace-nowrap"
            >
              <Download size={13} className="text-slate-500" />
              <span>CSV</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs text-slate-700 divide-y divide-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV("ALL");
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between font-bold text-slate-900 cursor-pointer"
                  >
                    <span>All Projects</span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                      {projects.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={filteredProjects.length === 0}
                    onClick={() => {
                      if (filteredProjects.length > 0) {
                        handleExportCSV("CURRENT");
                        setShowExportMenu(false);
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between font-medium ${
                      filteredProjects.length === 0
                        ? "text-slate-400 opacity-50 cursor-not-allowed"
                        : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <span>Current Filtered View</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {filteredProjects.length}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Minimal Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects, startups, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0D3481] focus:border-[#0D3481]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean Table Card: Matching Applications Inbox styling */}
      <div className="flex-1 min-h-[380px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
        {/* Table Overflow Area */}
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase font-semibold tracking-wider text-[11px]">
                <th className="text-left px-4 py-3 w-[48px]">#</th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                  onClick={() => handleSort("code")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    SUB CODE <SortIcon field="code" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-700 select-none min-w-[220px]"
                  onClick={() => handleSort("title")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Title &amp; Domain <SortIcon field="title" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                  onClick={() => handleSort("branch")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Branch · Course <SortIcon field="branch" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                  onClick={() => handleSort("teamLead")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    SECTION <SortIcon field="teamLead" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                  onClick={() => handleSort("facultyGuide")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Faculty Guide / Coord. <SortIcon field="facultyGuide" />
                  </span>
                </th>
                <th
                  className="text-center px-4 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                  onClick={() => handleSort("status")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Status <SortIcon field="status" />
                  </span>
                </th>
                <th className="text-right px-4 py-3 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 my-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                        <FolderGit2 size={24} className="stroke-[1.75]" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No completed projects in this directory yet</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {isFiltered
                          ? "No completed projects match the current search or filter selection."
                          : "Projects will appear here once submitted by students and after the form last date and full project lifecycle have ended."}
                      </p>
                      {isFiltered && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0D3481] text-white hover:bg-[#0b2b6b] transition-colors cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50/30 transition-colors even:bg-slate-50/40 odd:bg-white border-b border-slate-200/80"
                  >
                    {/* Index */}
                    <td className="px-4 py-3.5 font-mono text-slate-400 text-[11px]">
                      {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                    </td>

                    {/* Project ID */}
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#0D3481] whitespace-nowrap">
                      {p.code}
                    </td>

                    {/* Title & Domain */}
                    <td className="px-4 py-3.5">
                      <span
                        className="font-bold text-slate-900 hover:text-[#0D3481] transition-colors cursor-pointer text-xs"
                        onClick={() => setSelectedProject(p)}
                        title={p.title}
                      >
                        {p.title}
                      </span>
                    </td>

                    {/* Branch & Course */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-xs">
                        {shortBranch(p.branch)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {p.course} · {p.year}
                      </div>
                    </td>

                    {/* Section */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-800 text-xs">
                        {getSectionLetter(p)}
                      </span>
                    </td>

                    {/* Faculty Guide */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-[#0D3481]" />
                        <span>{p.facultyGuide}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(isCompleted(p) ? "Completed" : "Ongoing")}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedProject(p)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pinned Pagination Footer (Matching Applications Inbox Design) */}
        <div className="mt-auto shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{startIndex}</span> to{" "}
            <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
            <span className="font-semibold text-slate-700">{filteredProjects.length}</span> projects
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-2xs"
            >
              Previous
            </button>

            <div className="px-2 text-slate-600 font-semibold">
              Page {currentPage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* PROJECT DETAILS MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#0D3481] bg-[#0D3481]/10 px-2 py-0.5 rounded-md">
                    {selectedProject.code}
                  </span>
                  {selectedProject.isInitiative && (
                    <span className="text-[10px] font-bold text-[#0D3481] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Published Departmental Form
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                  {selectedProject.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 text-xs border-y border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Academic Session</span>
                <p className="font-bold text-slate-800">{selectedProject.session}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Status</span>
                <div className="mt-0.5">{getStatusBadge(isCompleted(selectedProject) ? "Completed" : "Ongoing")}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Branch & Degree</span>
                <p className="font-bold text-slate-800">{selectedProject.branch} ({selectedProject.course})</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  {selectedProject.isInitiative ? "Project Category" : "Domain"}
                </span>
                <p className="font-bold text-slate-800">{selectedProject.domain}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  {selectedProject.isInitiative ? "Target Section" : "Team Lead"}
                </span>
                <p className="font-bold text-slate-800">
                  {selectedProject.isInitiative
                    ? `${selectedProject.course} · ${selectedProject.year} (Sec ${selectedProject.section || "All"})`
                    : `${selectedProject.teamLead} (AFN: ${selectedProject.teamLeadAfn})`}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  {selectedProject.isInitiative ? "Coordinator" : "Faculty Guide"}
                </span>
                <p className="font-bold text-slate-800">{selectedProject.facultyGuide}</p>
              </div>
              {selectedProject.isInitiative && selectedProject.deadline && (
                <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Submission Window</span>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono text-[11px]">
                    {selectedProject.startDate} &rarr; <span className="text-red-600 font-bold">{selectedProject.deadline}</span>
                  </p>
                </div>
              )}
              {selectedProject.coordinator?.email && (
                <div className="col-span-2 text-[11px] text-slate-500">
                  Coordinator Contact: <span className="font-semibold text-slate-700">{selectedProject.coordinator.email}</span>
                  {selectedProject.coordinator.phone && ` · ${selectedProject.coordinator.phone}`}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
