"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  StudentRecord,
  getEligibleStudentsForForm,
} from "@/lib/formTargeting";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Download,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  RotateCw,
  Trash2,
  Check,
  Bell,
  AlertCircle,
} from "lucide-react";

type SubmissionInfo = {
  formId?: string;
  projectName?: string;
  projectDescription?: string;
  registrationType?: "individual" | "group";
  submittedAt?: string;
  verificationStatus?: string;
  isLead?: boolean;
  roleInTeam?: string;
  teamMembers?: Array<{ afn: string; name: string; whatsapp?: string }>;
  leadStudent?: {
    afn: string;
    name: string;
    rollNumber?: string;
    email?: string;
    whatsapp?: string;
  };
};

type StudentWithStatus = StudentRecord & {
  isSubmitted: boolean;
  submission: SubmissionInfo | null;
};

type FilterTab = "ALL" | "PENDING" | "REGISTERED" | "APPROVED" | "NOT_APPROVED";

const ROWS_PER_PAGE = 15;

interface FormStudentTrackerViewProps {
  formId: string;
  backHref?: string;
}

export function FormStudentTrackerView({
  formId,
  backHref = "/hod/forms",
}: FormStudentTrackerViewProps) {
  const router = useRouter();
  const [form, setForm] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterTab>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<{
    student: StudentRecord;
    submission: SubmissionInfo;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  type ToastType = "success" | "warning" | "info";
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Multi-selection state
  const [selectedAfns, setSelectedAfns] = useState<Set<string>>(new Set());

  // Extend deadline modal state
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState("");

  // Approvals persistence: { [studentAfn]: "approved" | "not_approved" }
  const [approvals, setApprovals] = useState<Record<string, "approved" | "not_approved">>({});

  // Load approvals for this form
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`kit_approvals_${formId}`);
      if (stored) {
        setApprovals(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [formId]);

  const setApprovalForStudent = (afn: string, status: "approved" | "not_approved") => {
    const updated = { ...approvals, [afn]: status };
    setApprovals(updated);
    try {
      localStorage.setItem(`kit_approvals_${formId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast(status === "approved" ? "Proposal marked as Approved." : "Proposal marked as Not Approved.");
  };

  // Remove a single student's proposal (and group members) and revert to Pending
  const handleRemoveSingleSubmission = (targetStudent: StudentRecord, projectName?: string) => {
    const confirmPrompt = projectName
      ? `Remove proposal "${projectName}" and set ${targetStudent.name} (and team members) back to Pending?`
      : `Remove proposal for ${targetStudent.name} and set status back to Pending?`;

    if (typeof window !== "undefined" && !window.confirm(confirmPrompt)) {
      return;
    }

    try {
      // 1. Clean kit_public_submissions
      const rawPublic = localStorage.getItem("kit_public_submissions");
      if (rawPublic) {
        const publicSubs: Record<string, any[]> = JSON.parse(rawPublic);
        let modified = false;

        for (const key of Object.keys(publicSubs)) {
          if (Array.isArray(publicSubs[key])) {
            const beforeLen = publicSubs[key].length;
            publicSubs[key] = publicSubs[key].filter((sub: any) => {
              const isLead = sub.student?.afn === targetStudent.afn;
              const isMember =
                Array.isArray(sub.teamMembers) &&
                sub.teamMembers.some((m: any) => m.afn === targetStudent.afn);
              const matchesTitle =
                projectName &&
                sub.projectName &&
                sub.projectName.trim().toLowerCase() === projectName.trim().toLowerCase();
              return !(isLead || isMember || (matchesTitle && (isLead || isMember)));
            });
            if (publicSubs[key].length !== beforeLen) {
              modified = true;
            }
          }
        }
        if (modified) {
          localStorage.setItem("kit_public_submissions", JSON.stringify(publicSubs));
        }
      }

      // 2. Clean kit_student_form_submissions
      const rawStudent = localStorage.getItem("kit_student_form_submissions");
      if (rawStudent) {
        const studentSubs: Record<string, any> = JSON.parse(rawStudent);
        let modified = false;

        for (const key of Object.keys(studentSubs)) {
          const sub = studentSubs[key];
          const isLead =
            sub.studentAfn === targetStudent.afn ||
            sub.afn === targetStudent.afn ||
            sub.teamLead?.afn === targetStudent.afn;
          const isMember =
            Array.isArray(sub.members) &&
            sub.members.some((m: any) => m.afn === targetStudent.afn);
          if (isLead || isMember) {
            delete studentSubs[key];
            modified = true;
          }
        }
        if (modified) {
          localStorage.setItem("kit_student_form_submissions", JSON.stringify(studentSubs));
        }
      }

      window.dispatchEvent(new Event("kit-submissions-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
      setSelectedSubmission(null);
      setIsRefreshing((prev) => !prev);
      showToast(`Proposal removed. ${targetStudent.name} is now Pending.`);
    } catch {
      // ignore
    }
  };

  // Clear submissions / reset roster
  const handleClearSubmissions = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Do you want to reset all submissions and set all students back to Pending (0 submitted)?")
    )
      return;
    try {
      localStorage.removeItem("kit_public_submissions");
      localStorage.removeItem("kit_student_form_submissions");
      window.dispatchEvent(new Event("kit-submissions-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
      setIsRefreshing((prev) => !prev);
      setSelectedSubmission(null);
      showToast("All submissions reset. All 60 cohort students are now Pending.");
    } catch {
      // ignore
    }
  };

  // 2. Load the initiative/form details
  useEffect(() => {
    const loadForm = () => {
      try {
        const stored = localStorage.getItem("kit_published_initiatives");
        let list: any[] = stored ? JSON.parse(stored) : [];

        // If list is empty, supply default published BCS751
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
              deadline: "2026-10-21",
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

        const decoded = decodeURIComponent(formId);
        const found = list.find(
          (item) =>
            String(item.id) === decoded ||
            String(item.subjectCode || "").toUpperCase() === decoded.toUpperCase() ||
            String(item.id).toUpperCase() === decoded.toUpperCase()
        );

        if (found) {
          setForm(found);
          setNewDeadlineDate(found.deadline || "2026-10-21");
        } else if (list.length > 0) {
          setForm(list[0]);
          setNewDeadlineDate(list[0].deadline || "2026-10-21");
        }
      } catch {
        setForm(null);
      } finally {
        setLoading(false);
      }
    };

    // Auto-clean sample / test proposals so roster displays clean Pending cohort
    try {
      let publicModified = false;
      const rawPublic = localStorage.getItem("kit_public_submissions");
      if (rawPublic) {
        const publicSubs: Record<string, any[]> = JSON.parse(rawPublic);
        for (const k of Object.keys(publicSubs)) {
          if (Array.isArray(publicSubs[k])) {
            const initialLen = publicSubs[k].length;
            publicSubs[k] = publicSubs[k].filter(
              (sub: any) =>
                !String(sub.projectName || "").toLowerCase().includes("quadcopter")
            );
            if (publicSubs[k].length !== initialLen) {
              publicModified = true;
            }
          }
        }
        if (publicModified) {
          localStorage.setItem("kit_public_submissions", JSON.stringify(publicSubs));
        }
      }

      let studentModified = false;
      const rawStudent = localStorage.getItem("kit_student_form_submissions");
      if (rawStudent) {
        const studentSubs: Record<string, any> = JSON.parse(rawStudent);
        for (const k of Object.keys(studentSubs)) {
          const title = String(
            studentSubs[k]?.projectTitle ||
              studentSubs[k]?.projectName ||
              studentSubs[k]?.title ||
              ""
          );
          if (title.toLowerCase().includes("quadcopter")) {
            delete studentSubs[k];
            studentModified = true;
          }
        }
        if (studentModified) {
          localStorage.setItem("kit_student_form_submissions", JSON.stringify(studentSubs));
        }
      }

      if (publicModified || studentModified) {
        window.dispatchEvent(new Event("kit-submissions-change"));
      }
    } catch {
      // ignore
    }

    loadForm();
    window.addEventListener("kit-initiatives-change", loadForm);
    window.addEventListener("storage", loadForm);
    return () => {
      window.removeEventListener("kit-initiatives-change", loadForm);
      window.removeEventListener("storage", loadForm);
    };
  }, [formId]);

  // 3. Strict Target Cohort: Only students matching this form's course, year, stream, and section
  const relevantStudents = useMemo(() => {
    if (!form) return [];
    return getEligibleStudentsForForm({
      course: form.course,
      year: form.year,
      stream: form.stream,
      branch: form.stream || form.branch,
      section: form.section,
    });
  }, [form]);

  // 4. Submission lookup for each relevant student
  const studentsWithStatus = useMemo<StudentWithStatus[]>(() => {
    if (!form || relevantStudents.length === 0) return [];

    let publicSubs: Record<string, any[]> = {};
    let studentSubs: Record<string, any> = {};

    try {
      const rawPublic = localStorage.getItem("kit_public_submissions");
      if (rawPublic) publicSubs = JSON.parse(rawPublic);
      const rawStudent = localStorage.getItem("kit_student_form_submissions");
      if (rawStudent) studentSubs = JSON.parse(rawStudent);
    } catch {
      // ignore
    }

    const formKeys = [
      String(form.id),
      String(form.subjectCode || ""),
      String(form.code || ""),
    ].filter(Boolean);

    return relevantStudents.map((student) => {
      let submissionInfo: SubmissionInfo | null = null;

      // Look in kit_public_submissions
      for (const key of Object.keys(publicSubs)) {
        const isMatchingFormKey = formKeys.some(
          (fk) =>
            fk.toUpperCase() === key.toUpperCase() ||
            key.toUpperCase().includes(fk.toUpperCase()) ||
            fk.toUpperCase().includes(key.toUpperCase())
        );

        if (isMatchingFormKey && Array.isArray(publicSubs[key])) {
          for (const sub of publicSubs[key]) {
            // Check if student is lead
            if (sub.student?.afn === student.afn) {
              submissionInfo = {
                formId: sub.formId,
                projectName: sub.projectName,
                projectDescription: sub.projectDescription,
                registrationType: sub.registrationType,
                submittedAt: sub.submittedAt,
                verificationStatus: sub.verificationStatus || "verified",
                isLead: true,
                roleInTeam: "Team Lead",
                teamMembers: sub.teamMembers,
                leadStudent: sub.student,
              };
              break;
            }

            // Check if student is a team member
            if (Array.isArray(sub.teamMembers)) {
              const tm = sub.teamMembers.find((m: any) => m.afn === student.afn);
              if (tm) {
                submissionInfo = {
                  formId: sub.formId,
                  projectName: sub.projectName,
                  projectDescription: sub.projectDescription,
                  registrationType: sub.registrationType,
                  submittedAt: sub.submittedAt,
                  verificationStatus: sub.verificationStatus || "verified",
                  isLead: false,
                  roleInTeam: "Team Member",
                  teamMembers: sub.teamMembers,
                  leadStudent: sub.student,
                };
                break;
              }
            }
          }
        }
        if (submissionInfo) break;
      }

      // Fallback check in kit_student_form_submissions
      if (!submissionInfo) {
        for (const fk of formKeys) {
          const sub = studentSubs[fk];
          if (sub && (sub.studentAfn === student.afn || sub.afn === student.afn)) {
            submissionInfo = {
              projectName: sub.projectName || sub.title,
              projectDescription: sub.projectDescription || sub.description,
              submittedAt: sub.submittedAt || sub.date,
              registrationType: sub.registrationType || "individual",
              isLead: true,
              roleInTeam: "Individual / Lead",
            };
            break;
          }
        }
      }

      return {
        ...student,
        isSubmitted: !!submissionInfo,
        submission: submissionInfo,
      };
    });
  }, [relevantStudents, form, isRefreshing]);

  // 5. Counts & Metrics
  const totalCount = studentsWithStatus.length;
  const registeredCount = useMemo(
    () => studentsWithStatus.filter((s) => s.isSubmitted).length,
    [studentsWithStatus]
  );
  const pendingCount = totalCount - registeredCount;

  const approvedCount = useMemo(
    () => studentsWithStatus.filter((s) => s.isSubmitted && approvals[s.afn] === "approved").length,
    [studentsWithStatus, approvals]
  );
  const notApprovedCount = registeredCount - approvedCount;
  const needsReviewCount = notApprovedCount;

  // Deadline info & days left calculation
  const deadlineInfo = useMemo(() => {
    const deadlineStr = form?.deadline || "2026-10-21";
    try {
      const deadline = new Date(deadlineStr);
      const now = new Date();
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const formatted = deadline.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      if (diffDays < 0) {
        return { label: `Closed ${formatted}`, badge: "Expired", isExpired: true };
      }
      if (diffDays === 0) {
        return { label: `Closes ${formatted}`, badge: "Today", isExpired: false };
      }
      return {
        label: `Closes ${formatted}`,
        badge: `${diffDays} days left`,
        isExpired: false,
      };
    } catch {
      return { label: `Closes ${deadlineStr}`, badge: "Active", isExpired: false };
    }
  }, [form]);

  // 6. Filtering & Searching
  const filteredList = useMemo(() => {
    return studentsWithStatus.filter((item) => {
      const isApproved = item.isSubmitted && approvals[item.afn] === "approved";
      const isNotApproved = item.isSubmitted && approvals[item.afn] !== "approved";

      if (statusFilter === "PENDING" && item.isSubmitted) return false;
      if (statusFilter === "REGISTERED" && !item.isSubmitted) return false;
      if (statusFilter === "APPROVED" && !isApproved) return false;
      if (statusFilter === "NOT_APPROVED" && (!item.isSubmitted || isApproved)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchAfn = item.afn.toLowerCase().includes(q);
        const matchRoll = item.rollNumber.toLowerCase().includes(q);
        const matchProject = item.submission?.projectName?.toLowerCase().includes(q);
        if (!matchName && !matchAfn && !matchRoll && !matchProject) {
          return false;
        }
      }

      return true;
    });
  }, [studentsWithStatus, statusFilter, searchQuery, approvals]);

  // 7. Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ROWS_PER_PAGE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredList.slice(start, start + ROWS_PER_PAGE);
  }, [filteredList, currentPage]);

  const startIndex = filteredList.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const endIndex = Math.min(currentPage * ROWS_PER_PAGE, filteredList.length);

  // 8. Refresh Handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Roster refreshed.");
    }, 400);
  };

  // 9. CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Student Name",
      "AFN",
      "Roll Number",
      "Email",
      "Status",
      "Approval",
      "Project Title",
      "Registration Type",
      "Submitted Date",
    ];

    const rows = filteredList.map((s, idx) => [
      idx + 1,
      `"${s.name}"`,
      `"${s.afn}"`,
      `"${s.rollNumber}"`,
      `"${s.email}"`,
      s.isSubmitted ? "Registered" : "Pending",
      s.isSubmitted ? (approvals[s.afn] === "approved" ? "Approved" : "Not Approved") : "—",
      `"${s.submission?.projectName || "—"}"`,
      s.submission?.registrationType || (s.isSubmitted ? "Individual" : "—"),
      s.submission?.submittedAt
        ? new Date(s.submission.submittedAt).toLocaleDateString("en-IN")
        : "—",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form?.subjectCode || form?.id || "Form"}_Student_Roster_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Selection helpers
  const toggleSelect = (afn: string) => {
    setSelectedAfns((prev) => {
      const next = new Set(prev);
      if (next.has(afn)) {
        next.delete(afn);
      } else {
        next.add(afn);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const pageAfns = paginatedList.map((s) => s.afn);
    const allSelected = pageAfns.length > 0 && pageAfns.every((afn) => selectedAfns.has(afn));
    if (allSelected) {
      setSelectedAfns((prev) => {
        const next = new Set(prev);
        pageAfns.forEach((afn) => next.delete(afn));
        return next;
      });
    } else {
      setSelectedAfns((prev) => {
        const next = new Set(prev);
        pageAfns.forEach((afn) => next.add(afn));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedAfns(new Set());
  };

  // Reminder actions
  const handleRemindPendingCohort = () => {
    if (pendingCount === 0) {
      showToast("All students have registered their proposals!");
      return;
    }
    showToast(`Reminder dispatched to all ${pendingCount} pending students via institutional email.`);
  };

  const handleSendReminderSelected = () => {
    if (selectedAfns.size === 0) return;
    showToast(`Reminder sent to ${selectedAfns.size} selected students.`);
    setSelectedAfns(new Set());
  };

  const handleRemindSingleStudent = (st: StudentWithStatus) => {
    showToast(`Reminder sent to ${st.name} (${st.email || st.afn + "@kit.ac.in"}).`);
  };

  // Extend deadline save
  const handleSaveDeadline = () => {
    if (!newDeadlineDate) return;
    try {
      const stored = localStorage.getItem("kit_published_initiatives");
      let list: any[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((item) => {
        if (
          String(item.id) === String(form.id) ||
          String(item.subjectCode || "").toUpperCase() === String(form.subjectCode || "").toUpperCase()
        ) {
          return { ...item, deadline: newDeadlineDate };
        }
        return item;
      });
      localStorage.setItem("kit_published_initiatives", JSON.stringify(updatedList));
      setForm((prev: any) => ({ ...prev, deadline: newDeadlineDate }));
      setIsExtendModalOpen(false);
      showToast(`Submission deadline updated to ${newDeadlineDate}.`);
      window.dispatchEvent(new Event("kit-initiatives-change"));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RotateCw className="w-6 h-6 animate-spin text-[#0D3481]" />
          <p className="text-xs font-semibold text-slate-500">Loading student roster...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="w-full flex-1 flex items-center justify-center min-h-[400px] p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-xs">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-extrabold text-[#10334A]">Form Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The requested form could not be located in published initiatives.
          </p>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D3481] text-white text-xs font-bold hover:bg-[#0D3481]/90 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Forms</span>
          </Link>
        </div>
      </div>
    );
  }

  const formSubjectCode = form.subjectCode || form.code || form.id;
  const formTitle = form.customProjectName || form.title || form.projectType || "Mini Project";

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 pb-8 animate-in fade-in duration-200">
      {/* ─── NAVIGATION TOP BAR (LAYOUT 1) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link
            href={backHref}
            className="text-slate-800 hover:text-[#0D3481] transition-colors flex items-center gap-1 font-bold"
          >
            <span>&larr;</span>
            <span className="underline underline-offset-2">Published Forms</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-500">{formSubjectCode}</span>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">Student Submissions</span>
        </div>

        <div className="flex items-center gap-2">
          {registeredCount > 0 && (
            <button
              type="button"
              onClick={handleClearSubmissions}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              title="Reset all submissions for this form"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Submissions</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── FORM DETAILS HERO BANNER (LAYOUT 1) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block */}
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#0D3481] bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/70">
                {formSubjectCode}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {form.stream === "Computer Science & Engineering" ? "CSE" : form.stream || "CSE"}
              </span>
              <span className="text-xs font-bold text-[#0D3481] bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/70">
                {form.course} · {form.year}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Section {form.section || "A"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10334A] tracking-tight">
              {formTitle}
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              Faculty coordinator: <strong className="text-slate-800">{form.coordinator?.name || form.publishedBy || "Rahul Singh"}</strong>
            </p>
          </div>

          {/* Right Block: Deadline, Progress Bar & Quick Actions */}
          <div className="flex flex-col items-start lg:items-end gap-3 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {deadlineInfo.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                deadlineInfo.isExpired
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                {deadlineInfo.badge}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalCount > 0 ? (registeredCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500 font-medium text-right font-mono">
                {registeredCount} of {totalCount} submitted
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer text-center"
              >
                Extend deadline
              </button>
              <button
                type="button"
                onClick={handleRemindPendingCohort}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white font-bold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer text-center"
              >
                Remind {pendingCount} pending
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4 MINIMALIST METRIC CARDS (LAYOUT 1) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Eligible Cohort
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#10334A] block mt-1">
            {totalCount}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
            Submitted
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-800 block mt-1">
            {registeredCount}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
            Needs Review
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-800 block mt-1">
            {needsReviewCount}
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
            Pending
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-800 block mt-1">
            {pendingCount}
          </span>
        </div>
      </div>

      {/* ─── CONTROLS: FILTER TABS + SEARCH (LAYOUT 1) ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setStatusFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All {totalCount}
          </button>

          <button
            onClick={() => {
              setStatusFilter("PENDING");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Pending {pendingCount}
          </button>

          <button
            onClick={() => {
              setStatusFilter("REGISTERED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "REGISTERED"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Registered {registeredCount}
          </button>

          <button
            onClick={() => {
              setStatusFilter("APPROVED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "APPROVED"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Approved {approvedCount}
          </button>

          <button
            onClick={() => {
              setStatusFilter("NOT_APPROVED");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "NOT_APPROVED"
                ? "bg-[#0B2545] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Not Approved {notApprovedCount}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px] sm:w-72">
          <input
            type="text"
            placeholder="Search name, AFN, roll number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── BULK SELECTION BANNER (LAYOUT 1) ─── */}
      {selectedAfns.size > 0 && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800">
              {selectedAfns.size} selected
            </span>
            <button
              type="button"
              onClick={handleSendReminderSelected}
              className="px-3.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Bell className="w-3 h-3 text-[#0D3481]" />
              <span>Send reminder</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ─── DATA TABLE (LAYOUT 1) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                {/* Dynamic SN / Checkbox Header */}
                <th className="py-3 px-4 w-12 text-center select-none">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAllOnPage();
                    }}
                    className="flex items-center justify-center cursor-pointer"
                    title="Select all on this page"
                  >
                    {paginatedList.length > 0 &&
                    paginatedList.every((s) => selectedAfns.has(s.afn)) ? (
                      <div className="w-4 h-4 rounded bg-[#0D3481] border border-[#0D3481] text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </div>
                    ) : paginatedList.some((s) => selectedAfns.has(s.afn)) ? (
                      <div className="w-4 h-4 rounded bg-[#0D3481] border border-[#0D3481] text-white flex items-center justify-center shadow-2xs">
                        <div className="w-2 h-0.5 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-300 bg-white hover:border-[#0D3481] transition-colors" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[180px]">Student</th>
                <th className="py-3 px-4">AFN</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 min-w-[220px]">Project</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={38} className="mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700">No students match filter</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery
                          ? "Try a different search term or clear the filter."
                          : "No students in this view."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((st, idx) => {
                  const globalIdx = (currentPage - 1) * ROWS_PER_PAGE + idx + 1;
                  const isSelected = selectedAfns.has(st.afn);
                  const isSelectionMode = selectedAfns.size > 0;
                  const isApproved = st.isSubmitted && approvals[st.afn] === "approved";

                  return (
                    <tr
                      key={st.id}
                      onClick={() => {
                        // Click anywhere in row opens registered form preview
                        if (st.isSubmitted && st.submission) {
                          setSelectedSubmission({
                            student: st,
                            submission: st.submission,
                          });
                        } else {
                          showToast(`${st.name} has not registered a project proposal yet (Status: Pending).`, "warning");
                        }
                      }}
                      className={`group/row transition-colors cursor-pointer border-b border-slate-100 ${
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/80 bg-white"
                      }`}
                    >
                      {/* SN Column: Converts to Selection Checkbox on Hover or When Selecting */}
                      <td
                        className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400 w-12 select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(st.afn);
                        }}
                      >
                        <div className="flex items-center justify-center w-5 h-5 mx-auto cursor-pointer">
                          {isSelected ? (
                            <div className="w-4 h-4 rounded bg-[#0D3481] border border-[#0D3481] text-white flex items-center justify-center shadow-2xs">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                          ) : isSelectionMode ? (
                            <div className="w-4 h-4 rounded border border-slate-300 bg-white hover:border-[#0D3481] transition-colors" />
                          ) : (
                            <>
                              <span className="group-hover/row:hidden font-mono text-xs text-slate-400">
                                {globalIdx}
                              </span>
                              <div className="hidden group-hover/row:block w-4 h-4 rounded border border-slate-300 bg-white hover:border-[#0D3481] transition-colors" />
                            </>
                          )}
                        </div>
                      </td>

                      {/* Student Column: Clean text without profile card avatar */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            {st.rollNumber}
                          </div>
                        </div>
                      </td>

                      {/* AFN */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {st.afn}
                        </span>
                      </td>

                      {/* Status Column: Pending / Registered */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {st.isSubmitted ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Project Proposal */}
                      <td className="py-3.5 px-4">
                        {st.isSubmitted && st.submission?.projectName ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs line-clamp-1">
                              {st.submission.projectName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {st.submission.registrationType === "group"
                                ? st.submission.teamMembers && st.submission.teamMembers.length > 0
                                  ? `Group of ${1 + st.submission.teamMembers.length}`
                                  : "Group"
                                : "Individual"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Approval Column: Approved / Not Approved */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {st.isSubmitted ? (
                          isApproved ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Not Approved
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Action Button: Remind */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemindSingleStudent(st);
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                        >
                          Remind
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── PAGINATION FOOTER (LAYOUT 1) ─── */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{startIndex}</strong>-
            <strong className="text-slate-800">{endIndex}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> · email column hidden (shown in row details)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── PROPOSAL DETAILS SUB-MODAL ─── */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Submission
                </span>
                <h3 className="text-base font-extrabold text-[#10334A] mt-2 leading-snug">
                  {selectedSubmission.submission.projectName || "Project Proposal"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Approval Action Banner */}
            <div className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs bg-slate-50 border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Approval Status
                </span>
                <strong className={approvals[selectedSubmission.student.afn] === "approved" ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                  {approvals[selectedSubmission.student.afn] === "approved" ? "Approved" : "Not Approved"}
                </strong>
              </div>

              {approvals[selectedSubmission.student.afn] === "approved" ? (
                <button
                  type="button"
                  onClick={() => setApprovalForStudent(selectedSubmission.student.afn, "not_approved")}
                  className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Mark as Not Approved
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setApprovalForStudent(selectedSubmission.student.afn, "approved")}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Proposal</span>
                </button>
              )}
            </div>

            {selectedSubmission.submission.projectDescription && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Project Synopsis & Objectives
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                  {selectedSubmission.submission.projectDescription}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Submitted By (Lead)
                </span>
                <strong className="text-slate-800">
                  {selectedSubmission.submission.leadStudent?.name ||
                    selectedSubmission.student.name}
                </strong>
                <span className="text-[10px] text-slate-500 block font-mono">
                  AFN:{" "}
                  {selectedSubmission.submission.leadStudent?.afn ||
                    selectedSubmission.student.afn}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Submission Date
                </span>
                <strong className="text-slate-800 font-mono">
                  {selectedSubmission.submission.submittedAt
                    ? new Date(selectedSubmission.submission.submittedAt).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )
                    : "—"}
                </strong>
              </div>
            </div>

            {/* Team Members if group */}
            {selectedSubmission.submission.teamMembers &&
              selectedSubmission.submission.teamMembers.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Team Members ({selectedSubmission.submission.teamMembers.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedSubmission.submission.teamMembers.map((tm, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#0D3481]" />
                          <span className="font-bold text-slate-800">{tm.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <span>AFN: {tm.afn}</span>
                          {tm.whatsapp && <span>· {tm.whatsapp}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleRemoveSingleSubmission(
                    selectedSubmission.student,
                    selectedSubmission.submission.projectName
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Proposal & Set to Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXTEND DEADLINE MODAL ─── */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#10334A] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D3481]" />
                <span>Extend Submission Deadline</span>
              </h3>
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                New Deadline Date
              </label>
              <input
                type="date"
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeadline}
                className="px-4 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#10334A] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-white/10">
            {toast.type === "warning" ? (
              <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0 font-extrabold text-xs">
                !
              </div>
            ) : toast.type === "info" ? (
              <div className="w-5 h-5 rounded-full bg-blue-400/20 border border-blue-400 text-blue-400 flex items-center justify-center shrink-0 font-extrabold text-xs">
                i
              </div>
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
