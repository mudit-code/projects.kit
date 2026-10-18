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

const ROWS_PER_PAGE = 20;

export default function StudentsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const students: Student[] = studentsData as Student[];

  // Get unique streams for filter
  const uniqueStreams = useMemo(() => {
    const streams = [...new Set(students.map((s) => s.stream))].filter(Boolean).sort();
    return streams;
  }, [students]);

  // Filter and sort
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Search filter
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

    // Stream filter
    if (streamFilter !== "all") {
      result = result.filter((s) => s.stream === streamFilter);
    }

    // Gender filter
    if (genderFilter !== "all") {
      result = result.filter((s) => s.gender === genderFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField]?.toString().toLowerCase() || "";
      const bVal = b[sortField]?.toString().toLowerCase() || "";
      if (sortDirection === "asc") return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return result;
  }, [students, searchQuery, sortField, sortDirection, streamFilter, genderFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ROWS_PER_PAGE);
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#0D3481]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#0D3481]" />
    );
  };

  // Short stream label
  const shortStream = (stream: string) => {
    const map: Record<string, string> = {
      "COMPUTER SCIENCE AND ENGINEERING": "CSE",
      "ELECTRONICS AND COMMUNICATION ENGINEERING": "ECE",
      "MECHANICAL ENGINEERING": "ME",
      "Electronics & Communication Engineering": "ECE",
      "Mechanical Engineering": "ME",
      "Electrical & Electronics Engineering": "EEE",
      "Information Technology": "IT",
      "Computer Science And Engineering(Artificial Intelligence & Machine Learning)": "CSE (AI/ML)",
      "BIOTECHNOLOGY": "BT",
    };
    return map[stream] || stream;
  };

  const activeFilters = (streamFilter !== "all" ? 1 : 0) + (genderFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#0D3481]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#0D3481]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            <p className="text-xs text-slate-500 font-medium">Total Students</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">2023-27</p>
            <p className="text-xs text-slate-500 font-medium">Batch</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Hash className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{uniqueStreams.length}</p>
            <p className="text-xs text-slate-500 font-medium">Branches</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, AFN, roll number, email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]/40 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-xl shadow-xs transition-all cursor-pointer ${
            activeFilters > 0
              ? "bg-[#0D3481] text-white border-[#0D3481]"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</label>
            <select
              value={streamFilter}
              onChange={(e) => {
                setStreamFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {uniqueStreams.map((s) => (
                <option key={s} value={s}>
                  {shortStream(s)} — {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setStreamFilter("all");
                setGenderFilter("all");
                setCurrentPage(1);
              }}
              className="self-end px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {(currentPage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(currentPage * ROWS_PER_PAGE, filteredStudents.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-700">{filteredStudents.length}</span> students
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40px]">
                  #
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("name")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Name <SortIcon field="name" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("afn")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    AFN <SortIcon field="afn" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("rollNumber")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Roll No. <SortIcon field="rollNumber" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("email")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Email <SortIcon field="email" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("stream")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Branch <SortIcon field="stream" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors select-none"
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
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-10 h-10 text-slate-200" />
                      <p className="text-sm font-medium text-slate-400">No students found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {(currentPage - 1) * ROWS_PER_PAGE + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0D3481]/8 flex items-center justify-center text-xs font-bold text-[#0D3481] shrink-0">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="font-medium text-slate-800 whitespace-nowrap">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {student.afn}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StreamBadge stream={student.stream} badge />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#0D3481] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
