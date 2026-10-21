"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
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
  UserCog,
  GraduationCap,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import { LOGOS } from "@/lib/logos";
import { DynamicSelect } from "@/components/DynamicSelect";
import {
  CustomDatePicker,
  getTodayIso,
  daysBetween,
  formatDisplayDate,
  formatToIsoDate,
  parseLocalDate,
} from "@/components/CustomDatePicker";

const COURSES = [
  { value: "B.Tech", label: "B.Tech", description: "Bachelor of Technology" },
  { value: "MCA", label: "MCA", description: "Master of Computer Applications" },
  { value: "M.Tech", label: "M.Tech", description: "Master of Technology" },
];

const STREAMS = [
  {
    value: "Computer Science & Engineering",
    label: "CSE",
    description: "Computer Science & Engineering",
  },
  {
    value: "Computer Science (AI & ML)",
    label: "CS (AIML)",
    description: "Computer Science & Engineering (AI & ML)",
  },
  {
    value: "Information Technology",
    label: "IT",
    description: "Information Technology",
  },
  {
    value: "Electronics & Communication",
    label: "ECE",
    description: "Electronics & Communication Engineering",
  },
  {
    value: "Mechanical Engineering",
    label: "ME",
    description: "Mechanical Engineering",
  },
  {
    value: "Electrical & Electronics",
    label: "EE",
    description: "Electrical & Electronics Engineering",
  },
  {
    value: "Biotechnology",
    label: "BT",
    description: "Biotechnology",
  },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const SECTIONS = ["All", "A", "B", "C", "D", "E", "F"];

export default function StartProjectPage() {
  const router = useRouter();

  // Form State
  const [course, setCourse] = useState("B.Tech");
  const [stream, setStream] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("4th Year");
  const [section, setSection] = useState("All");

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

  // Dates (enforcing local date parsing & validation rules)
  const [startDate, setStartDate] = useState(() => getTodayIso());
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15); // default 15 days
    return formatToIsoDate(d);
  });

  // Date change handlers enforcing rules:
  // Rule 1: don't let them select a start date before today
  // Rule 2: don't let user select a deadline before start date
  const handleStartDateChange = (newStart: string) => {
    const today = getTodayIso();
    let validatedStart = newStart;
    if (validatedStart < today) {
      validatedStart = today;
    }
    setStartDate(validatedStart);

    // If current deadline is earlier than the new start date, auto-advance deadline
    if (deadline < validatedStart) {
      const d = parseLocalDate(validatedStart) || new Date();
      d.setDate(d.getDate() + 15);
      setDeadline(formatToIsoDate(d));
    }
    setErrorMsg("");
  };

  const handleDeadlineChange = (newDeadline: string) => {
    if (newDeadline < startDate) {
      setErrorMsg("Deadline cannot be earlier than start date");
      return;
    }
    setDeadline(newDeadline);
    setErrorMsg("");
  };

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdForm, setCreatedForm] = useState<any | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappCaption, setWhatsappCaption] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);

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

    const today = getTodayIso();
    if (startDate < today) {
      setErrorMsg(`Start date cannot be in the past (before today: ${formatDisplayDate(today)})`);
      return;
    }

    if (deadline < startDate) {
      setErrorMsg("Deadline cannot be earlier than start date");
      return;
    }

    setIsSubmitting(true);

    const formTitle = projectType === "Other" && customProjectName.trim()
      ? `${customProjectName.trim()} Registration Form`
      : `${projectType || "Project"} Registration Form`;

    const coordinatorInfo = category === "Academic" && assignedTo === "faculty"
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
        };

    const newInitiative = {
      id: `INIT-${Date.now().toString().slice(-6)}`,
      title: formTitle,
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
      coordinator: coordinatorInfo,
    };

    try {
      // 1. Save to real database via API
      try {
        await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newInitiative),
        });
      } catch (err) {
        console.warn("Could not sync initiative to server database:", err);
      }

      // 2. Also update client state for instantaneous optimistic UI update
      try {
        const existing = JSON.parse(localStorage.getItem("kit_published_initiatives") || "[]");
        existing.unshift(newInitiative);
        localStorage.setItem("kit_published_initiatives", JSON.stringify(existing));
        window.dispatchEvent(new Event("kit-initiatives-change"));
      } catch (err) {
        console.warn("LocalStorage save error:", err);
      }

      // 3. Prepare pre-filled WhatsApp caption notice
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const portalUrl = `${origin}/student`;
      const caption = `📢 *OFFICIAL NOTICE: PROJECT INITIATION & SYNOPSIS SUBMISSION*

🎓 *Course:* ${course} (${stream})
📚 *Subject:* ${newInitiative.subjectCode} - ${newInitiative.customProjectName || newInitiative.projectType}
👥 *Target Class:* ${year}${section !== "All" ? ` (Section ${section})` : ""}
📅 *Submission Deadline:* ${formatDisplayDate(deadline)}

Dear Students,
The project registration and synopsis submission window is now officially OPEN. All teams must register their project title, team members, and upload their synopsis before the deadline.

🔗 *Student Portal:* ${portalUrl}
👤 *Coordinator:* ${coordinatorInfo.name} (${coordinatorInfo.role})

⚠️ *Note:* Submissions close promptly on the deadline. Please submit well in advance.`;

      setCreatedForm(newInitiative);
      setWhatsappCaption(caption);
      setIsSuccess(true);
      setShowWhatsAppModal(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to publish form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
        {/* Page Title Header */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center font-bold shadow-2xs shrink-0">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Start a New Project
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Configure course, stream, subject code, and submission windows to publish to students.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0D3481]/10 text-[#0D3481] border border-[#0D3481]/20 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              HOD Project Initiation
            </span>
          </div>
        </div>

        {/* Success Banner */}
        {isSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-center gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Project Successfully Published!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Students notified in {course} {stream} ({year} - Sec {section}). Redirecting to published forms...
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

          {/* Section 1: Target Students */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0D3481]" />
                <h2 className="text-sm font-bold text-slate-900">1. Target Students</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Academic Session 2026-27
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Configure target course, engineering branch, academic year, and section.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Course */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Course</label>
                <DynamicSelect
                  label="Course"
                  value={course}
                  onChange={setCourse}
                  options={COURSES}
                  icon={GraduationCap}
                />
              </div>

              {/* Stream */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Stream / Branch</label>
                <DynamicSelect
                  label="Stream / Branch"
                  value={stream}
                  onChange={setStream}
                  options={STREAMS}
                  icon={BookOpen}
                />
              </div>

              {/* Year */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Year</label>
                <DynamicSelect
                  label="Year"
                  value={year}
                  onChange={setYear}
                  options={YEARS}
                  icon={Calendar}
                />
              </div>

              {/* Section: A, B, C, D, E, F */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Section</label>
                <DynamicSelect
                  label="Section"
                  value={section}
                  onChange={setSection}
                  options={SECTIONS.map((sec) => ({
                    value: sec,
                    label: sec === "All" ? "All Sections" : `Section ${sec}`,
                  }))}
                  icon={Users}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Project Category */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Layers className="w-4 h-4 text-[#0D3481]" />
              <h2 className="text-sm font-bold text-slate-900">2. Project Category</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleCategorySelect("Academic")}
                className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                  category === "Academic"
                    ? "bg-[#0D3481]/5 border-[#0D3481] text-[#0D3481] font-bold ring-1 ring-[#0D3481]/20 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    category === "Academic"
                      ? "border-[#0D3481] bg-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {category === "Academic" && (
                    <span className="w-2 h-2 rounded-full bg-[#0D3481]" />
                  )}
                </span>
                <span>Academic Project</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategorySelect("Non-Academic")}
                className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                  category === "Non-Academic"
                    ? "bg-[#0D3481]/5 border-[#0D3481] text-[#0D3481] font-bold ring-1 ring-[#0D3481]/20 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    category === "Non-Academic"
                      ? "border-[#0D3481] bg-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {category === "Non-Academic" && (
                    <span className="w-2 h-2 rounded-full bg-[#0D3481]" />
                  )}
                </span>
                <span>Non-Academic Project</span>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md">
                  Coming soon
                </span>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D3481]" />
                <h2 className="text-sm font-bold text-slate-900">4. Timeline & Deadlines</h2>
              </div>

              {startDate && deadline && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[11px] font-bold text-[#0D3481]">
                  <span>{daysBetween(startDate, deadline)} Days Window</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <CustomDatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
                minDate={getTodayIso()}
                required
                helperText="Submissions and team registration open on this date"
                highlightRange={{ start: startDate, end: deadline }}
                presets={[
                  { label: "Today", daysFromBase: 0 },
                  { label: "Tomorrow", daysFromBase: 1 },
                  { label: "+7 Days", daysFromBase: 7 },
                ]}
              />

              <CustomDatePicker
                label="Submission Deadline"
                value={deadline}
                onChange={handleDeadlineChange}
                minDate={startDate}
                required
                helperText="Final date for students to submit synopsis/teams"
                highlightRange={{ start: startDate, end: deadline }}
                presets={[
                  { label: "+10 Days", daysFromBase: 10 },
                  { label: "+15 Days", daysFromBase: 15 },
                  { label: "+30 Days", daysFromBase: 30 },
                ]}
              />
            </div>

            <p className="text-xs text-slate-500 pt-1">
              Publishing will broadcast this initiative to all enrolled students in <strong>{stream} ({year} - Section {section})</strong> to commence team registration and synopsis submissions.
            </p>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/hod/forms"
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

        {/* ─── WHATSAPP SHARE NOTICE MODAL ─── */}
        {showWhatsAppModal && createdForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with WhatsApp branding */}
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                    <img
                      src={LOGOS.whatsapp}
                      alt="WhatsApp"
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                        Form Published
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1 leading-tight">
                      Share Notice with Students
                    </h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Forward this announcement directly to your student WhatsApp groups.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/hod/forms")}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Form Quick Info */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {createdForm.subjectCode} · {createdForm.customProjectName || createdForm.projectType}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {createdForm.course} {createdForm.stream} ({createdForm.year} - Sec {createdForm.section})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {formatDisplayDate(createdForm.deadline)}
                    </span>
                  </div>
                </div>

                {/* Caption Preview & Edit */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span>WhatsApp Notice Caption</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      You can edit before forwarding
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={8}
                      value={whatsappCaption}
                      onChange={(e) => setWhatsappCaption(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 leading-relaxed resize-none focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappCaption);
                    setCopiedCaption(true);
                    setTimeout(() => setCopiedCaption(false), 2500);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Notice Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Notice</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => router.push("/hod/forms")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Done
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappCaption)}`;
                      window.open(waUrl, "_blank");
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <img src={LOGOS.whatsapp} alt="WA" className="w-4 h-4 object-contain brightness-0 invert" />
                    <span>Open WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
