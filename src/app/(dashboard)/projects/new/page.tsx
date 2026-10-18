"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FolderPlus,
  Calendar,
  Layers,
  BookOpen,
  FolderGit2,
  AlertCircle,
  CheckCircle2,
  Users,
  Send,
  Info,
  ShieldCheck,
  FileCode2,
  UserCheck,
  UserCog
} from "lucide-react";

const COURSES = ["B.Tech", "MCA", "M.Tech"];

const STREAMS = [
  "Computer Science & Engineering",
  "Computer Science (AI & ML)",
  "Information Technology",
  "Biotechnology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Electrical & Electronics",
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const SECTIONS = ["A", "B", "C", "D", "E", "F"];

export default function StartProjectPage() {
  const router = useRouter();

  // Form State
  const [course, setCourse] = useState("B.Tech");
  const [stream, setStream] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("4th Year");
  const [section, setSection] = useState("A");

  // Category
  const [category, setCategory] = useState<"Academic" | "Non-Academic">("Academic");
  const [nonAcademicNotice, setNonAcademicNotice] = useState(false);

  // Academic specific fields
  const [projectType, setProjectType] = useState<"Mini Project" | "Other">("Mini Project");
  const [customProjectName, setCustomProjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [assignedTo, setAssignedTo] = useState<"self" | "faculty">("self");
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [facultyPhone, setFacultyPhone] = useState("");

  // Dates
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45); // default 45 days
    return d.toISOString().split("T")[0];
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle category toggle
  const handleCategorySelect = (val: "Academic" | "Non-Academic") => {
    if (val === "Non-Academic") {
      setNonAcademicNotice(true);
      // Automatically keep/revert to Academic per requirement:
      // "if non academic do announce feature coming soon and continue with academic instead"
      setCategory("Academic");
    } else {
      setNonAcademicNotice(false);
      setCategory("Academic");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (projectType === "Other" && !customProjectName.trim()) {
      setErrorMsg("Please specify the project name for 'Other'");
      return;
    }

    if (category === "Academic" && !subjectCode.trim()) {
      setErrorMsg("Please enter the academic subject code (e.g., KCS-751)");
      return;
    }

    if (category === "Academic" && assignedTo === "faculty") {
      if (!facultyName.trim()) {
        setErrorMsg("Please enter the faculty coordinator's name");
        return;
      }
      if (!facultyEmail.trim()) {
        setErrorMsg("Please enter the faculty coordinator's email address");
        return;
      }
      if (!facultyPhone.trim()) {
        setErrorMsg("Please enter the faculty coordinator's phone number");
        return;
      }
    }

    if (!startDate || !deadline) {
      setErrorMsg("Please provide both start date and deadline");
      return;
    }

    if (new Date(startDate) > new Date(deadline)) {
      setErrorMsg("Deadline cannot be earlier than start date");
      return;
    }

    setIsSubmitting(true);

    const newInitiative = {
      id: `INIT-${Date.now().toString().slice(-6)}`,
      course,
      stream,
      year,
      section,
      category,
      projectType,
      customProjectName: projectType === "Other" ? customProjectName.trim() : "Mini Project",
      subjectCode: subjectCode.trim().toUpperCase(),
      startDate,
      deadline,
      publishedAt: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "Active",
      publishedBy: category === "Academic" && assignedTo === "faculty"
        ? `Rahul Singh (HOD) · Coordinator: ${facultyName.trim()}`
        : "Rahul Singh (HOD)",
      assignedTo: category === "Academic" ? assignedTo : "self",
      coordinator: category === "Academic" && assignedTo === "faculty"
        ? {
            name: facultyName.trim(),
            email: facultyEmail.trim(),
            phone: facultyPhone.trim(),
            role: "Faculty"
          }
        : {
            name: "Rahul Singh",
            email: "muditcodes@gmail.com",
            phone: "+91 98765 43210",
            role: "HOD"
          },
    };

    // Save to real database via API
    try {
      await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInitiative),
      });
    } catch (err) {
      console.warn("Could not sync initiative to server database:", err);
    }

    // Also update client state for instantaneous optimistic UI update
    try {
      const existing = JSON.parse(localStorage.getItem("kit_published_initiatives") || "[]");
      existing.unshift(newInitiative);
      localStorage.setItem("kit_published_initiatives", JSON.stringify(existing));
      window.dispatchEvent(new Event("kit-initiatives-change"));
    } catch {
      // ignore
    }

    setIsSuccess(true);
    setTimeout(() => {
      router.push("/hod/forms");
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/hod/forms"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0D3481] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Forms</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0D3481]/10 text-[#0D3481] border border-[#0D3481]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            HOD Project Initiation
          </span>
        </div>

        {/* Page Title Header */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center font-bold shadow-2xs">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Start a New Project
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure course, stream, subject code, and submission windows to publish to student cohorts.
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {isSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-center gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Project Successfully Published!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Cohort notified in {course} {stream} ({year} - Sec {section}). Redirecting to published forms...
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Non-Academic Feature Notice Banner */}
          {nonAcademicNotice && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 animate-in slide-in-from-top-1 duration-200">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-950">Feature coming soon!</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Non-academic projects will be supported in an upcoming release. Continuing with the <strong>Academic</strong> project configuration.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Target Student Cohort */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-4 h-4 text-[#0D3481]" />
              <h2 className="text-sm font-bold text-slate-900">1. Target Student Cohort</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Course */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Course</label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-semibold text-slate-700">Stream / Branch</label>
                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                >
                  {STREAMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section: A, B, C, D, E, F */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Project Category */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Layers className="w-4 h-4 text-[#0D3481]" />
              <h2 className="text-sm font-bold text-slate-900">2. Project Category</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleCategorySelect("Academic")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  category === "Academic"
                    ? "bg-[#0D3481]/5 border-[#0D3481] text-[#0D3481] font-bold shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100/60 text-[#0D3481] flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold">Academic Project</span>
                    <span className="block text-xs text-slate-500 font-normal">
                      Curricular mini projects, capstone, or degree rubrics
                    </span>
                  </div>
                </div>
                {category === "Academic" && <CheckCircle2 className="w-5 h-5 text-[#0D3481]" />}
              </button>

              <button
                type="button"
                onClick={() => handleCategorySelect("Non-Academic")}
                className="p-4 rounded-xl border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold">Non-Academic Project</span>
                    <span className="block text-xs text-amber-600 font-semibold">
                      Announce feature coming soon
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Academic Specifications */}
          {category === "Academic" && (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileCode2 className="w-4 h-4 text-[#0D3481]" />
                <h2 className="text-sm font-bold text-slate-900">3. Academic Specifications</h2>
              </div>

              {/* Selector: Mini Project vs Other */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Project Type</label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setProjectType("Mini Project")}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      projectType === "Mini Project"
                        ? "bg-[#0D3481] text-white border-[#0D3481] font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Mini Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectType("Other")}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      projectType === "Other"
                        ? "bg-[#0D3481] text-white border-[#0D3481] font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Other
                  </button>
                </div>
              </div>

              {/* If Other: name it in text box */}
              {projectType === "Other" && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Custom Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Major Capstone Project / Industrial Internship Phase-II"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                  />
                </div>
              )}

              {/* Subject Code (only if academic) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <div className="max-w-md">
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCS-751 or KIT-CSE-801"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 text-xs font-mono font-semibold uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] tracking-wide"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Official course code listed in university / autonomous departmental syllabus
                  </span>
                </div>
              </div>

              {/* Assign to: Self or Faculty */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block">
                  Assign to :
                </label>

                {/* Radio Option */}
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 hover:text-[#0D3481] transition-colors select-none">
                    <input
                      type="radio"
                      name="assignTo"
                      value="self"
                      checked={assignedTo === "self"}
                      onChange={() => setAssignedTo("self")}
                      className="w-4 h-4 text-[#0D3481] border-slate-300 focus:ring-[#0D3481] cursor-pointer"
                    />
                    <span>Self</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 hover:text-[#0D3481] transition-colors select-none">
                    <input
                      type="radio"
                      name="assignTo"
                      value="faculty"
                      checked={assignedTo === "faculty"}
                      onChange={() => setAssignedTo("faculty")}
                      className="w-4 h-4 text-[#0D3481] border-slate-300 focus:ring-[#0D3481] cursor-pointer"
                    />
                    <span>Faculty</span>
                  </label>
                </div>

                {/* If Self: project coordinator: HOD himself */}
                {assignedTo === "self" && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs text-slate-700 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0D3481] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        HOD
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Project Coordinator: HOD himself</p>
                        <p className="text-[11px] text-slate-500">Rahul Singh · muditcodes@gmail.com</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#0D3481]">
                      Self Assigned
                    </span>
                  </div>
                )}

                {/* If Faculty: name, email, and phone number */}
                {assignedTo === "faculty" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70">
                      <UserCheck className="w-4 h-4 text-[#0D3481]" />
                      <span className="text-xs font-bold text-slate-900">
                        Faculty Details
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Faculty Name */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={assignedTo === "faculty"}
                          placeholder="e.g. Dr. A. Sharma"
                          value={facultyName}
                          onChange={(e) => setFacultyName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                        />
                      </div>

                      {/* Faculty Email */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required={assignedTo === "faculty"}
                          placeholder="e.g. coordinator@kit.ac.in"
                          value={facultyEmail}
                          onChange={(e) => setFacultyEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                        />
                      </div>

                      {/* Faculty Phone */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required={assignedTo === "faculty"}
                          placeholder="e.g. +91 98765 43210"
                          value={facultyPhone}
                          onChange={(e) => setFacultyPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Timeline & Submission Windows */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-[#0D3481]" />
              <h2 className="text-sm font-bold text-slate-900">4. Timeline & Deadlines</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-2">
              Publishing will broadcast this initiative to all enrolled students in <strong>{stream} ({year} - Section {section})</strong> to commence team registration and synopsis submissions.
            </p>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="px-6 py-3 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Publishing..." : "Publish to Students"}</span>
            </button>
          </div>
        </form>
      </div>
  );
}
