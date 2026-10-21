"use client";

import { useState, useEffect } from "react";
import StudentsTable from "@/components/dashboard/StudentsTable";
import {
  Users,
  UserCog,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Send,
  X,
  Mail,
  Phone,
  Building2,
  FolderGit2,
} from "lucide-react";
import {
  getTodayIso,
  formatDisplayDate,
  formatToIsoDate,
} from "@/components/CustomDatePicker";

// ─── Sample Faculty Data ───
interface Faculty {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  avatar: string;
}

const AVAILABLE_FACULTIES: Faculty[] = [
  {
    id: "fac-1",
    name: "Dr. Anita Sharma",
    email: "anita.sharma@kit.ac.in",
    phone: "+91 94567 12340",
    designation: "Associate Professor",
    department: "Computer Science & Engineering",
    avatar: "AS",
  },
  {
    id: "fac-2",
    name: "Prof. Rajesh Kumar Verma",
    email: "rk.verma@kit.ac.in",
    phone: "+91 98123 45670",
    designation: "Assistant Professor",
    department: "Computer Science & Engineering",
    avatar: "RV",
  },
  {
    id: "fac-3",
    name: "Dr. Priya Patel",
    email: "priya.patel@kit.ac.in",
    phone: "+91 87654 32100",
    designation: "Professor",
    department: "Information Technology",
    avatar: "PP",
  },
];

const COURSES = ["B.Tech", "MCA", "M.Tech"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["All", "A", "B", "C", "D"];

interface AssignedTask {
  id: string;
  facultyId: string;
  facultyName: string;
  course: string;
  year: string;
  section: string;
  subject: string;
  subjectCode: string;
  assignedAt: string;
  status: "Active" | "Pending";
}

export default function RolesPage() {
  const [activeView, setActiveView] = useState<"home" | "students" | "faculties">("home");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Faculty assign form state
  const [assignCourse, setAssignCourse] = useState("B.Tech");
  const [assignYear, setAssignYear] = useState("4th Year");
  const [assignSection, setAssignSection] = useState("A");
  const [assignSubject, setAssignSubject] = useState("Mini Project");
  const [assignSubjectCode, setAssignSubjectCode] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);

  // Load saved assignments
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kit_faculty_assignments");
      if (saved) setAssignedTasks(JSON.parse(saved));
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAssignTask = () => {
    if (!assignSubjectCode.trim()) {
      showToast("Please enter the subject code.");
      return;
    }
    if (!selectedFacultyId) {
      showToast("Please select a faculty member.");
      return;
    }

    setIsAssigning(true);
    const faculty = AVAILABLE_FACULTIES.find((f) => f.id === selectedFacultyId);
    if (!faculty) return;

    const newTask: AssignedTask = {
      id: `TASK-${Date.now().toString().slice(-6)}`,
      facultyId: faculty.id,
      facultyName: faculty.name,
      course: assignCourse,
      year: assignYear,
      section: assignSection,
      subject: assignSubject,
      subjectCode: assignSubjectCode.trim().toUpperCase(),
      assignedAt: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "Active",
    };

    const updated = [...assignedTasks, newTask];
    setAssignedTasks(updated);
    localStorage.setItem("kit_faculty_assignments", JSON.stringify(updated));

    // Reset form
    setAssignSubjectCode("");
    setSelectedFacultyId("");
    setAssignSubject("Mini Project");

    setTimeout(() => {
      setIsAssigning(false);
      showToast(`Project assigned to ${faculty.name} successfully!`);
    }, 600);
  };

  // ─── HOME VIEW: Two Cards ───
  if (activeView === "home") {
    return (
      <div className="w-full space-y-6">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center shrink-0">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manage Roles</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage student directory and assign projects to faculty coordinators.
              </p>
            </div>
          </div>
        </div>

        {/* Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Students Card */}
          <button
            type="button"
            onClick={() => setActiveView("students")}
            className="group p-6 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-[#0D3481]/30 transition-all cursor-pointer text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0D3481] flex items-center justify-center border border-blue-100 group-hover:bg-[#0D3481]/10 transition-colors">
                <GraduationCap className="w-7 h-7" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#0D3481] group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#0D3481] transition-colors">
              Students
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              View the complete enrolled students directory — filter by course, branch, year, section, and session.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0D3481] border border-blue-200">
                Student Directory
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                B.Tech 2023-27
              </span>
            </div>
          </button>

          {/* Faculties Card */}
          <button
            type="button"
            onClick={() => setActiveView("faculties")}
            className="group p-6 bg-[#F6F5F2] border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                <Users className="w-7 h-7" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Faculties
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Assign subject projects to faculty coordinators. They'll receive it in their dashboard and manage the full lifecycle.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {AVAILABLE_FACULTIES.length} Faculty Available
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {assignedTasks.length} Assigned
              </span>
            </div>
          </button>
        </div>

        {/* Assigned Tasks Summary */}
        {assignedTasks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Faculty Assignments</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {assignedTasks.slice(-5).reverse().map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200">
                      {task.facultyName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{task.facultyName}</span>
                      <span className="text-slate-400 ml-2">{task.subjectCode} · {task.subject}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{task.course} {task.year} Sec {task.section}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STUDENTS VIEW ───
  if (activeView === "students") {
    return (
      <div className="w-full space-y-4">
        {/* Header with Back */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveView("home")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0D3481] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Students Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Final year students directory · B.Tech 2023-27 batch (HOD Departmental Oversight)
            </p>
          </div>
        </div>

        <StudentsTable />
      </div>
    );
  }

  // ─── FACULTIES VIEW: Assign Task System ───
  return (
    <div className="w-full space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header with Back */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveView("home")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0D3481] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assign Project to Faculty</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Select course details and assign a subject project to a faculty coordinator. They'll manage the complete lifecycle from their dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ─── Left: Assign Form ─── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0D3481]" />
            Project Details
          </h2>

          {/* Course & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Course</label>
              <select
                value={assignCourse}
                onChange={(e) => setAssignCourse(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Year</label>
              <select
                value={assignYear}
                onChange={(e) => setAssignYear(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Section</label>
              <select
                value={assignSection}
                onChange={(e) => setAssignSection(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Subject</label>
              <input
                type="text"
                value={assignSubject}
                onChange={(e) => setAssignSubject(e.target.value)}
                placeholder="e.g. Mini Project"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>
          </div>

          {/* Subject Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Subject Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assignSubjectCode}
              onChange={(e) => setAssignSubjectCode(e.target.value)}
              placeholder="e.g. BCS753"
              className="w-full max-w-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] uppercase"
            />
            <p className="text-[11px] text-slate-400">Official course code from university syllabus</p>
          </div>

          {/* Select Faculty */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Select Faculty Coordinator <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2.5">
              {AVAILABLE_FACULTIES.map((fac) => {
                const isSelected = selectedFacultyId === fac.id;
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => setSelectedFacultyId(fac.id)}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {fac.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{fac.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{fac.designation} · {fac.department}</div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {fac.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {fac.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assign Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 max-w-sm">
              After assignment, the faculty coordinator will receive this project on their dashboard and can publish the registration form, manage submissions, and open final deliverables.
            </p>
            <button
              type="button"
              disabled={isAssigning}
              onClick={handleAssignTask}
              className="px-6 py-3 rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{isAssigning ? "Assigning..." : "Assign to Faculty"}</span>
            </button>
          </div>
        </div>

        {/* ─── Right: Available Faculty Summary ─── */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Directory</h3>
            <div className="space-y-3">
              {AVAILABLE_FACULTIES.map((fac) => {
                const taskCount = assignedTasks.filter((t) => t.facultyId === fac.id).length;
                return (
                  <div key={fac.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center text-[10px] font-bold shrink-0">
                      {fac.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{fac.name}</div>
                      <div className="text-[10px] text-slate-400">{fac.designation}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                      {taskCount} project{taskCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Tasks for current view */}
          {assignedTasks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Assignments ({assignedTasks.length})
              </h3>
              <div className="space-y-2">
                {assignedTasks.slice(-6).reverse().map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{task.subjectCode}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {task.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {task.facultyName} · {task.course} {task.year} Sec {task.section}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
