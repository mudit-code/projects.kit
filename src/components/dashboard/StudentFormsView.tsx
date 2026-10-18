"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Send,
  User,
  Users,
  BookOpen,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  X,
  FileCheck2
} from "lucide-react";
import { DEFAULT_STUDENT_PROFILE, StudentProfileData } from "./EditProfileModal";
import { StreamBadge } from "@/components/StreamBadge";
import { isStudentEligibleForForm } from "@/lib/formTargeting";

export type AcademicForm = {
  id: string;
  title: string;
  description: string;
  dispatchedBy: string;
  roleBadge: "HOD" | "Faculty";
  subjectCode: string;
  category: string;
  course: string;
  stream: string;
  year: string;
  section: string;
  startDate: string;
  deadline: string;
  status: "Open" | "Submitted" | "Upcoming" | "Closed";
  submissionData?: ProjectSubmissionData;
};

export type TeamMember = {
  name: string;
  rollNo: string;
  afn: string;
};

export type ProjectSubmissionData = {
  projectTitle: string;
  domain: string;
  abstract: string;
  toolsTech: string;
  supervisorPreference: string;
  teamLead: TeamMember;
  members: TeamMember[];
  submittedAt: string;
};

const FACULTIES = [
  "Dr. A. Sharma (Project Coordinator)",
  "Prof. Rahul Singh (HOD - CSE)",
  "Dr. V. K. Gupta (Associate Professor)",
  "Dr. Sunita Patel (Assistant Professor)",
  "Prof. Manoj Tiwari (Assistant Professor)",
];

const DOMAINS = [
  "Artificial Intelligence & Machine Learning",
  "Full-Stack Web & Cloud Architecture",
  "Cybersecurity & Network Defense",
  "Internet of Things (IoT) & Embedded Edge",
  "Decentralized Web3 & Blockchain Systems",
  "Bioinformatics & Computational Biology",
  "Robotics & Autonomous Navigation",
];

export function StudentFormsView() {
  const [forms, setForms] = useState<AcademicForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<AcademicForm | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfileData>(DEFAULT_STUDENT_PROFILE);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form input state for submission
  const [projectTitle, setProjectTitle] = useState("");
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [abstract, setAbstract] = useState("");
  const [toolsTech, setToolsTech] = useState("");
  const [supervisor, setSupervisor] = useState(FACULTIES[0]);
  const [members, setMembers] = useState<TeamMember[]>([
    { name: "Aastha Tiwari", rollNo: "2301650100002", afn: "232457" },
  ]);

  // Load student profile & forms
  useEffect(() => {
    // 1. Load active profile
    let prof = DEFAULT_STUDENT_PROFILE;
    try {
      const storedProf = localStorage.getItem("kit_student_profile");
      if (storedProf) {
        prof = JSON.parse(storedProf);
        setStudentProfile(prof);
      }
    } catch {
      // ignore
    }

    // 2. Load submissions
    let existingSubmissions: Record<string, ProjectSubmissionData> = {};
    try {
      const storedSubs = localStorage.getItem("kit_student_form_submissions");
      if (storedSubs) {
        existingSubmissions = JSON.parse(storedSubs);
      }
    } catch {
      // ignore
    }

    // 3. Load initiatives published by HOD / Faculty (shared single source of truth)
    const dynamicForms: AcademicForm[] = [];
    try {
      let storedInitiatives = localStorage.getItem("kit_published_initiatives");
      let list: any[] = storedInitiatives ? JSON.parse(storedInitiatives) : [];
      if (list.length === 0) {
        list = [
          {
            id: "INIT-BCS751",
            subjectCode: "BCS751",
            course: "B.Tech",
            stream: "Computer Science & Engineering",
            year: "4th Year",
            section: "A",
            category: "Academic",
            projectType: "Mini Project",
            customProjectName: "Mini Project",
            startDate: "2026-10-16",
            deadline: "2026-11-30",
            publishedAt: "16 Oct 2026",
            status: "Active",
            publishedBy: "Rahul Singh",
            assignedTo: "self",
            coordinator: {
              name: "Rahul Singh",
              email: "hod@kit.ac.in",
              phone: "+91 98765 43210",
              role: "HOD",
            },
          },
        ];
        localStorage.setItem("kit_published_initiatives", JSON.stringify(list));
      }

      list.forEach((init: any) => {
        if (isStudentEligibleForForm(prof, init)) {
          const isSub = !!existingSubmissions[init.id];
          dynamicForms.push({
            id: init.id,
            title: init.customProjectName
              ? `${init.customProjectName} Registration Form`
              : `${init.projectType || "Project"} Registration Form`,
            description: init.description || "",
            dispatchedBy: init.publishedBy || (init.coordinator?.name ? `${init.coordinator.name} (${init.coordinator.role || "Coordinator"})` : "Rahul Singh (HOD)"),
            roleBadge: init.assignedTo === "faculty" || init.coordinator?.role === "Faculty" ? "Faculty" : "HOD",
            subjectCode: init.subjectCode || "BCS751",
            category: init.category || "Academic",
            course: init.course,
            stream: init.stream,
            year: init.year,
            section: init.section,
            startDate: init.startDate || "2026-10-16",
            deadline: init.deadline || "2026-11-30",
            status: isSub ? "Submitted" : "Open",
            submissionData: existingSubmissions[init.id],
          });
        }
      });
    } catch {
      // ignore
    }

    setForms(dynamicForms);
  }, []);

  const handleOpenSubmit = (form: AcademicForm) => {
    setSelectedForm(form);
    setIsSubmitModalOpen(true);
  };

  const handleOpenView = (form: AcademicForm) => {
    setSelectedForm(form);
    setIsViewModalOpen(true);
  };

  const addMember = () => {
    if (members.length < 3) {
      setMembers([...members, { name: "", rollNo: "", afn: "" }]);
    }
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    const submission: ProjectSubmissionData = {
      projectTitle: projectTitle.trim(),
      domain,
      abstract: abstract.trim(),
      toolsTech: toolsTech.trim(),
      supervisorPreference: supervisor,
      teamLead: {
        name: studentProfile.name,
        rollNo: studentProfile.rollNo,
        afn: studentProfile.afn,
      },
      members: members.filter((m) => m.name.trim() !== ""),
      submittedAt: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Save to localStorage
    try {
      const storedSubs = JSON.parse(localStorage.getItem("kit_student_form_submissions") || "{}");
      storedSubs[selectedForm.id] = submission;
      localStorage.setItem("kit_student_form_submissions", JSON.stringify(storedSubs));
    } catch {
      // ignore
    }

    // Update form status locally
    setForms((prev) =>
      prev.map((f) =>
        f.id === selectedForm.id
          ? { ...f, status: "Submitted", submissionData: submission }
          : f
      )
    );

    setIsSubmitModalOpen(false);
    setSuccessToast(`Form "${selectedForm.title}" submitted successfully to ${selectedForm.dispatchedBy}!`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 6000);
  };

  const pendingCount = forms.filter((f) => f.status === "Open").length;
  const submittedCount = forms.filter((f) => f.status === "Submitted").length;

  return (
    <div className="w-full space-y-6">
      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Received Forms</h1>
          <p className="text-xs text-slate-500 mt-1">
            Academic registrations and milestone submission forms issued by HOD & Faculty
          </p>
        </div>

        {/* Student Cohort Tag */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#0D3481]"></span>
          <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1">
            <span>{studentProfile.course}</span>
            <StreamBadge stream={studentProfile.stream} />
            <span>· {studentProfile.year} Year (Sec {studentProfile.section})</span>
          </span>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{forms.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Received Forms</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
            <div className="text-xs text-slate-500 font-medium">Pending Submission</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{submittedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Completed / Submitted</div>
          </div>
        </div>
      </div>

      {/* Forms List */}
      <div className="space-y-4">
        {forms.map((form) => {
          const isOpen = form.status === "Open";
          const isSubmitted = form.status === "Submitted";
          const isUpcoming = form.status === "Upcoming";

          return (
            <div
              key={form.id}
              className={`p-6 bg-white border rounded-2xl transition-all shadow-xs ${
                isOpen
                  ? "border-[#0D3481]/30 hover:shadow-md"
                  : isSubmitted
                  ? "border-emerald-200 hover:shadow-md"
                  : "border-slate-200 opacity-90"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0D3481]/10 text-[#0D3481]">
                      {form.subjectCode}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {form.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isOpen
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : isSubmitted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isOpen && <Clock className="w-3 h-3" />}
                      {isSubmitted && <CheckCircle2 className="w-3 h-3" />}
                      {isUpcoming && <Calendar className="w-3 h-3" />}
                      {form.status === "Open" ? "Action Required" : form.status}
                    </span>
                  </div>

                  {/* Form Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{form.title}</h3>
                  {form.description ? (
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{form.description}</p>
                  ) : null}

                  {/* Metadata Row */}
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0D3481]" />
                      <span className="font-semibold text-slate-800">Issued by:</span>
                      <span>{form.dispatchedBy}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">Deadline:</span>
                      <span className="font-mono text-red-600 font-bold">{form.deadline}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="inline-flex items-center gap-1">
                        <span>Target: {form.course}</span>
                        <StreamBadge stream={form.stream} />
                        <span>· {form.year} Year (Sec {form.section})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0">
                  {isOpen && (
                    <button
                      onClick={() => handleOpenSubmit(form)}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Fill & Submit Form</span>
                    </button>
                  )}

                  {isSubmitted && (
                    <button
                      onClick={() => handleOpenView(form)}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>View Submission</span>
                    </button>
                  )}

                  {isUpcoming && (
                    <span className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                      Opens on {form.startDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Submitted Summary Preview */}
              {isSubmitted && form.submissionData && (
                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Submitted Project Proposal:
                    </span>
                    <p className="font-bold text-slate-900">{form.submissionData.projectTitle}</p>
                    <p className="text-[11px] text-slate-500">
                      Domain: {form.submissionData.domain} · Supervisor: {form.submissionData.supervisorPreference}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    Submitted on {form.submissionData.submittedAt}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FORM FILLING MODAL */}
      {isSubmitModalOpen && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F6F5F2] border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0D3481] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#0D3481]">
                    {selectedForm.subjectCode} · {selectedForm.category}
                  </span>
                  <h2 className="text-base font-bold text-[#10334A] leading-tight">
                    {selectedForm.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Target Notice */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                <div>
                  Dispatched by: <strong>{selectedForm.dispatchedBy}</strong>
                </div>
                <div>
                  Deadline: <strong className="text-red-700">{selectedForm.deadline}</strong>
                </div>
              </div>

              {/* Proposed Project Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Proposed Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI-Powered Autonomous Campus Surveillance & Intrusion Detection"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] font-semibold text-slate-900"
                />
              </div>

              {/* Domain & Faculty Preference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Domain / Technical Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Faculty Guide Preference <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
                  >
                    {FACULTIES.map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Team Leader (Pre-filled from profile) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Team Leader (You)
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Name</span>
                    <strong className="text-slate-800">{studentProfile.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Roll No</span>
                    <strong className="text-slate-800 font-mono">{studentProfile.rollNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">AFN</span>
                    <strong className="text-slate-800 font-mono">{studentProfile.afn}</strong>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Team Members ({members.length + 1} total)
                  </label>
                  {members.length < 3 && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="text-xs font-bold text-[#0D3481] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {members.map((mem, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Member ${idx + 2} Name`}
                        value={mem.name}
                        onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D3481]"
                      />
                      <input
                        type="text"
                        placeholder="Roll No"
                        value={mem.rollNo}
                        onChange={(e) => handleMemberChange(idx, "rollNo", e.target.value)}
                        className="w-32 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D3481]"
                      />
                      <input
                        type="text"
                        placeholder="AFN"
                        value={mem.afn}
                        onChange={(e) => handleMemberChange(idx, "afn", e.target.value)}
                        className="w-24 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D3481]"
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Abstract */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Project Abstract / Problem Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the core problem statement, objectives, and proposed methodology..."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                />
              </div>

              {/* Tools & Tech Stack */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Planned Tools & Technology Stack <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python, PyTorch, React, Node.js, OpenCV, PostgreSQL"
                  value={toolsTech}
                  onChange={(e) => setToolsTech(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Coordinator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SUBMISSION DETAILS MODAL */}
      {isViewModalOpen && selectedForm && selectedForm.submissionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Submitted on {selectedForm.submissionData.submittedAt}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedForm.submissionData.projectTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 text-xs border-y border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Domain</span>
                <p className="font-bold text-slate-800">{selectedForm.submissionData.domain}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Guide Preference</span>
                <p className="font-bold text-slate-800">{selectedForm.submissionData.supervisorPreference}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Team Leader</span>
                <p className="font-bold text-slate-800">
                  {selectedForm.submissionData.teamLead.name} (Roll: {selectedForm.submissionData.teamLead.rollNo} · AFN: {selectedForm.submissionData.teamLead.afn})
                </p>
              </div>
              {selectedForm.submissionData.members.length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Team Members</span>
                  <div className="space-y-1 mt-1">
                    {selectedForm.submissionData.members.map((m, i) => (
                      <p key={i} className="font-medium text-slate-700">
                        {m.name} {m.rollNo ? `(Roll: ${m.rollNo})` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Problem Abstract</span>
                <p className="text-slate-700 leading-relaxed mt-0.5">{selectedForm.submissionData.abstract}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Tech Stack</span>
                <p className="font-mono text-slate-800">{selectedForm.submissionData.toolsTech}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
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
