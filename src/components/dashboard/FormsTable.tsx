"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getActiveSession } from "@/lib/auth";
import {
  Search,
  Filter,
  X,
  FolderGit2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FolderPlus,
  FileText,
  RotateCw,
  Download,
  Trash2,
  UserCheck,
  FileCheck2,
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
    teamLead: `Cohort (Sec ${item.section || "All"})`,
    teamLeadAfn: item.section ? `Sec ${item.section}` : "All",
    teamLeadRoll: item.id,
    teamSize: 0,
    status: item.status || "Active",
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

export function FormsTable() {
  // Horizontal filter states: session -> course -> branch -> year
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
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    setSession(getActiveSession());

    // Instant local cache read on client mount (safe from SSR hydration mismatch)
    try {
      const stored = localStorage.getItem("kit_published_initiatives");
      if (stored) {
        setInitiatives(JSON.parse(stored));
      }
    } catch {}
    const loadInitiatives = async () => {
      try {
        const res = await fetch("/api/forms");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.forms)) {
            setInitiatives(data.forms);
            localStorage.setItem("kit_published_initiatives", JSON.stringify(data.forms));
            return;
          }
        }
      } catch {
        // fallback to localStorage cache
      }
      try {
        const stored = localStorage.getItem("kit_published_initiatives");
        const list: any[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem("kit_published_initiatives", JSON.stringify(list));
        setInitiatives(list);
      } catch {
        setInitiatives([]);
      }
    };

    loadInitiatives();

    window.addEventListener("kit-initiatives-change", loadInitiatives);
    window.addEventListener("storage", loadInitiatives);
    return () => {
      window.removeEventListener("kit-initiatives-change", loadInitiatives);
      window.removeEventListener("storage", loadInitiatives);
    };
  }, []);

  const handleDeleteInitiative = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to remove this published form?")) return;
    try {
      await fetch(`/api/forms/${encodeURIComponent(id)}?permanent=true`, {
        method: "DELETE",
      });
      const stored = localStorage.getItem("kit_published_initiatives");
      const list = stored ? JSON.parse(stored) : [];
      const updated = list.filter((item: any) => item.id !== id);
      localStorage.setItem("kit_published_initiatives", JSON.stringify(updated));
      setInitiatives(updated);
      window.dispatchEvent(new Event("kit-initiatives-change"));
      if (selectedProject && String(selectedProject.id) === String(id)) {
        setSelectedProject(null);
      }
    } catch {
      // ignore
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/forms");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.forms)) {
          setInitiatives(data.forms);
          localStorage.setItem("kit_published_initiatives", JSON.stringify(data.forms));
        }
      }
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const projects = useMemo<Project[]>(() => {
    return initiatives.map(initiativeToProject);
  }, [initiatives]);

  const isCompleted = (p: Project) => {
    if (p.status?.toLowerCase() === "completed") return true;
    if (p.deadline) {
      const end = new Date(p.deadline);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        return new Date() > end;
      }
    }
    return false;
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
      "Sub Code",
      "Title",
      "Domain",
      "Branch",
      "Course",
      "Year",
      "Session",
      "Section",
      "Faculty Guide",
      "Status",
      "Date",
    ];

    const rows = dataToExport.map((p) => [
      `"${p.code}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.domain.replace(/"/g, '""')}"`,
      `"${p.branch.replace(/"/g, '""')}"`,
      `"${p.course}"`,
      `"${p.year}"`,
      `"${p.session}"`,
      `"${getSectionLetter(p)}"`,
      `"${p.facultyGuide.replace(/"/g, '""')}"`,
      `"${isCompleted(p) ? "Completed" : "Ongoing"}"`,
      `"${p.submissionDate}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forms_export_${type.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
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
      "Computer Science (AI & ML)": "CSE (AI & ML)",
      "Information Technology": "IT",
      Biotechnology: "Biotech",
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
              <FileCheck2 size={22} className="text-[#0D3481]" />
              <span>Forms</span>
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
              <span>Publish Form</span>
            </Link>
          )}
        </div>
      </div>

      {/* FILTER DIRECTORY CARD */}
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
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Course Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FolderGit2 className="w-3 h-3 text-[#0D3481]" />
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

      {/* Filter Tabs & Search / Export Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Minimal Tab Bar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            All <span className="opacity-70 ml-1">({tabCounts.ALL})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("ONGOING");
              setCurrentPage(1);
            }}
            title="Starting to end"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ONGOING"
                ? "bg-white text-[#0D3481] shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Ongoing <span className="opacity-70 ml-1">({tabCounts.ONGOING})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("COMPLETED");
              setCurrentPage(1);
            }}
            title="Ends on the last date of final submission"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "COMPLETED"
                ? "bg-white text-emerald-800 shadow-xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Completed <span className="opacity-70 ml-1">({tabCounts.COMPLETED})</span>
          </button>
        </div>

        {/* Right Controls: Refresh, CSV Export & Search */}
        <div className="flex items-center gap-2">
          {/* Refresh Table Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Fetch latest forms"
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
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleExportCSV("CURRENT")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>Export Filtered ({filteredProjects.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV("ALL")}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>Export All ({projects.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search forms, subject, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CARD HOLDING THE TABLE + PINNED FOOTER */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto w-full">
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
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 my-auto">
                      <FileText size={40} className="mb-3 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-slate-600">No forms in this view</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {isFiltered
                          ? "No forms match the current search or filter selection."
                          : "You haven't submitted or published any departmental forms yet."}
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

                    {/* Sub Code */}
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
                        <Link
                          href={
                            session?.role === "COORDINATOR"
                              ? `/coordinator/forms/${encodeURIComponent(String(p.id))}`
                              : `/hod/forms/${encodeURIComponent(String(p.id))}`
                          }
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="View student submissions"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PINNED PAGINATION FOOTER */}
        <div className="mt-auto shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{startIndex}</span> to{" "}
            <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
            <span className="font-semibold text-slate-700">{filteredProjects.length}</span> forms
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
    </div>
  );
}
