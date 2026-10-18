"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  StudentRecord,
  getEligibleStudentsForForm,
} from "@/lib/formTargeting";
import { getActiveSession, UserSession } from "@/lib/auth";
import { GmailRichEditor } from "./GmailRichEditor";
import * as XLSX from "xlsx";
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
  ChevronDown,
  FileText,
  FileSpreadsheet,
  User,
  RotateCw,
  Trash2,
  Check,
  Bell,
  AlertCircle,
  AlertTriangle,
  Copy,
  Mail,
  Send,
  Loader2,
  Eye,
  Edit3,
  RotateCcw,
  UserPlus,
  Settings,
} from "lucide-react";
import { FormSettingsModal } from "./FormSettingsModal";

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
  const [serverSubmissions, setServerSubmissions] = useState<any[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
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

  // Form Settings modal state
  const [isFormSettingsOpen, setIsFormSettingsOpen] = useState(false);

  // Reminder workflow state
  const [isRemindModalOpen, setIsRemindModalOpen] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [remindTargetStudents, setRemindTargetStudents] = useState<StudentRecord[]>([]);
  const [lastRemindedAt, setLastRemindedAt] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [modalCopySuccess, setModalCopySuccess] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [activeModalTab, setActiveModalTab] = useState<"compose" | "recipients" | "preview">("compose");
  const [session, setSession] = useState<UserSession | null>(null);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");

  // Warning confirmation dialog state
  type WarningDialogState =
    | {
        type: "remove_single";
        student: StudentRecord;
        projectName?: string;
        teamMembers?: Array<{ afn: string; name: string }>;
      }
    | {
        type: "reset_all";
        count: number;
      }
    | {
        type: "clear_recipients";
      }
    | null;

  const [warningDialog, setWarningDialog] = useState<WarningDialogState>(null);

  // Close warning dialog on Escape key
  useEffect(() => {
    if (!warningDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWarningDialog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [warningDialog]);

  // Download menu dropdown state
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    if (isDownloadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  // Load reminder stats and session on mount
  useEffect(() => {
    setSession(getActiveSession());
    if (!formId) return;
    fetch(`/api/forms/${encodeURIComponent(formId)}/remind`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lastSentAt) {
          setLastRemindedAt(data.lastSentAt);
        }
      })
      .catch(() => {});
  }, [formId]);

  // Escape key listener for accessible modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRemindModalOpen && !isSendingReminders) {
        setIsRemindModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRemindModalOpen, isSendingReminders]);

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
    // Sync to database via API
    fetch("/api/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId,
        studentAfn: afn,
        approvalStatus: status,
      }),
    }).catch(() => {});
    showToast(status === "approved" ? "Registration marked as Approved." : "Registration marked as Not Approved.");
  };

  // Prompt warning card to remove a single student's registration
  const promptRemoveSingleSubmission = (
    targetStudent: StudentRecord,
    projectName?: string,
    teamMembers?: Array<{ afn: string; name: string }>
  ) => {
    setWarningDialog({
      type: "remove_single",
      student: targetStudent,
      projectName,
      teamMembers,
    });
  };

  // Backwards compatible wrapper so any caller gets the warning card
  const handleRemoveSingleSubmission = (targetStudent: StudentRecord, projectName?: string) => {
    // If selectedSubmission is currently open for this student, extract teamMembers if available
    const members =
      selectedSubmission?.student?.afn === targetStudent.afn
        ? selectedSubmission.submission?.teamMembers
        : undefined;
    promptRemoveSingleSubmission(targetStudent, projectName, members);
  };

  // Execute the removal after user confirms in the warning pop-up card
  const executeRemoveSingleSubmission = () => {
    if (!warningDialog || warningDialog.type !== "remove_single") return;
    const { student: targetStudent, projectName } = warningDialog;

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

      // 3. Clean serverSubmissions state
      setServerSubmissions((prev) =>
        prev.filter((sub: any) => {
          const isLead =
            sub.student?.afn === targetStudent.afn ||
            sub.studentAfn === targetStudent.afn;
          const isMember =
            Array.isArray(sub.teamMembers) &&
            sub.teamMembers.some((m: any) => m.afn === targetStudent.afn);
          return !(isLead || isMember);
        })
      );

      // 4. Sync removal to real database via API
      fetch(`/api/submissions?formId=${encodeURIComponent(formId)}&studentAfn=${encodeURIComponent(targetStudent.afn)}`, {
        method: "DELETE",
      }).catch(() => {});

      window.dispatchEvent(new Event("kit-submissions-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
      setSelectedSubmission(null);
      setWarningDialog(null);
      setIsRefreshing((prev) => !prev);
      showToast(`Registration removed. ${targetStudent.name} is now Pending.`);
    } catch {
      setWarningDialog(null);
    }
  };

  // Clear submissions / reset roster
  const handleClearSubmissions = () => {
    setWarningDialog({
      type: "reset_all",
      count: registeredCount,
    });
  };

  // Execute reset all once confirmed
  const executeClearAllSubmissions = () => {
    try {
      localStorage.removeItem("kit_public_submissions");
      localStorage.removeItem("kit_student_form_submissions");
      setServerSubmissions([]);
      window.dispatchEvent(new Event("kit-submissions-change"));
      window.dispatchEvent(new Event("kit-initiatives-change"));
      setIsRefreshing((prev) => !prev);
      setSelectedSubmission(null);
      setWarningDialog(null);
      showToast("All submissions reset. All cohort students are now Pending.");
    } catch {
      setWarningDialog(null);
    }
  };

  // 2. Fetch server-persisted submissions for this form
  const fetchSubmissionsFromServer = useCallback(async () => {
    if (!formId) return [];
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/submissions`);
      if (res.ok) {
        const data = await res.json();
        const subs: any[] = Array.isArray(data?.submissions) ? data.submissions : [];
        setServerSubmissions(subs);

        // Merge into local storage so offline/client-only views have the data too
        if (typeof window !== "undefined" && subs.length > 0) {
          try {
            const raw = localStorage.getItem("kit_public_submissions");
            const localMap: Record<string, any[]> = raw ? JSON.parse(raw) : {};
            const primaryKey = String(formId);
            if (!localMap[primaryKey]) localMap[primaryKey] = [];

            let modified = false;
            for (const s of subs) {
              const sAfn = s.student?.afn?.trim().toUpperCase();
              const sRoll = s.student?.rollNumber?.trim().toUpperCase();
              const exists = localMap[primaryKey].some((ls: any) => {
                const lsAfn = ls.student?.afn?.trim().toUpperCase();
                const lsRoll = ls.student?.rollNumber?.trim().toUpperCase();
                return (sAfn && lsAfn === sAfn) || (sRoll && lsRoll === sRoll);
              });
              if (!exists) {
                localMap[primaryKey].push(s);
                modified = true;
              }
            }
            if (modified) {
              localStorage.setItem("kit_public_submissions", JSON.stringify(localMap));
            }
          } catch {
            // ignore
          }
        }
        return subs;
      }
    } catch {
      // ignore
    }
    return [];
  }, [formId]);

  // Load the initiative/form details
  const loadForm = useCallback(() => {
    try {
      const stored = localStorage.getItem("kit_published_initiatives");
      let list: any[] = stored ? JSON.parse(stored) : [];

      const decoded = decodeURIComponent(formId);
      const found = list.find(
        (item) =>
          String(item.id) === decoded ||
          String(item.id).toUpperCase() === decoded.toUpperCase() ||
          String(item.subjectCode || "").toUpperCase() === decoded.toUpperCase()
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
  }, [formId]);

  useEffect(() => {
    loadForm();
    fetchSubmissionsFromServer();

    const handleSync = () => {
      loadForm();
      fetchSubmissionsFromServer();
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener("kit-initiatives-change", handleSync);
    window.addEventListener("kit-submissions-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("kit-initiatives-change", handleSync);
      window.removeEventListener("kit-submissions-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [formId, loadForm, fetchSubmissionsFromServer]);

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
      String(form.id || ""),
      String(formId || ""),
      String(form.subjectCode || ""),
      String(form.code || ""),
    ]
      .filter(Boolean)
      .map((k) => k.toUpperCase().trim());

    // Gather all candidate submissions from serverSubmissions and publicSubs
    const candidateSubmissions: any[] = [
      ...(Array.isArray(serverSubmissions) ? serverSubmissions : []),
    ];

    // Collect from publicSubs
    for (const [key, list] of Object.entries(publicSubs)) {
      if (Array.isArray(list)) {
        const keyUpper = key.toUpperCase().trim();
        const keyMatches = formKeys.some(
          (fk) => fk === keyUpper || fk.includes(keyUpper) || keyUpper.includes(fk)
        );
        for (const sub of list) {
          const subFormUpper = String(sub.formId || "").toUpperCase().trim();
          const subMatches = formKeys.some(
            (fk) => fk === subFormUpper || fk.includes(subFormUpper) || subFormUpper.includes(fk)
          );
          if (keyMatches || subMatches || !sub.formId) {
            candidateSubmissions.push(sub);
          }
        }
      }
    }

    return relevantStudents.map((student) => {
      let submissionInfo: SubmissionInfo | null = null;
      const sAfn = String(student.afn || "").trim().toUpperCase();
      const sRoll = String(student.rollNumber || "").trim().toUpperCase();
      const sEmail = String(student.email || "").trim().toLowerCase();

      // Check candidate submissions
      for (const sub of candidateSubmissions) {
        const leadAfn = String(
          sub.student?.afn || sub.afn || sub.studentAfn || ""
        ).trim().toUpperCase();
        const leadRoll = String(
          sub.student?.rollNumber || sub.rollNumber || sub.studentRoll || ""
        ).trim().toUpperCase();
        const leadEmail = String(
          sub.student?.email || sub.email || sub.studentEmail || ""
        ).trim().toLowerCase();

        const isLead =
          (sAfn && leadAfn === sAfn) ||
          (sRoll && leadRoll === sRoll) ||
          (sEmail && leadEmail === sEmail);

        if (isLead) {
          submissionInfo = {
            formId: sub.formId,
            projectName: sub.projectName || sub.projectTitle || sub.title,
            projectDescription: sub.projectDescription || sub.description,
            registrationType: sub.registrationType || "individual",
            submittedAt: sub.submittedAt || sub.date || new Date().toISOString(),
            verificationStatus: sub.verificationStatus || "verified",
            isLead: true,
            roleInTeam: "Team Lead",
            teamMembers: sub.teamMembers,
            leadStudent: sub.student,
          };
          break;
        }

        // Check if student is a team member
        const members = Array.isArray(sub.teamMembers)
          ? sub.teamMembers
          : Array.isArray(sub.members)
          ? sub.members
          : [];
        const matchedMember = members.find((m: any) => {
          const mAfn = String(m.afn || "").trim().toUpperCase();
          const mRoll = String(m.rollNumber || m.rollNo || "").trim().toUpperCase();
          const mEmail = String(m.email || "").trim().toLowerCase();
          return (
            (sAfn && mAfn === sAfn) ||
            (sRoll && mRoll === sRoll) ||
            (sEmail && mEmail === sEmail)
          );
        });

        if (matchedMember) {
          submissionInfo = {
            formId: sub.formId,
            projectName: sub.projectName || sub.projectTitle || sub.title,
            projectDescription: sub.projectDescription || sub.description,
            registrationType: sub.registrationType || "group",
            submittedAt: sub.submittedAt || sub.date || new Date().toISOString(),
            verificationStatus: sub.verificationStatus || "verified",
            isLead: false,
            roleInTeam: "Team Member",
            teamMembers: sub.teamMembers || sub.members,
            leadStudent: sub.student,
          };
          break;
        }
      }

      // Fallback check in kit_student_form_submissions
      if (!submissionInfo) {
        for (const fk of Object.keys(studentSubs)) {
          const sub = studentSubs[fk];
          if (sub) {
            const subLeadAfn = String(sub.studentAfn || sub.afn || "").trim().toUpperCase();
            const subLeadRoll = String(sub.studentRoll || sub.rollNumber || "").trim().toUpperCase();
            const subLeadEmail = String(sub.studentEmail || sub.email || "").trim().toLowerCase();

            if (
              (sAfn && subLeadAfn === sAfn) ||
              (sRoll && subLeadRoll === sRoll) ||
              (sEmail && subLeadEmail === sEmail)
            ) {
              submissionInfo = {
                projectName: sub.projectName || sub.title,
                projectDescription: sub.projectDescription || sub.description,
                submittedAt: sub.submittedAt || sub.date || new Date().toISOString(),
                registrationType: sub.registrationType || "individual",
                isLead: true,
                roleInTeam: "Individual / Lead",
              };
              break;
            }
          }
        }
      }

      return {
        ...student,
        isSubmitted: !!submissionInfo,
        submission: submissionInfo,
      };
    });
  }, [relevantStudents, form, formId, isRefreshing, refreshTick, serverSubmissions]);

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
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      loadForm();
      const sSubs = await fetchSubmissionsFromServer();
      setRefreshTick((prev) => prev + 1);
      const regCount = sSubs.length;
      showToast(
        regCount > 0
          ? `Roster refreshed (${regCount} registration${regCount > 1 ? "s" : ""} synced).`
          : "Roster refreshed."
      );
    } catch {
      showToast("Roster refreshed.");
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  };

  // 9. Excel Spreadsheet Export (.xlsx)
  const handleExportExcel = () => {
    try {
      const headers = [
        "S.N.",
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

      const dataRows = filteredList.map((s, idx) => [
        idx + 1,
        s.name,
        String(s.afn),
        String(s.rollNumber),
        s.email,
        s.isSubmitted ? "Registered" : "Pending",
        s.isSubmitted ? (approvals[s.afn] === "approved" ? "Approved" : "Not Approved") : "-",
        s.submission?.projectName || "-",
        s.submission?.registrationType === "group"
          ? `Group (${(s.submission.teamMembers?.length || 0) + 1})`
          : s.isSubmitted
          ? "Individual"
          : "-",
        s.submission?.submittedAt
          ? new Date(s.submission.submittedAt).toLocaleDateString("en-IN")
          : "-",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Enforce text format on Roll Number and AFN so Excel never displays scientific notation
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:J1");
      for (let R = 1; R <= range.e.r; ++R) {
        const afnCell = ws[XLSX.utils.encode_cell({ r: R, c: 2 })];
        if (afnCell) {
          afnCell.t = "s";
          afnCell.z = "@";
        }
        const rollCell = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
        if (rollCell) {
          rollCell.t = "s";
          rollCell.z = "@";
        }
      }

      // Column widths
      ws["!cols"] = [
        { wch: 8 },  // S.N.
        { wch: 26 }, // Student Name
        { wch: 12 }, // AFN
        { wch: 20 }, // Roll Number
        { wch: 28 }, // Email
        { wch: 14 }, // Status
        { wch: 16 }, // Approval
        { wch: 34 }, // Project Title
        { wch: 20 }, // Registration Type
        { wch: 16 }, // Submitted Date
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student Roster");

      const fileName = `${form?.subjectCode || form?.id || "Form"}_Student_Roster_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast("Downloaded Excel file (.xlsx)");
    } catch {
      showToast("Failed to export Excel file.", "warning");
    }
  };

  // CSV Export with UTF-8 BOM and Excel text formula formatting
  const handleExportCSV = () => {
    const headers = [
      "S.N.",
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
      `"${s.name.replace(/"/g, '""')}"`,
      `="${s.afn}"`,
      `="${s.rollNumber}"`,
      `"${s.email}"`,
      s.isSubmitted ? "Registered" : "Pending",
      s.isSubmitted ? (approvals[s.afn] === "approved" ? "Approved" : "Not Approved") : "-",
      `"${(s.submission?.projectName || "-").replace(/"/g, '""')}"`,
      s.submission?.registrationType === "group"
        ? `Group (${(s.submission.teamMembers?.length || 0) + 1})`
        : s.isSubmitted
        ? "Individual"
        : "-",
      s.submission?.submittedAt
        ? new Date(s.submission.submittedAt).toLocaleDateString("en-IN")
        : "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form?.subjectCode || form?.id || "Form"}_Student_Roster_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded CSV file (.csv)");
  };

  // PDF Export Dossier Handler
  const handleExportPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showToast("Pop-up blocked. Please allow pop-ups to generate PDF.", "warning");
        return;
      }
      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const rowsHtml = studentsWithStatus
        .map(
          (s, idx) => `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            <td style="font-weight: 600; color: #0f172a;">${s.name}</td>
            <td style="font-family: monospace; color: #334155;">${s.afn}</td>
            <td style="font-family: monospace; color: #475569;">${s.rollNumber}</td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 700; ${
                s.isSubmitted
                  ? "background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
                  : "background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"
              }">
                ${s.isSubmitted ? "Registered" : "Pending"}
              </span>
            </td>
            <td style="font-weight: 500; color: #1e293b;">${s.submission?.projectName || "-"}</td>
            <td style="color: #64748b; font-size: 10px;">${
              s.submission?.registrationType === "group"
                ? `Group (${(s.submission.teamMembers?.length || 0) + 1})`
                : s.isSubmitted
                ? "Individual"
                : "-"
            }</td>
            <td>
              ${
                s.isSubmitted
                  ? approvals[s.afn] === "approved"
                    ? '<span style="color: #15803d; font-weight: 700;">Approved</span>'
                    : '<span style="color: #b45309; font-weight: 600;">Not Approved</span>'
                  : '<span style="color: #94a3b8;">-</span>'
              }
            </td>
          </tr>
        `
        )
        .join("");

      const docHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>${formSubjectCode} - Registration Roster (${formTitle})</title>
            <style>
              @page { size: A4 landscape; margin: 14mm 12mm; }
              * { box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 16px;
                color: #0f172a;
                font-size: 10.5px;
                line-height: 1.4;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #0D3481;
                padding-bottom: 12px;
                margin-bottom: 14px;
              }
              .org-name {
                font-size: 18px;
                font-weight: 800;
                color: #0D3481;
                letter-spacing: -0.3px;
                margin: 0 0 2px 0;
              }
              .org-sub {
                font-size: 11px;
                font-weight: 600;
                color: #475569;
                margin: 0;
              }
              .meta-badge-box {
                text-align: right;
              }
              .form-code {
                font-size: 13px;
                font-weight: 800;
                color: #0D3481;
                font-family: monospace;
              }
              .form-title {
                font-size: 11px;
                color: #334155;
                font-weight: 600;
              }
              .gen-date {
                font-size: 9px;
                color: #94a3b8;
                margin-top: 2px;
              }
              .summary-bar {
                display: flex;
                gap: 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 14px;
                margin-bottom: 14px;
                font-size: 10px;
              }
              .summary-item {
                display: flex;
                flex-direction: column;
              }
              .summary-item .label {
                font-size: 8.5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                font-weight: 700;
              }
              .summary-item .val {
                font-weight: 700;
                color: #0f172a;
                margin-top: 1px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 6px;
              }
              th {
                background: #0D3481;
                color: #ffffff;
                text-align: left;
                padding: 7px 8px;
                font-size: 9.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
              }
              td {
                padding: 6px 8px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 10px;
              }
              tr:nth-child(even) td {
                background: #f8fafc;
              }
              .footer {
                margin-top: 20px;
                padding-top: 8px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1 class="org-name">Kanpur Institute of Technology</h1>
                <p class="org-sub">Department of Computer Science &amp; Engineering &bull; Student Project Registration Dossier</p>
              </div>
              <div class="meta-badge-box">
                <div class="form-code">${formSubjectCode} &bull; ${formTitle}</div>
                <div class="form-title">Section ${form.section || "A"} &bull; ${form.year || "4th Year"} (${form.course || "B.Tech"})</div>
                <div class="gen-date">Generated: ${dateStr}</div>
              </div>
            </div>

            <div class="summary-bar">
              <div class="summary-item">
                <span class="label">Coordinator</span>
                <span class="val">${form.coordinator?.name || form.publishedBy || "Rahul Singh (HOD)"}</span>
              </div>
              <div class="summary-item">
                <span class="label">Eligible Cohort</span>
                <span class="val">${totalCount} Students</span>
              </div>
              <div class="summary-item">
                <span class="label">Registered</span>
                <span class="val" style="color: #15803d;">${registeredCount} (${totalCount > 0 ? Math.round((registeredCount / totalCount) * 100) : 0}%)</span>
              </div>
              <div class="summary-item">
                <span class="label">Pending</span>
                <span class="val" style="color: #b45309;">${pendingCount}</span>
              </div>
              <div class="summary-item">
                <span class="label">Approved</span>
                <span class="val" style="color: #15803d;">${approvedCount}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 38px; text-align: center;">S.N.</th>
                  <th>Student Name</th>
                  <th>AFN</th>
                  <th>Roll Number</th>
                  <th>Status</th>
                  <th>Registered Project</th>
                  <th>Type</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="footer">
              <span>projects.kit &bull; Official Departmental Registration Record</span>
              <span>Confidential &bull; Authorized Academic Record</span>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(docHtml);
      printWindow.document.close();
      showToast("Opened printable PDF report.");
    } catch {
      showToast("Failed to open PDF report.", "warning");
    }
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

  // Relative time helper
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return "";
    const diffMs = Date.now() - new Date(dateString).getTime();
    if (diffMs < 0 || diffMs < 60 * 1000) return "Just now";
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Copy pending student emails to clipboard fallback
  const handleCopyPendingEmails = async () => {
    const pendingCohort = relevantStudents.filter(
      (s) => !studentsWithStatus.find((st) => st.afn === s.afn)?.isSubmitted
    );
    const emails = pendingCohort
      .map((s) => s.email || `${s.afn}@kit.ac.in`)
      .filter(Boolean)
      .join(", ");

    if (!emails) {
      showToast("No pending student emails to copy.", "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showToast(`Copied ${pendingCohort.length} pending emails to clipboard.`);
    } catch {
      showToast("Failed to copy emails to clipboard.", "warning");
    }
  };

  // Helper to generate default template
  const generateDefaultDraft = (targetForm: any) => {
    const pName =
      targetForm?.title ||
      targetForm?.customProjectName ||
      "Mini Project Registration";
    const sCode = targetForm?.subjectCode || "BCS751";
    const lastDate = targetForm?.deadline
      ? new Date(targetForm.deadline).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "21 Oct 2026";
    const regLink =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const coordName =
      session?.name || targetForm?.coordinator?.name || "Rahul Singh (HOD)";

    const subject = `[Important Reminder] Registration Deadline for ${pName} (${sCode})`;

    const body = `<p>Dear Students,</p>
<p>This is an important reminder that the registration deadline for <strong>${pName}</strong> is approaching soon. All students are required to complete their registration before the stipulated deadline.</p>
<p><strong>Registration Details:</strong></p>
<ul>
  <li><strong>Project Name:</strong> ${pName}</li>
  <li><strong>Subject Code (Sub Code):</strong> ${sCode}</li>
  <li><strong>Last Date to Register:</strong> <span style="color: #b91c1c; font-weight: bold;">${lastDate}</span></li>
  <li><strong>Registration Link:</strong> <a href="${regLink}" target="_blank" style="color: #1e5bd8; text-decoration: underline;">${regLink}</a></li>
</ul>
<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin: 16px 0; color: #78350f;">
  <strong>Important Notice:</strong> Registration is mandatory for all students. Failure to register before the deadline will be the sole responsibility of the student. The department will not be liable for any requests for assistance or exceptions arising from failure to complete the registration within the stipulated timeline.
</div>
<p>All students are advised to complete the registration process at the earliest to avoid any last-minute issues.</p>
<p style="margin-top: 24px; color: #475569;">
  Regards,<br>
  <strong>${coordName}</strong><br>
  Department of Computer Science &amp; Engineering<br>
  Kanpur Institute of Technology
</p>`;

    return { subject, body };
  };

  // Open modal with targeted cohort and prefilled editable draft
  const handleOpenRemindModal = (targets?: StudentRecord[]) => {
    let resolvedTargets: StudentRecord[] = [];
    if (targets && targets.length > 0) {
      resolvedTargets = targets;
    } else {
      const pendingCohort = relevantStudents.filter(
        (s) => !studentsWithStatus.find((st) => st.afn === s.afn)?.isSubmitted
      );
      if (pendingCohort.length === 0) {
        showToast("All students have completed their project registration!", "info");
        return;
      }
      resolvedTargets = pendingCohort;
    }

    setRemindTargetStudents(resolvedTargets);
    const { subject, body } = generateDefaultDraft(form);
    setDraftSubject(subject);
    setDraftBody(body);
    setRecipientSearch("");
    setNewRecipientEmail("");
    setNewRecipientName("");
    setActiveModalTab("compose");
    setIsRemindModalOpen(true);
  };

  // Add custom or test email recipient to active dispatch
  const handleAddRecipient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawEmail = newRecipientEmail.trim();
    if (!rawEmail) {
      showToast("Please enter an email address.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      showToast("Please enter a valid email address (e.g. muditcodes@gmail.com).", "warning");
      return;
    }

    const cleanEmail = rawEmail.toLowerCase();
    const alreadyExists = remindTargetStudents.some(
      (s) => s.email.toLowerCase() === cleanEmail
    );
    if (alreadyExists) {
      showToast(`${cleanEmail} is already in the recipient list.`, "info");
      return;
    }

    const name = newRecipientName.trim() || cleanEmail.split("@")[0];
    const newEntry: StudentRecord = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` as any,
      name: name,
      email: cleanEmail,
      afn: "CUSTOM",
      rollNumber: "TEST",
      year: form?.year || "4th Year",
      batch: "2023-2027",
      course: form?.course || "B.Tech",
      section: form?.section || "A",
      stream: form?.stream || "CSE",
      gender: "N/A",
    };

    setRemindTargetStudents((prev) => [newEntry, ...prev]);
    setNewRecipientEmail("");
    setNewRecipientName("");
    showToast(`Added ${cleanEmail} to recipient list.`);
  };

  // Remove recipient from current modal dispatch
  const handleRemoveRecipient = (id: string | number) => {
    setRemindTargetStudents((prev) => prev.filter((s) => String(s.id) !== String(id)));
    showToast("Recipient removed from reminder dispatch.");
  };

  // Clear all recipients to allow testing single email
  const handleClearAllRecipients = () => {
    setWarningDialog({
      type: "clear_recipients",
    });
  };

  // Reset to original pending cohort
  const handleResetRecipientsToDefault = () => {
    const pendingCohort = relevantStudents.filter(
      (s) => !studentsWithStatus.find((st) => st.afn === s.afn)?.isSubmitted
    );
    setRemindTargetStudents(pendingCohort);
    showToast(`Reset recipient list to ${pendingCohort.length} pending cohort students.`);
  };

  // Copy recipient emails from within the modal
  const handleCopyModalRecipients = async () => {
    const emails = remindTargetStudents
      .map((s) => s.email || `${s.afn}@kit.ac.in`)
      .filter(Boolean)
      .join(", ");

    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setModalCopySuccess(true);
      setTimeout(() => setModalCopySuccess(false), 2000);
      showToast(`Copied ${remindTargetStudents.length} recipient emails to clipboard.`);
    } catch {}
  };

  // Execute reminder dispatch via API route with verified draft
  const handleConfirmDispatchReminders = async () => {
    if (remindTargetStudents.length === 0) {
      showToast("Please add at least one recipient before sending.", "warning");
      return;
    }
    setIsSendingReminders(true);

    try {
      const targetFormKey = form?.id || form?.subjectCode || formId;

      const studentIds = remindTargetStudents
        .filter((s) => !String(s.id).startsWith("custom-"))
        .map((s) => String(s.id));

      const customRecipients = remindTargetStudents
        .filter((s) => String(s.id).startsWith("custom-"))
        .map((s) => ({ email: s.email, name: s.name }));

      const res = await fetch(`/api/forms/${encodeURIComponent(targetFormKey)}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          customRecipients,
          customSubject: draftSubject,
          customBody: draftBody,
          formMeta: form
            ? {
                id: form.id || formId,
                subjectCode: form.subjectCode || "BCS751",
                title: form.title || form.customProjectName || "Mini Project",
                course: form.course || "B.Tech",
                stream: form.stream || "Computer Science & Engineering",
                year: form.year || "4th Year",
                section: form.section || "A",
                deadline: form.deadline || "2026-10-21",
                status: form.status || "Active",
                coordinator: form.coordinator || {
                  name: session?.name || "Rahul Singh",
                  email: session?.email || "muditcodes@gmail.com",
                  role: session?.role || "HOD",
                },
              }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch reminders.");
      }

      setIsRemindModalOpen(false);
      if (data.lastSentAt) {
        setLastRemindedAt(data.lastSentAt);
      }
      if (selectedAfns.size > 0) {
        setSelectedAfns(new Set());
      }

      if (data.sent > 0) {
        showToast(
          `Dispatched ${data.sent} reminder email${data.sent > 1 ? "s" : ""}.` +
            (data.skipped > 0 ? ` (${data.skipped} skipped: 24h cooldown active)` : "")
        );
      } else if (data.skipped > 0) {
        showToast(
          data.message || "All targeted cohort students received a reminder within the last 24 hours.",
          "info"
        );
      } else {
        showToast(data.message || "No reminders were dispatched.", "info");
      }
    } catch (err: any) {
      showToast(err.message || "Network error while sending reminders.", "warning");
    } finally {
      setIsSendingReminders(false);
    }
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
      {/* ─── FORM DETAILS HERO BANNER ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative z-20 overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block */}
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-[#0D3481] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/70">
                {formSubjectCode}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                Student Submissions
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {form.stream === "Computer Science & Engineering" ? "CSE" : form.stream || "CSE"}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
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
            <div className="flex flex-wrap items-center gap-2 pt-1 w-full sm:w-auto justify-end">
              {lastRemindedAt && (
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mr-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Last reminded {formatRelativeTime(lastRemindedAt)}</span>
                </span>
              )}

              {/* Refresh Button replacing copy emails */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh roster"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0D3481] font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              {/* Download Record Dropdown Button (PDF or Sheet) */}
              <div className="relative z-30" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0D3481] font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Download registration records"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Record</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isDownloadMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isDownloadMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Select Format
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportPDF();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <div className="font-bold">PDF Document</div>
                        <div className="text-[10px] text-slate-400 font-normal">Formatted print dossier</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleExportExcel();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">Excel Sheet (.xlsx)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Native Excel workbook</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsExtendModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer text-center"
              >
                Extend deadline
              </button>

              <button
                type="button"
                onClick={() => setIsFormSettingsOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0D3481] hover:border-[#0D3481]/30 font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
                title="Form Settings: Final Submission, Presentations, Danger Zone"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                disabled={pendingCount === 0 && selectedAfns.size === 0}
                onClick={() => {
                  if (selectedAfns.size > 0) {
                    const selectedStudents = relevantStudents.filter((s) => selectedAfns.has(s.afn));
                    handleOpenRemindModal(selectedStudents);
                  } else {
                    handleOpenRemindModal();
                  }
                }}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                  pendingCount === 0 && selectedAfns.size === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-[#0B2545] hover:bg-[#071930] text-white hover:shadow-md cursor-pointer"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {selectedAfns.size > 0
                    ? `Remind ${selectedAfns.size} selected`
                    : `Remind ${pendingCount} pending`}
                </span>
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
              onClick={() => {
                const selectedStudents = relevantStudents.filter((s) => selectedAfns.has(s.afn));
                handleOpenRemindModal(selectedStudents);
              }}
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
                      className={`group/row transition-colors border-b border-slate-100 ${
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

                      {/* Project Details */}
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

                      {/* Action: View Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {st.isSubmitted && st.submission ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission({
                                student: st,
                                submission: st.submission!,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0D3481] hover:border-[#0D3481]/30 font-bold text-xs transition-all shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            title="View Registration Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showToast(`${st.name} has not registered yet (Status: Pending).`, "info");
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200/70 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-medium text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                            title="Registration pending — click to check status"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>View</span>
                          </button>
                        )}
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

      {/* ─── REGISTRATION DETAILS SUB-MODAL ─── */}
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
                  {selectedSubmission.submission.projectName || "Project Registration"}
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
                  <span>Approve Registration</span>
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
                  promptRemoveSingleSubmission(
                    selectedSubmission.student,
                    selectedSubmission.submission.projectName,
                    selectedSubmission.submission.teamMembers
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Registration & Set to Pending</span>
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

      {/* ─── REMIND REVIEW & DRAFT VERIFICATION MODAL ─── */}
      {isRemindModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remind-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D3481]/10 border border-[#0D3481]/20 flex items-center justify-center text-[#0D3481]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="remind-modal-title" className="text-base font-extrabold text-[#10334A]">
                    Review &amp; Dispatch Reminder Email
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {form?.subjectCode || "BCS751"} · Section {form?.section || "A"} ({remindTargetStudents.length} pending recipient{remindTargetStudents.length !== 1 ? "s" : ""})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSendingReminders}
                onClick={() => setIsRemindModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setActiveModalTab("compose")}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeModalTab === "compose"
                    ? "border-[#0D3481] text-[#0D3481]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("recipients")}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeModalTab === "recipients"
                    ? "border-[#0D3481] text-[#0D3481]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Recipients ({remindTargetStudents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("preview")}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeModalTab === "preview"
                    ? "border-[#0D3481] text-[#0D3481]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Email Preview</span>
              </button>
            </div>

            {/* Modal Body / Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: COMPOSE / GMAIL-STYLE RICH DRAFT EDITOR */}
              {activeModalTab === "compose" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <GmailRichEditor
                    initialSubject={draftSubject}
                    initialHtml={draftBody}
                    recipientCount={remindTargetStudents.length}
                    recipientEmails={remindTargetStudents.map((s) => s.email || `${s.afn}@kit.ac.in`)}
                    formMeta={{
                      projectName: form?.title || form?.customProjectName || "Mini Project",
                      subjectCode: form?.subjectCode || "BCS751",
                      deadline: form?.deadline
                        ? new Date(form.deadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "21 Oct 2026",
                      registrationLink:
                        typeof window !== "undefined"
                          ? window.location.origin
                          : "http://localhost:3000",
                      coordinatorName:
                        session?.name || form?.coordinator?.name || "Rahul Singh (HOD)",
                      departmentName: "Department of Computer Science & Engineering",
                      collegeName: "Kanpur Institute of Technology",
                    }}
                    onSubjectChange={(val) => setDraftSubject(val)}
                    onHtmlChange={(html) => setDraftBody(html)}
                    onResetDefault={() => {
                      const { subject, body } = generateDefaultDraft(form);
                      setDraftSubject(subject);
                      setDraftBody(body);
                      showToast("Restored official default reminder template.");
                    }}
                    onSend={handleConfirmDispatchReminders}
                    onDiscard={() => setIsRemindModalOpen(false)}
                    onViewRecipients={() => setActiveModalTab("recipients")}
                    isSending={isSendingReminders}
                  />
                </div>
              )}

              {/* TAB 2: RECIPIENTS LIST (WITH ADD / REMOVE / BULK CONTROLS) */}
              {activeModalTab === "recipients" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Add Custom / Test Email Card */}
                  <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-[#0D3481]" />
                        <span>Add Recipient (e.g. Test Email or Custom Recipient)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Cooldown Bypass on Custom Emails
                      </span>
                    </div>

                    <form
                      onSubmit={handleAddRecipient}
                      className="flex flex-col sm:flex-row items-stretch gap-2"
                    >
                      <input
                        type="email"
                        placeholder="Email address (e.g. muditcodes@gmail.com)..."
                        value={newRecipientEmail}
                        onChange={(e) => setNewRecipientEmail(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                      />
                      <input
                        type="text"
                        placeholder="Name (optional)..."
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                        className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add Recipient</span>
                      </button>
                    </form>
                  </div>

                  {/* Filter and Quick Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter by name, email, roll number, or AFN..."
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleResetRecipientsToDefault}
                        title="Restore default pending cohort (60 students)"
                        className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-[#0D3481]" />
                        <span>Reset (60)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllRecipients}
                        title="Clear all recipients to test with a single email"
                        className="px-2.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 font-bold text-[11px] transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyModalRecipients}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {modalCopySuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy All ({remindTargetStudents.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
                    <span>
                      {remindTargetStudents.length} total recipient{remindTargetStudents.length !== 1 ? "s" : ""}{" "}
                      ({remindTargetStudents.filter((s) => !String(s.id).startsWith("custom-")).length} cohort pending,{" "}
                      {remindTargetStudents.filter((s) => String(s.id).startsWith("custom-")).length} custom added)
                    </span>
                    {recipientSearch && (
                      <span className="text-slate-400">Filtered by &quot;{recipientSearch}&quot;</span>
                    )}
                  </div>

                  {/* Scrollable Recipient Roster */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-slate-100 bg-white shadow-2xs">
                    {remindTargetStudents
                      .filter((s) => {
                        if (!recipientSearch.trim()) return true;
                        const q = recipientSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          s.email.toLowerCase().includes(q) ||
                          (s.afn && s.afn.toLowerCase().includes(q)) ||
                          (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
                        );
                      })
                      .map((student, idx) => {
                        const isCustom = String(student.id).startsWith("custom-");
                        return (
                          <div
                            key={String(student.id)}
                            className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[11px] text-slate-400 w-6 text-right shrink-0">
                                {idx + 1}.
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{student.name}</span>
                                  {isCustom && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      Custom / Test
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 truncate">
                                  {isCustom
                                    ? "Test Recipient"
                                    : `AFN: ${student.afn} · Roll: ${student.rollNumber}`}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs text-[#0D3481] bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/60 font-semibold">
                                {student.email || `${student.afn}@kit.ac.in`}
                              </span>
                              {!isCustom ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Pending
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(student.id)}
                                title={`Remove ${student.name} from recipient list`}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {remindTargetStudents.length === 0 && (
                      <div className="py-12 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">No recipients in list.</p>
                        <p className="text-[11px] text-slate-400">
                          Add a test email above or click &quot;Reset (60)&quot; to restore all pending cohort students.
                        </p>
                      </div>
                    )}

                    {remindTargetStudents.length > 0 &&
                      remindTargetStudents.filter((s) => {
                        if (!recipientSearch.trim()) return true;
                        const q = recipientSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          s.email.toLowerCase().includes(q) ||
                          (s.afn && s.afn.toLowerCase().includes(q)) ||
                          (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <div className="py-12 text-center text-xs text-slate-400">
                          No recipient matches &quot;{recipientSearch}&quot;
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE FORMATTED PREVIEW */}
              {activeModalTab === "preview" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="bg-slate-100/70 p-3 rounded-xl text-xs space-y-1 text-slate-600 border border-slate-200">
                    <div>
                      <strong className="text-slate-800">Subject:</strong> {draftSubject}
                    </div>
                    <div>
                      <strong className="text-slate-800">From:</strong> KIT Department of CSE &lt;{session?.email || "muditcodes@gmail.com"}&gt;
                    </div>
                    <div>
                      <strong className="text-slate-800">BCC:</strong> {remindTargetStudents.length} recipient addresses (hidden from each other)
                    </div>
                  </div>

                  {/* Rendered Email Card Container */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-[#0A2A5E] px-6 py-4 text-white border-b-2 border-[#F59E0B]">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                        Department of Computer Science &amp; Engineering
                      </p>
                      <h4 className="text-base font-extrabold tracking-tight">
                        Kanpur Institute of Technology
                      </h4>
                    </div>

                    <div
                      className="p-6 text-xs text-slate-700 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_a]:text-[#1E5BD8] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50/70 [&_blockquote]:py-2 [&_blockquote]:px-3 [&_blockquote]:rounded-r-lg"
                      dangerouslySetInnerHTML={{ __html: draftBody }}
                    />
                  </div>
                </div>
              )}

              {/* Security & Cooldown Info Banner */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-700">
                <AlertCircle className="w-4 h-4 text-[#0D3481] shrink-0 mt-0.5" />
                <p>
                  <strong>Privacy &amp; Sent-Folder Protection:</strong> Emails are sent via <strong>BCC</strong> so only 1 email appears in the HOD Sent Box, and students cannot see each other&apos;s addresses. Students who already received a reminder in the last 24 hours will be automatically skipped by the cooldown policy.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-xs font-semibold text-slate-500 font-mono">
                {remindTargetStudents.length} target recipient{remindTargetStudents.length !== 1 ? "s" : ""}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSendingReminders}
                  onClick={() => setIsRemindModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSendingReminders || remindTargetStudents.length === 0}
                  onClick={handleConfirmDispatchReminders}
                  className="px-5 py-2 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white font-bold text-xs transition-all shadow-xs hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isSendingReminders ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending reminders...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to {remindTargetStudents.length} Students</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── WARNING CONFIRMATION POP-UP CARD ─── */}
      {warningDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWarningDialog(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          {warningDialog.type === "remove_single" && (
            <div
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={() => setWarningDialog(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Warning Header */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                      Warning
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Status Reversion
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#10334A] leading-snug">
                    Remove Registration?
                  </h3>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Are you sure you want to remove the registration for{" "}
                <strong className="text-slate-900 font-bold">
                  &ldquo;{warningDialog.projectName || "this project"}&rdquo;
                </strong>{" "}
                and set status back to{" "}
                <span className="inline-block px-1.5 py-0.5 rounded font-bold text-amber-700 bg-amber-50 border border-amber-200">
                  Pending
                </span>
                ?
              </p>

              {/* Student Details Card */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Lead Student
                    </span>
                    <span className="font-extrabold text-slate-800">
                      {warningDialog.student.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      AFN
                    </span>
                    <span className="font-mono text-slate-600 font-bold">
                      {warningDialog.student.afn}
                    </span>
                  </div>
                </div>

                {/* Status Transition indicator */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Status Change:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Submitted
                    </span>
                    <span className="text-slate-400 font-mono">→</span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Team Members note if any */}
                {warningDialog.teamMembers && warningDialog.teamMembers.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] mb-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {warningDialog.teamMembers.length} team member
                        {warningDialog.teamMembers.length > 1 ? "s" : ""} also affected:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {warningDialog.teamMembers.map((m, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium text-slate-700 shadow-2xs"
                        >
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-semibold">{m.name}</span>
                          <span className="font-mono text-slate-400">({m.afn})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Caution Callout */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/70 border border-red-200/70 text-xs text-red-700 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  This will unenroll the project and allow the student and team to resubmit their registration proposal.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarningDialog(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={executeRemoveSingleSubmission}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Remove & Set to Pending</span>
                </button>
              </div>
            </div>
          )}

          {warningDialog.type === "reset_all" && (
            <div
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setWarningDialog(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800 bg-red-100/80 px-2 py-0.5 rounded-full border border-red-200">
                      Danger Zone
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Mass Reset
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#10334A] leading-snug">
                    Reset All Submissions?
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Are you sure you want to reset <strong className="text-slate-900 font-bold">all registrations</strong> for this form and return all students to <strong className="text-amber-700">Pending</strong>?
              </p>

              <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Current Registered Submissions:</span>
                  <strong className="text-red-600 font-bold font-mono text-sm">{registeredCount}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Resulting Pending Students:</span>
                  <strong className="text-amber-700 font-bold font-mono text-sm">{relevantStudents.length} students</strong>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/70 border border-red-200/70 text-xs text-red-700 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>
                  All submitted project proposals and group assignments will be cleared. This action cannot be undone.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarningDialog(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={executeClearAllSubmissions}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset All Submissions</span>
                </button>
              </div>
            </div>
          )}

          {warningDialog.type === "clear_recipients" && (
            <div
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setWarningDialog(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-1 pr-6">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#10334A] leading-snug">
                    Clear All Recipients?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Remove all currently loaded recipients from this reminder dispatch.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                This will clear {remindTargetStudents.length} recipient(s) so you can manually enter test email addresses.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarningDialog(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRemindTargetStudents([]);
                    setWarningDialog(null);
                    showToast("Cleared all recipients. You can now add test emails.");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Recipients</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── FORM SETTINGS MODAL ─── */}
      <FormSettingsModal
        isOpen={isFormSettingsOpen}
        onClose={() => setIsFormSettingsOpen(false)}
        formId={formId}
        form={form}
        registeredStudents={relevantStudents.filter((s) => studentsWithStatus.find((st) => st.afn === s.afn)?.isSubmitted)}
        submissions={serverSubmissions}
        onFormUpdated={(updated) => setForm(updated)}
        onResetSubmissions={() => {
          setWarningDialog({
            type: "reset_all",
            count: registeredCount,
          });
        }}
        onDeleted={() => {
          showToast(`Form "${formTitle}" moved to Trash. It can be restored from Profile Settings within 7 days.`);
          setTimeout(() => {
            router.push(backHref);
          }, 350);
        }}
      />

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
