"use client";

import { useState, useMemo } from "react";
import studentsData from "@/data/students.json";
import { StreamBadge } from "@/components/StreamBadge";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Users,
  GraduationCap,
  Filter,
  X,
  Mail,
  Hash,
  User,
  Calendar,
  FolderGit2,
  RotateCcw,
} from "lucide-react";

type Student = {
  id: number;
  name: string;
  afn: string;
  rollNumber: string;
  email: string;
  year: string;
  batch: string;
  course: string;
  section: string;
  stream: string;
  gender: string;
};

type SortField = "name" | "afn" | "rollNumber" | "email" | "stream" | "gender";
type SortDirection = "asc" | "desc";

const SESSIONS = [
  "All Sessions",
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
  "2021-22",
  "2020-21",
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

const ROWS_PER_PAGE = 10;

const branchMatches = (stream: string, selectedBranch: string) => {
  if (selectedBranch === "All Branches") return true;
  const s = (stream || "").toLowerCase();
  const b = selectedBranch.toLowerCase();
  if (b.includes("electrical")) {
    return s.includes("electrical") || s.includes("eee");
  }
  if (b.includes("ai") || b.includes("ml")) {
    return s.includes("ai") || s.includes("machine learning") || s.includes("artificial");
  }
  if (b.includes("computer science")) {
    return (
      (s.includes("computer science") || s.includes("cse")) &&
      !s.includes("ai") &&
      !s.includes("machine learning") &&
      !s.includes("artificial")
    );
  }
  if (b.includes("information technology")) {
    return s.includes("information technology") || s === "it";
  }
  if (b.includes("biotechnology")) {
    return s.includes("biotechnology") || s.includes("biotech") || s === "bt";
  }
  if (b.includes("electronics")) {
    return (
      (s.includes("electronics") || s.includes("ece") || s.includes("communication")) &&
      !s.includes("electrical")
    );
  }
  if (b.includes("mechanical")) {
    return s.includes("mechanical") || s === "me";
  }
  return s.includes(b) || b.includes(s);
};

export default function StudentsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedSession, setSelectedSession] = useState<string>("2026-27");
  const [selectedCourse, setSelectedCourse] = useState<string>("All Courses");
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [selectedYear, setSelectedYear] = useState<string>("All Years");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const students: Student[] = studentsData as Student[];

  // Filter and sort
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Session filter
    if (selectedSession !== "All Sessions") {
      result = result.filter((s) => {
        if (selectedSession === "2026-27") {
          return s.batch === "2023-27" || (s as any).session === "2026-27";
        }
        return s.batch === selectedSession || (s as any).session === selectedSession;
      });
    }

    // 2. Course filter
    if (selectedCourse !== "All Courses") {
      result = result.filter((s) => s.course.toLowerCase() === selectedCourse.toLowerCase());
    }

    // 3. Branch filter
    if (selectedBranch !== "All Branches") {
      result = result.filter((s) => branchMatches(s.stream, selectedBranch));
    }

    // 4. Year filter
    if (selectedYear !== "All Years") {
      result = result.filter((s) => s.year.toLowerCase() === selectedYear.toLowerCase());
    }

    // 5. Gender filter
    if (genderFilter !== "all") {
      result = result.filter((s) => s.gender === genderFilter);
    }

    // 6. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.afn.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.stream.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField]?.toString().toLowerCase() || "";
      const bVal = b[sortField]?.toString().toLowerCase() || "";
      if (sortDirection === "asc") return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return result;
  }, [
    students,
    selectedSession,
    selectedCourse,
    selectedBranch,
    selectedYear,
    genderFilter,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ROWS_PER_PAGE));
  const startIndex = filteredStudents.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ROWS_PER_PAGE, filteredStudents.length);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Reset page on filter change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isFiltered =
    selectedSession !== "2026-27" ||
    selectedCourse !== "All Courses" ||
    selectedBranch !== "All Branches" ||
    selectedYear !== "All Years" ||
    genderFilter !== "all" ||
    searchQuery.trim() !== "";

  const resetFilters = () => {
    setSelectedSession("2026-27");
    setSelectedCourse("All Courses");
    setSelectedBranch("All Branches");
    setSelectedYear("All Years");
    setGenderFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#0D3481]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#0D3481]" />
    );
  };

  const activeFilters = genderFilter !== "all" ? 1 : 0;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col space-y-2.5 sm:space-y-3 animate-in fade-in duration-200">
      {/* Header Stats */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#0D3481]/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[#0D3481]" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none">{students.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Total Students</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none">2023-27</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Batch</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none">{BRANCHES.length - 1}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Branches</p>
          </div>
        </div>
      </div>

      {/* FILTER DIRECTORY CARD (SCREENSHOT 2) */}
      <div className="shrink-0 p-3 sm:p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Filter className="w-3.5 h-3.5 text-[#0D3481]" />
            <span>Filter Directory</span>
          </div>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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

      {/* Search and Filters Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, AFN, roll number, email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]/40 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap ${
            activeFilters > 0
              ? "bg-[#0D3481] text-white border-[#0D3481]"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilters > 0 && (
            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="shrink-0 flex flex-wrap items-end gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 duration-200 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 cursor-pointer text-slate-800 font-medium"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* CARD HOLDING THE TABLE + PINNED FOOTER */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-slate-500 uppercase font-semibold tracking-wider text-[11px]">
                <th className="text-left px-4 py-2.5 w-[44px]">#</th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort("name")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Name <SortIcon field="name" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort("afn")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    AFN <SortIcon field="afn" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort("rollNumber")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Roll No. <SortIcon field="rollNumber" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("email")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Email <SortIcon field="email" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort("stream")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Branch <SortIcon field="stream" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-700 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort("gender")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Gender <SortIcon field="gender" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-200" />
                      <p className="text-xs font-semibold text-slate-400">No students found</p>
                      <p className="text-[11px] text-slate-400">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                      {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#0D3481]/8 flex items-center justify-center text-[11px] font-bold text-[#0D3481] shrink-0">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="font-semibold text-slate-800 whitespace-nowrap text-xs">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {student.afn}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StreamBadge stream={student.stream} badge />
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          student.gender === "Male"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        {student.gender}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PINNED PAGINATION FOOTER */}
        <div className="shrink-0 px-5 py-2.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{startIndex}</span> to{" "}
            <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
            <span className="font-semibold text-slate-700">{filteredStudents.length}</span> students
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
