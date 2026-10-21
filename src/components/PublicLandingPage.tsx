"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getActiveSession, UserSession } from "@/lib/auth";
import { LOGOS } from "@/lib/logos";
import { StreamBadge } from "@/components/StreamBadge";
import { isStudentEligibleForForm } from "@/lib/formTargeting";
import { RequestRecordModal } from "@/components/RequestRecordModal";
import { PageIntroAnimation } from "@/components/PageIntroAnimation";
import { StudentMobileApp } from "@/components/mobile/student/StudentMobileApp";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Send,
  Plus,
  Trash2,
  X,
  Phone,
  BookOpen,
  ShieldCheck,
  Layers,
  Sparkles,
  Loader2,
  ArrowLeft,
  Globe,
  FolderGit2,
  ExternalLink,
  Presentation,
  Upload,
  Paperclip,
  UserPlus,
} from "lucide-react";

/* ─── Types ─── */
type StudentRecord = {
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

type AvailableForm = {
  id: string;
  title: string;
  description: string;
  dispatchedBy: string;
  roleBadge: string;
  subjectCode: string;
  category: string;
  course: string;
  stream: string;
  year: string;
  section: string;
  startDate: string;
  deadline: string;
  status: string;
  submission?: PublicSubmission;
  finalSubmissionOpen?: boolean;
  finalSubmissionDeadline?: string;
  finalSubmissionConfig?: any;
};

type TeamMember = {
  afn: string;
  name: string;
  whatsapp: string;
};

type PublicSubmission = {
  formId: string;
  registrationType: "individual" | "group";
  student: {
    afn: string;
    name: string;
    rollNumber: string;
    email: string;
    course: string;
    stream: string;
    year: string;
    whatsapp: string;
  };
  projectName: string;
  projectDescription: string;
  teamMembers: TeamMember[];
  submittedAt: string;
  verificationStatus: "pending" | "verified" | "rejected";
  approvalStatus?: "approved" | "not_approved" | "pending" | string;
  finalSubmission?: {
    reportFileName?: string;
    repoUrl?: string;
    slidesFileName?: string;
    demoUrl?: string;
    remarks?: string;
    submittedAt?: string;
  };
  finalSubmissionCompleted?: boolean;
};

/* ─── Constants ─── */
const STORAGE_KEY = "kit_public_submissions";
const LONG_PRESS_MS = 1200; // 1.2s long-press to trigger admin access on mobile

/* ─── Helpers ─── */
export function getSubmissionApprovalStatus(
  sub: any,
  formId?: string,
  studentAfn?: string
): "approved" | "not_approved" | "pending" {
  if (!sub) return "pending";

  const appStatus = String(sub.approvalStatus || "").toLowerCase();
  const verStatus = String(sub.verificationStatus || "").toLowerCase();

  if (appStatus === "approved" || verStatus === "verified" || verStatus === "approved") {
    return "approved";
  }
  if (
    appStatus === "not_approved" ||
    appStatus === "rejected" ||
    verStatus === "rejected" ||
    verStatus === "not_approved"
  ) {
    return "not_approved";
  }

  // Cross-reference with localStorage kit_approvals_${formId}
  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : typeof globalThis !== "undefined" && (globalThis as any).localStorage
      ? (globalThis as any).localStorage
      : null;

  if (storage) {
    const afn = String(studentAfn || sub.student?.afn || sub.studentAfn || "").trim().toUpperCase();
    const fId = formId || sub.formId;

    if (fId && afn) {
      try {
        const stored = storage.getItem(`kit_approvals_${fId}`);
        if (stored) {
          const map = JSON.parse(stored);
          const val = (map[afn] || map[afn.toLowerCase()])?.toLowerCase();
          if (val === "approved") return "approved";
          if (val === "not_approved") return "not_approved";
        }
      } catch {}
    }

    // Fallback: check all kit_approvals_* keys
    if (afn) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith("kit_approvals_")) {
            const map = JSON.parse(storage.getItem(key) || "{}");
            const val = (map[afn] || map[afn.toLowerCase()])?.toLowerCase();
            if (val === "approved") return "approved";
            if (val === "not_approved") return "not_approved";
          }
        }
      } catch {}
    }
  }

  return "pending";
}

function loadSubmissions(): Record<string, PublicSubmission[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSubmissions(data: Record<string, PublicSubmission[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("kit-submissions-change"));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // ignore
  }
}

function findSubmissionByAfn(afn: string): PublicSubmission | null {
  const cleanAfn = afn.trim().toUpperCase();
  const all = loadSubmissions();
  for (const formId of Object.keys(all)) {
    if (Array.isArray(all[formId])) {
      for (const sub of all[formId]) {
        if (
          (sub.student?.afn && sub.student.afn.trim().toUpperCase() === cleanAfn) ||
          (sub.student?.rollNumber && sub.student.rollNumber.trim().toUpperCase() === cleanAfn)
        ) {
          return sub;
        }
        if (Array.isArray(sub.teamMembers)) {
          for (const tm of sub.teamMembers) {
            if (
              (tm.afn && tm.afn.trim().toUpperCase() === cleanAfn) ||
              ((tm as any).rollNumber && (tm as any).rollNumber.trim().toUpperCase() === cleanAfn)
            ) {
              return sub;
            }
          }
        }
      }
    }
  }
  return null;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─── Animations ─── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

const staggerChildren: Variants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Steps ─── */
type Step = "landing" | "forms" | "register" | "success" | "status";

/* ─── Props ─── */
interface PublicLandingPageProps {
  /** Called when the secret admin access gesture is triggered */
  onAdminAccess?: () => void;
}

// Session storage key to ensure intro animation only plays once per session
const INTRO_SESSION_KEY = "kit_intro_completed";

function checkIntroSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("intro") === "1" || params.get("intro") === "true") {
      return false; // developer / testing bypass
    }
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

// Module-scoped flag so the full V3 intro plays on initial page load / refresh,
// but does not re-trigger during in-app navigation or step transitions.
let hasPlayedLandingIntro = false;

/* ═══════════════════════════════════════════════════
   PUBLIC LANDING PAGE
   ═══════════════════════════════════════════════════ */
export function PublicLandingPage({ onAdminAccess }: PublicLandingPageProps) {
  // ── V3 intro animation state ─────────────────────────────────────────
  const heroLogoRef = useRef<HTMLDivElement | null>(null);
  const mobileHeroLogoRef = useRef<HTMLDivElement | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introRevealing, setIntroRevealing] = useState(true);

  // Check intro eligibility once on client mount to eliminate refresh glitches
  useEffect(() => {
    const alreadySeen = checkIntroSeen();
    if (!alreadySeen && !hasPlayedLandingIntro) {
      hasPlayedLandingIntro = true;
      try {
        sessionStorage.setItem(INTRO_SESSION_KEY, "true");
      } catch {}
      setShowIntro(true);
      setIntroRevealing(false);
    } else {
      hasPlayedLandingIntro = true;
      setShowIntro(false);
      setIntroRevealing(true);
    }
  }, []);

  const handleIntroReveal = useCallback(() => {
    setIntroRevealing(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    hasPlayedLandingIntro = true;
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    } catch {}
    setShowIntro(false);
    setIntroRevealing(true);
  }, []);

  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<Step>("landing");
  const [afn, setAfn] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [forms, setForms] = useState<AvailableForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<AvailableForm | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<PublicSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const studentCacheRef = useRef<Map<string, StudentRecord>>(new Map());
  const isSyncingFormsRef = useRef(false);

  // Registration form state
  const [registrationType, setRegistrationType] = useState<"individual" | "group">("individual");
  const [whatsapp, setWhatsapp] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState<Record<number, boolean>>({});

  const router = useRouter();

  // AFN Record Request Feature
  const [afnNotFound, setAfnNotFound] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Hidden Admin Access State
  const [isHoldingLogo, setIsHoldingLogo] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didTriggerLongPress = useRef(false);

  // Final Deliverables Modal State
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [finalTargetForm, setFinalTargetForm] = useState<AvailableForm | null>(null);
  const [finalTargetSubmission, setFinalTargetSubmission] = useState<PublicSubmission | null>(null);
  const [finalRepoUrl, setFinalRepoUrl] = useState("");
  const [finalDemoUrl, setFinalDemoUrl] = useState("");
  const [finalReportFileName, setFinalReportFileName] = useState("");
  const [finalSlidesFileName, setFinalSlidesFileName] = useState("");
  const [finalRemarks, setFinalRemarks] = useState("");
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [finalSuccessToast, setFinalSuccessToast] = useState<string | null>(null);

  // Sync active session and mark mounted on client to eliminate hydration diffs
  useEffect(() => {
    setIsMounted(true);
    setActiveSession(getActiveSession());
    hasPlayedLandingIntro = true;

    // Purge any stale synthetic test forms from localStorage
    try {
      const stored = localStorage.getItem("kit_published_initiatives");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (f: any) =>
              f &&
              !f.id?.startsWith("INIT-TEST-") &&
              f.id !== "INIT-318809" &&
              f.id !== "INIT-759402" &&
              f.id !== "INIT-BCS751"
          );
          localStorage.setItem("kit_published_initiatives", JSON.stringify(cleaned));
        }
      }
    } catch {}

    // Background pre-fetch of entire student roster for instant 0ms RAM lookups
    fetch("/api/students")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.students)) {
          for (const s of data.students) {
            if (s.afn) studentCacheRef.current.set(String(s.afn).toUpperCase(), s);
            if (s.rollNumber) studentCacheRef.current.set(String(s.rollNumber).toUpperCase(), s);
          }
        }
      })
      .catch(() => {});

    // Background warm-up of published forms from API
    fetch("/api/forms")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.forms)) {
          const cleanForms = data.forms.filter(
            (f: any) =>
              f &&
              !f.id?.startsWith("INIT-TEST-") &&
              f.id !== "INIT-318809" &&
              f.id !== "INIT-759402" &&
              f.id !== "INIT-BCS751"
          );
          localStorage.setItem("kit_published_initiatives", JSON.stringify(cleanForms));
        }
      })
      .catch(() => {});

    // If arrived with session_expired query parameter, redirect to hidden login panel
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("session_expired") === "1" || params.get("session_expired") === "true") {
        router.replace("/admin?session_expired=1");
        return;
      }
    }

    const syncSession = () => setActiveSession(getActiveSession());
    const handleTimeout = () => {
      router.replace("/admin?session_expired=1");
    };
    const syncInitiatives = () => {
      fetch("/api/forms")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.forms)) {
            const cleanForms = data.forms.filter(
              (f: any) =>
                f &&
                !f.id?.startsWith("INIT-TEST-") &&
                f.id !== "INIT-318809" &&
                f.id !== "INIT-759402" &&
                f.id !== "INIT-BCS751"
            );
            localStorage.setItem("kit_published_initiatives", JSON.stringify(cleanForms));
          }
        })
        .catch(() => {});
    };

    window.addEventListener("kit-auth-change", syncSession);
    window.addEventListener("kit-session-timeout", handleTimeout);
    window.addEventListener("kit-initiatives-change", syncInitiatives);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("kit-auth-change", syncSession);
      window.removeEventListener("kit-session-timeout", handleTimeout);
      window.removeEventListener("kit-initiatives-change", syncInitiatives);
      window.removeEventListener("storage", syncSession);
    };
  }, [router]);

  // Focus AFN input on mount
  useEffect(() => {
    if (step === "landing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  // Navigate to hidden admin panel page
  const triggerHiddenLogin = useCallback(() => {
    didTriggerLongPress.current = true;
    setIsHoldingLogo(false);

    try {
      if (typeof window !== "undefined" && window.navigator && "vibrate" in window.navigator) {
        window.navigator.vibrate([40, 30, 40]);
      }
    } catch {
      // ignore
    }

    if (onAdminAccess) {
      onAdminAccess();
    } else {
      router.push("/admin");
    }
  }, [onAdminAccess, router]);

  /* ─── Secret Access: Ctrl+Shift+H (desktop) ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h")) {
        e.preventDefault();
        triggerHiddenLogin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerHiddenLogin]);

  /* ─── Secret Access: Tap & Hold logo (mobile touch & pointer) ─── */
  const handleLogoPointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    didTriggerLongPress.current = false;
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    touchStartPos.current = { x: clientX, y: clientY };
    setIsHoldingLogo(true);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = setTimeout(() => {
      triggerHiddenLogin();
    }, 900);
  }, [triggerHiddenLogin]);

  const handleLogoTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || e.touches.length === 0) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    // If finger moved more than 10px in any direction, cancel long-press to allow scrolling
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setIsHoldingLogo(false);
      touchStartPos.current = null;
    }
  }, []);

  const handleLogoPointerUp = useCallback((e?: React.SyntheticEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsHoldingLogo(false);
    touchStartPos.current = null;

    if (didTriggerLongPress.current) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setTimeout(() => {
        didTriggerLongPress.current = false;
      }, 350);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);



  /* ─── Load Forms For Student ─── */
  const loadFormsForStudent = useCallback(async (data: StudentRecord) => {
    setStudent(data);
    const trimmedAfn = (data.afn || "").trim();
    const trimmedRoll = (data.rollNumber || "").trim();

    // Helper to evaluate and filter eligible forms
    const evaluateEligibleForms = (rawForms: any[], subsDict: Record<string, any[]>) => {
      const cleanForms = (rawForms || []).filter(
        (f: any) =>
          f &&
          !f.id?.startsWith("INIT-TEST-") &&
          f.id !== "INIT-318809" &&
          f.id !== "INIT-759402" &&
          f.id !== "INIT-BCS751"
      );

      const getSub = (formId: string, subjectCode?: string): PublicSubmission | null => {
        const keysToCheck = [formId];
        if (subjectCode && subjectCode !== formId) keysToCheck.push(subjectCode);

        for (const key of keysToCheck) {
          const subs = subsDict[key] || [];
          for (const rawSub of subs) {
            const sub = rawSub as any;
            const sAfn = (sub.student?.afn || sub.studentAfn || "").trim().toUpperCase();
            const sRoll = (sub.student?.rollNumber || sub.studentRollNumber || "").trim().toUpperCase();
            const formatMatchedSub = (raw: any): PublicSubmission => {
              const effectiveStatus = getSubmissionApprovalStatus(raw, formId, trimmedAfn);
              return {
                ...raw,
                approvalStatus: effectiveStatus,
                verificationStatus:
                  effectiveStatus === "approved"
                    ? "verified"
                    : effectiveStatus === "not_approved"
                    ? "rejected"
                    : "pending",
              } as PublicSubmission;
            };

            if (
              (trimmedAfn && sAfn === trimmedAfn.toUpperCase()) ||
              (trimmedRoll && sRoll === trimmedRoll.toUpperCase()) ||
              (trimmedAfn && sRoll === trimmedAfn.toUpperCase()) ||
              (trimmedRoll && sAfn === trimmedRoll.toUpperCase())
            ) {
              return formatMatchedSub(sub);
            }
            const members = (sub.teamMembers || []) as any[];
            for (const tm of members) {
              const tmAfn = (tm.afn || "").trim().toUpperCase();
              const tmRoll = (tm.rollNumber || tm.rollNo || "").trim().toUpperCase();
              if (
                (trimmedAfn && tmAfn === trimmedAfn.toUpperCase()) ||
                (trimmedRoll && tmRoll === trimmedRoll.toUpperCase()) ||
                (trimmedAfn && tmRoll === trimmedAfn.toUpperCase()) ||
                (trimmedRoll && tmAfn === trimmedRoll.toUpperCase())
              ) {
                return formatMatchedSub(sub);
              }
            }
          }
        }
        return null;
      };

      const eligibleForms: AvailableForm[] = [];
      cleanForms.forEach((init: any) => {
        if (isStudentEligibleForForm(data, init)) {
          const sub = getSub(init.id, init.subjectCode);

          let finalSubCfg: any = init.finalSubmission || null;
          if (typeof window !== "undefined") {
            try {
              const rawCfg = localStorage.getItem(`kit_final_submission_${init.id}`);
              if (rawCfg) finalSubCfg = JSON.parse(rawCfg);
            } catch {}
          }
          const isFinalOpen = Boolean(
            init.finalSubmissionOpen || init.finalSubmission?.enabled || finalSubCfg?.enabled
          );

          eligibleForms.push({
            id: init.id,
            title: init.title || (init.customProjectName
              ? `${init.customProjectName} Registration Form`
              : `${init.projectType || "Project"} Registration Form`),
            description: init.description || "",
            dispatchedBy: init.publishedBy || (init.coordinator?.name ? `${init.coordinator.name} (${init.coordinator.role || "Coordinator"})` : "Rahul Singh (HOD)"),
            roleBadge: init.assignedTo === "faculty" || init.coordinator?.role === "Faculty" ? "Faculty" : "HOD",
            subjectCode: init.subjectCode || "BCS751",
            category: init.category || "Academic",
            course: init.course || data.course,
            stream: init.stream || data.stream,
            year: init.year || data.year,
            section: init.section || data.section || "A",
            startDate: init.startDate || "2026-10-16",
            deadline: init.deadline || "2026-11-30",
            status: sub ? "Submitted" : "Open",
            submission: sub || undefined,
            finalSubmissionOpen: isFinalOpen,
            finalSubmissionDeadline: finalSubCfg?.deadline || init.finalSubmissionDeadline || "2026-11-15",
            finalSubmissionConfig: finalSubCfg,
          });
        }
      });

      eligibleForms.sort((a, b) => {
        if (a.status === "Open" && b.status !== "Open") return -1;
        if (a.status !== "Open" && b.status === "Open") return 1;
        return 0;
      });

      return eligibleForms;
    };

    // Stale-While-Revalidate: load immediately from local cache (0ms instant transition)
    let cachedForms: any[] = [];
    try {
      const stored = localStorage.getItem("kit_published_initiatives");
      if (stored) cachedForms = JSON.parse(stored);
    } catch {}

    const localSubs = loadSubmissions();
    const instantForms = evaluateEligibleForms(cachedForms, localSubs);

    // Switch step immediately so student never experiences waiting spinner
    setForms(instantForms);
    setLoading(false);
    setStep("forms");

    if (isSyncingFormsRef.current) return;
    isSyncingFormsRef.current = true;

    // Fetch fresh forms and submissions concurrently in background
    try {
      const [formsRes, subsRes] = await Promise.all([
        fetch("/api/forms").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/submissions").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      let freshForms = cachedForms;
      if (formsRes?.success && Array.isArray(formsRes.forms)) {
        freshForms = formsRes.forms;
        try {
          localStorage.setItem("kit_published_initiatives", JSON.stringify(freshForms));
        } catch {}
      }

      let freshSubs = localSubs;
      if (subsRes?.success && subsRes.submissions) {
        freshSubs = { ...localSubs, ...subsRes.submissions };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(freshSubs));
        } catch {}
      }

      const freshEligible = evaluateEligibleForms(freshForms, freshSubs);
      setForms(freshEligible);
    } catch {
      // background update silently catches
    } finally {
      isSyncingFormsRef.current = false;
    }
  }, []);

  // Real-time synchronization when submissions or approvals are modified externally
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleSubmissionsChange = () => {
      if (student && !isSyncingFormsRef.current) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadFormsForStudent(student);
        }, 150);
      }
    };
    window.addEventListener("kit-submissions-change", handleSubmissionsChange);
    window.addEventListener("storage", handleSubmissionsChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("kit-submissions-change", handleSubmissionsChange);
      window.removeEventListener("storage", handleSubmissionsChange);
    };
  }, [student, loadFormsForStudent]);

  /* ─── Fetch Student ─── */
  const handleAfnSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = afn.trim();
      const upper = trimmed.toUpperCase();

      // Must be exactly 6 digits — no fetch otherwise
      if (!/^\d{6}$/.test(trimmed)) {
        setError("Invalid AFN — please enter your 6-digit Academic File Number.");
        return;
      }

      setError("");

      // Instant cache hit check (0ms)
      if (studentCacheRef.current.has(upper)) {
        const cached = studentCacheRef.current.get(upper)!;
        setAfnNotFound(false);
        loadFormsForStudent(cached);
        return;
      }

      setLoading(true);

      try {
        let data: StudentRecord | null = null;
        const res = await fetch(`/api/students/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          data = await res.json();
          if (data) {
            studentCacheRef.current.set(upper, data);
            if (data.afn) studentCacheRef.current.set(data.afn.toUpperCase(), data);
            if (data.rollNumber) studentCacheRef.current.set(data.rollNumber.toUpperCase(), data);
          }
        } else {
          // Check local custom students (e.g. from requested additions)
          try {
            const customList: StudentRecord[] = JSON.parse(
              localStorage.getItem("kit_custom_students") || "[]"
            );
            data = customList.find(
              (s) =>
                s.afn.toUpperCase() === upper ||
                (s.rollNumber && s.rollNumber.toUpperCase() === upper)
            ) || null;
            if (data) {
              studentCacheRef.current.set(upper, data);
            }
          } catch {}
        }

        if (!data) {
          setError("No student found with this AFN or Roll Number. Please check or request registration below.");
          setAfnNotFound(true);
          setLoading(false);
          return;
        }

        setAfnNotFound(false);
        await loadFormsForStudent(data);
      } catch {
        setError("Something went wrong while loading forms. Please try again.");
        setLoading(false);
      }
    },
    [afn, loadFormsForStudent]
  );

  /* ─── Fast input change with prefetch ─── */
  const handleAfnChange = useCallback((val: string) => {
    // Strip non-digits and cap at 6
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setAfn(digits);
    if (error) setError("");
    if (afnNotFound) setAfnNotFound(false);
  }, [error, afnNotFound]);

  const handleRecordRequestSubmitted = useCallback(
    async (newStudent: StudentRecord) => {
      setAfn(newStudent.afn);
      setAfnNotFound(false);
      setError("");
      await loadFormsForStudent(newStudent);
    },
    [loadFormsForStudent]
  );

  /* ─── Open Registration Form ─── */
  const handleSelectForm = (form: AvailableForm) => {
    setSelectedForm(form);
    setRegistrationType("individual");
    setWhatsapp("");
    setProjectName("");
    setProjectDescription("");
    setTeamMembers([]);
    setStep("register");
  };

  /* ─── Add team member ─── */
  const addTeamMember = () => {
    setTeamMembers((prev) => [...prev, { afn: "", name: "", whatsapp: "" }]);
  };

  const removeTeamMember = (idx: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ─── Fetch team member name by AFN ─── */
  const fetchTeamMemberName = async (idx: number, memberAfn: string) => {
    if (!memberAfn.trim()) return;
    const clean = memberAfn.trim().toUpperCase();

    if (studentCacheRef.current.has(clean)) {
      const data = studentCacheRef.current.get(clean)!;
      setTeamMembers((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], name: data.name };
        return updated;
      });
      return;
    }

    setTeamLoading((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data: StudentRecord = await res.json();
        studentCacheRef.current.set(clean, data);
        if (data.afn) studentCacheRef.current.set(data.afn.toUpperCase(), data);
        if (data.rollNumber) studentCacheRef.current.set(data.rollNumber.toUpperCase(), data);
        setTeamMembers((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], name: data.name };
          return updated;
        });
      }
    } catch {
      // ignore
    }
    setTeamLoading((prev) => ({ ...prev, [idx]: false }));
  };

  const handleTeamMemberChange = (
    idx: number,
    field: keyof TeamMember,
    value: string
  ) => {
    setTeamMembers((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });

    if (field === "afn") {
      const clean = value.trim().toUpperCase();
      if (clean.length >= 6) {
        if (studentCacheRef.current.has(clean)) {
          const data = studentCacheRef.current.get(clean)!;
          setTeamMembers((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], name: data.name };
            return updated;
          });
        } else {
          fetchTeamMemberName(idx, value);
        }
      }
    }
  };

  /* ─── Submit Registration ─── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedForm) return;

    const submission: PublicSubmission = {
      formId: selectedForm.id,
      registrationType,
      student: {
        afn: student.afn,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        course: student.course,
        stream: student.stream,
        year: student.year,
        whatsapp,
      },
      projectName,
      projectDescription,
      teamMembers:
        registrationType === "group"
          ? teamMembers.filter((m) => m.afn.trim() !== "")
          : [],
      submittedAt: new Date().toISOString(),
      verificationStatus: "pending",
    };

    const all = loadSubmissions();
    const primaryKey = selectedForm.id;
    if (!all[primaryKey]) {
      all[primaryKey] = [];
    }

    // Deduplicate or append
    const existingIdx = all[primaryKey].findIndex(
      (s) =>
        (s.student?.afn && s.student.afn.trim().toUpperCase() === student.afn.trim().toUpperCase()) ||
        (s.student?.rollNumber && s.student.rollNumber.trim().toUpperCase() === student.rollNumber.trim().toUpperCase())
    );
    if (existingIdx >= 0) {
      all[primaryKey][existingIdx] = submission;
    } else {
      all[primaryKey].push(submission);
    }

    // Also sync under subjectCode key (e.g. BCS751) if different from primaryKey
    if (selectedForm.subjectCode && selectedForm.subjectCode !== primaryKey) {
      const codeKey = selectedForm.subjectCode;
      if (!all[codeKey]) all[codeKey] = [];
      const codeIdx = all[codeKey].findIndex(
        (s) =>
          (s.student?.afn && s.student.afn.trim().toUpperCase() === student.afn.trim().toUpperCase()) ||
          (s.student?.rollNumber && s.student.rollNumber.trim().toUpperCase() === student.rollNumber.trim().toUpperCase())
      );
      if (codeIdx >= 0) {
        all[codeKey][codeIdx] = submission;
      } else {
        all[codeKey].push(submission);
      }
    }

    saveSubmissions(all);

    // Persist to server API in background
    fetch(`/api/forms/${encodeURIComponent(selectedForm.id)}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: selectedForm.id,
        submission,
      }),
    }).catch(() => {});

    fetch(`/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: selectedForm.id,
        submission,
      }),
    }).catch(() => {});

    // Update forms state locally so this form is immediately marked submitted
    setForms((prev) =>
      prev.map((f) =>
        f.id === selectedForm.id
          ? { ...f, status: "Submitted", submission }
          : f
      )
    );

    setExistingSubmission(submission);
    setStep("success");
  };

  /* ─── Reset ─── */
  const handleReset = () => {
    setStep("landing");
    setAfn("");
    setStudent(null);
    setForms([]);
    setSelectedForm(null);
    setExistingSubmission(null);
    setError("");
    setWhatsapp("");
    setProjectName("");
    setProjectDescription("");
    setTeamMembers([]);
    setRegistrationType("individual");
  };

  /* ─── Final Deliverables Submission Handlers ─── */
  const handleOpenFinalDeliverablesModal = (form: AvailableForm, sub?: PublicSubmission) => {
    setFinalTargetForm(form);
    const existing = sub || form.submission || existingSubmission || null;
    setFinalTargetSubmission(existing);
    if (existing?.finalSubmission) {
      setFinalRepoUrl(existing.finalSubmission.repoUrl || "");
      setFinalDemoUrl(existing.finalSubmission.demoUrl || "");
      setFinalReportFileName(existing.finalSubmission.reportFileName || "");
      setFinalSlidesFileName(existing.finalSubmission.slidesFileName || "");
      setFinalRemarks(existing.finalSubmission.remarks || "");
    } else {
      setFinalRepoUrl("");
      setFinalDemoUrl("");
      setFinalReportFileName("");
      setFinalSlidesFileName("");
      setFinalRemarks("");
    }
    setIsFinalModalOpen(true);
  };

  const handleSubmitFinalDeliverables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalTargetForm) return;

    setIsSubmittingFinal(true);
    try {
      const finalPayload = {
        repoUrl: finalRepoUrl.trim(),
        demoUrl: finalDemoUrl.trim(),
        reportFileName: finalReportFileName.trim() || `${student?.rollNumber || student?.afn || "Project"}_Report_Dossier.pdf`,
        slidesFileName: finalSlidesFileName.trim() || `${student?.rollNumber || student?.afn || "Project"}_Presentation_Slides.pptx`,
        remarks: finalRemarks.trim(),
        submittedAt: new Date().toISOString(),
      };

      // 1. Update kit_public_submissions in localStorage
      const allSubs = loadSubmissions();
      const formKey = finalTargetForm.id;
      if (!allSubs[formKey]) allSubs[formKey] = [];

      const targetAfn = (student?.afn || "").trim().toUpperCase();
      const targetRoll = (student?.rollNumber || "").trim().toUpperCase();

      let updatedSub: PublicSubmission | null = null;

      for (let i = 0; i < allSubs[formKey].length; i++) {
        const item = allSubs[formKey][i];
        const sAfn = (item.student?.afn || "").trim().toUpperCase();
        const sRoll = (item.student?.rollNumber || "").trim().toUpperCase();
        const isMember =
          Array.isArray(item.teamMembers) &&
          item.teamMembers.some((m) => (m.afn || "").trim().toUpperCase() === targetAfn);

        if (sAfn === targetAfn || sRoll === targetRoll || isMember) {
          allSubs[formKey][i] = {
            ...item,
            finalSubmission: finalPayload,
            finalSubmissionCompleted: true,
          };
          updatedSub = allSubs[formKey][i];
          break;
        }
      }

      if (!updatedSub && finalTargetSubmission) {
        updatedSub = {
          ...finalTargetSubmission,
          finalSubmission: finalPayload,
          finalSubmissionCompleted: true,
        };
        allSubs[formKey].push(updatedSub);
      }

      saveSubmissions(allSubs);

      // 2. Also sync to /api/submissions
      try {
        await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formId: finalTargetForm.id,
            submission: updatedSub,
          }),
        });
      } catch (err) {
        console.warn("Could not sync final submission to server:", err);
      }

      // 3. Update state
      if (updatedSub) {
        setExistingSubmission(updatedSub);
      }
      setForms((prev) =>
        prev.map((f) => {
          if (f.id === finalTargetForm.id) {
            return {
              ...f,
              submission: updatedSub || f.submission,
            };
          }
          return f;
        })
      );

      setIsFinalModalOpen(false);
      setFinalSuccessToast("Final deliverables submitted successfully! Project is now ready for evaluation.");
      setTimeout(() => setFinalSuccessToast(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <>
      {/* ── V3: First-visit intro animation ─────────────────────────── */}
      {showIntro && (
        <PageIntroAnimation
          heroLogoRef={heroLogoRef}
          mobileHeroLogoRef={mobileHeroLogoRef}
          onStartReveal={handleIntroReveal}
          onComplete={handleIntroComplete}
        />
      )}

      {/* ── Native Mobile Experience (< 768px): Dedicated MobileShell ── */}
      <div
        className="block md:hidden w-full h-[100dvh] overflow-hidden"
        style={{
          opacity: showIntro && !introRevealing ? 0 : 1,
          transition: introRevealing ? 'opacity 0.4s ease' : 'none',
        }}
      >
        <StudentMobileApp onAdminAccess={triggerHiddenLogin} heroLogoRef={mobileHeroLogoRef} />
      </div>

      {/* ── Desktop Experience (≥ 768px): Desktop Shell ──────── */}
      <div
        className={`hidden md:flex bg-[#F6F5F2] flex-col ${step === "register" ? "h-screen overflow-hidden" : "min-h-screen"} w-full max-w-full overflow-x-hidden`}
        style={{
          opacity: showIntro && !introRevealing ? 0 : 1,
          transition: introRevealing ? 'opacity 0.4s ease' : 'none',
        }}
      >
      {/* ─── Fixed Non-Scrolling Header ─── */}
      <header className="fixed top-0 left-0 right-0 h-16 w-full px-4 sm:px-8 flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md z-40 shadow-2xs">
        {/* Leftmost: Institution Logo with Secret Mobile Long-Press */}
        <div className="flex items-center">
          <button
            onClick={(e) => {
              if (didTriggerLongPress.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              handleReset();
            }}
            onTouchStart={handleLogoPointerDown}
            onTouchMove={handleLogoTouchMove}
            onTouchEnd={handleLogoPointerUp}
            onTouchCancel={handleLogoPointerUp}
            onMouseDown={handleLogoPointerDown}
            onMouseUp={handleLogoPointerUp}
            onMouseLeave={handleLogoPointerUp}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
            className={`flex items-center group cursor-pointer select-none transition-all duration-200 ${
              isHoldingLogo ? "scale-95 ring-4 ring-[#0D3481]/30 rounded-xl" : ""
            }`}
            aria-label="Kanpur Institute of Technology"
            title="Kanpur Institute of Technology"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGOS.kit}
              alt="Kanpur Institute of Technology"
              className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[170px] object-contain group-hover:scale-105 transition-transform"
              draggable={false}
            />
          </button>
        </div>

        {/* Middle: projects.kit */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto">
          <button
            onClick={handleReset}
            className="text-base sm:text-lg font-extrabold tracking-tight text-[#10334A] hover:opacity-90 transition-opacity cursor-pointer select-none"
            aria-label="projects.kit home"
          >
            projects<span className="text-[#0D3481]">.kit</span>
          </button>
        </div>
      </header>

      {/* Header spacer to prevent content from slipping under fixed header */}
      <div className="h-16 shrink-0 w-full" aria-hidden="true" />

      {/* ─── Main Content ─── */}
      <main className={`flex-1 flex items-center justify-center px-4 w-full max-w-full ${step === "register" ? "py-2 sm:py-3 overflow-hidden min-h-0" : "py-6 sm:py-12"}`}>
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: Landing — AFN Entry ═══ */}
          {step === "landing" && (
            <motion.div
              key="landing"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6 sm:mb-8 w-full">
                {/* Hero logo — suppressed motion during intro (appears via flying logo) */}
                <motion.div
                  initial={showIntro ? false : { scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex justify-center mb-4 sm:mb-5"
                >
                  <div
                    ref={heroLogoRef}
                    className={`relative inline-flex items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
                      isHoldingLogo
                        ? "scale-95 ring-4 ring-[#0D3481]/30 bg-blue-50/50 shadow-md animate-pulse"
                        : "hover:scale-105"
                    }`}
                    onTouchStart={handleLogoPointerDown}
                    onTouchMove={handleLogoTouchMove}
                    onTouchEnd={handleLogoPointerUp}
                    onTouchCancel={handleLogoPointerUp}
                    onMouseDown={handleLogoPointerDown}
                    onMouseUp={handleLogoPointerUp}
                    onMouseLeave={handleLogoPointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                    role="button"
                    tabIndex={0}
                    aria-label="KIT Logo (Tap and hold on mobile for staff access)"
                    title="Kanpur Institute of Technology"
                  >
                    {/* projects.kit SVG logo — exact from animation, sized for hero */}
                    <svg
                      viewBox="0 0 1930 1930"
                      role="img"
                      aria-label="projects.kit logo"
                      className="h-14 sm:h-20 w-auto object-contain cursor-pointer select-none transition-transform"
                      style={{ WebkitTouchCallout: "none", pointerEvents: "none", userSelect: "none" }}
                    >
                      <defs>
                        <mask id="cut-hero" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
                          <rect width="1930" height="1930" fill="#fff" />
                          <g fill="none" stroke="#000" strokeWidth="105">
                            <line x1="928" y1="585" x2="770" y2="1135" />
                            <line x1="928" y1="585" x2="1345" y2="1005" />
                            <line x1="770" y1="1135" x2="1345" y2="1005" />
                            <line x1="770" y1="1135" x2="587" y2="1732" />
                          </g>
                          <g fill="#000">
                            <circle cx="928" cy="585" r="165" />
                            <circle cx="1345" cy="1005" r="165" />
                            <circle cx="770" cy="1135" r="165" />
                          </g>
                        </mask>
                      </defs>
                      <polygon
                        points="965,413.5 1516.5,965 965,1516.5 413.5,965"
                        fill="#1C3A7F"
                        stroke="#1C3A7F"
                        strokeWidth="600"
                        strokeLinejoin="round"
                        mask="url(#cut-hero)"
                      />
                    </svg>
                  </div>
                </motion.div>

                <h1 className="text-[clamp(1.15rem,4.6vw,2.25rem)] font-extrabold text-[#10334A] tracking-tight leading-tight whitespace-nowrap text-center max-w-full">
                  Submit and track your <span className="text-[#0D3481]">projects</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 sm:mt-3 max-w-sm mx-auto leading-relaxed px-2">
                  Enter your AFN to check available project registrations and
                  submit your project details.
                </p>
              </div>

              {/* AFN Input Card */}
              <form
                onSubmit={handleAfnSubmit}
                className="w-full max-w-md sm:max-w-lg mx-auto bg-white rounded-2xl p-5 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90"
              >
                <label className="block text-xs font-bold text-[#10334A] mb-2">
                  Academic File Number (AFN)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={afn}
                    onChange={(e) => handleAfnChange(e.target.value)}
                    placeholder="e.g. 232451"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-slate-50/50 transition-all text-slate-800 placeholder:text-slate-400"
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>
                {/* Live digit hint */}
                {afn.length > 0 && afn.length < 6 && (
                  <p className="mt-1.5 text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    AFN must be exactly 6 digits ({6 - afn.length} more needed)
                  </p>
                )}

                {/* Generic errors (wrong format, network issues) */}
                {error && !afnNotFound && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || afn.length !== 6}
                  className="w-full mt-5 py-3 px-4 bg-[#0D3481] hover:bg-[#0A2761] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#0D3481]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Looking up...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* AFN not found — shown after a failed fetch */}
                {afnNotFound && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <p className="text-xs sm:text-sm font-semibold text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      AFN <strong>{afn}</strong> not found — double-check your number or request to be added to the registry below.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRequestModalOpen(true)}
                      className="mt-3 w-full py-2 px-4 bg-[#0D3481] hover:bg-[#0A2761] text-white rounded-xl text-xs sm:text-sm font-bold shadow shadow-[#0D3481]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Request to Add My Record
                    </button>
                  </motion.div>
                )}
              </form>

              <p className="text-center text-[11px] text-slate-400 mt-5">
                projects.kit · Kanpur Institute of Technology
              </p>
            </motion.div>
          )}

          {/* ═══ STEP 2: Available Forms ═══ */}
          {step === "forms" && student && (
            <motion.div
              key="forms"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl w-full"
            >
              {/* Student Badge */}
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0D3481]/10 flex items-center justify-center text-[#0D3481] font-extrabold text-lg shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {student.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                      <span className="font-mono font-bold text-[#0D3481]">
                        AFN: {student.afn}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>{student.course} ·</span>
                        <StreamBadge stream={student.stream} />
                      </span>
                      <span>{student.year}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change
                  </button>
                </div>
              </motion.div>

              {/* Forms */}
              {forms.length === 0 ? (
                <motion.div
                  variants={fadeUp}
                  className="bg-white rounded-2xl p-10 border border-slate-200 shadow-sm text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    No projects available right now
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                    There are no open project registration forms for your course
                    and year at this time.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-6 px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={staggerChildren} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold text-[#10334A]">
                      Available Project Registrations
                    </h2>
                    <span className="text-[11px] font-bold text-slate-400">
                      {forms.length} form{forms.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {forms.map((form) => {
                    const remaining = daysUntil(form.deadline);
                    const isUrgent = remaining <= 7;
                    const isRegistered = form.status === "Submitted" || Boolean(form.submission);
                    const isProjectSubmitted = Boolean(form.submission?.finalSubmissionCompleted);

                    return (
                      <motion.div
                        key={form.id}
                        variants={fadeUp}
                        className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${
                          isRegistered ? "border-emerald-200" : "border-slate-200"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#0D3481]/10 text-[#0D3481]">
                            {form.subjectCode}
                          </span>
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            {form.category}
                          </span>
                          {form.finalSubmissionOpen && (
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs">
                              <span>Final Deliverables Open</span>
                            </span>
                          )}
                          {isProjectSubmitted ? (
                            <>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Registered</span>
                              </span>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border-teal-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                <span>Submitted</span>
                              </span>
                            </>
                          ) : isRegistered ? (
                            <>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Registered</span>
                              </span>
                              {(() => {
                                const app = getSubmissionApprovalStatus(
                                  form.submission,
                                  form.id,
                                  student.afn
                                );
                                if (app === "approved") {
                                  return (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Approved</span>
                                    </span>
                                  );
                                }
                                if (app === "not_approved") {
                                  return (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-red-50 text-red-700 border-red-200">
                                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                      <span>Not Approved</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border-amber-200">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pending Approval</span>
                                  </span>
                                );
                              })()}
                            </>
                          ) : (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                                isUrgent
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {isUrgent ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={LOGOS.hourglass}
                                    alt="Urgent deadline"
                                    className="w-3.5 h-3.5 object-contain shrink-0"
                                  />
                                  <span>
                                    {remaining} day{remaining !== 1 ? "s" : ""} left
                                  </span>
                                </>
                              ) : (
                                <span>{remaining} days remaining</span>
                              )}
                            </span>
                          )}
                        </div>

                        <h3 className={`text-base font-bold text-slate-900 leading-snug ${form.description ? "mb-1.5" : "mb-4"}`}>
                          {form.title}
                        </h3>
                        {form.description ? (
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            {form.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Starts:{" "}
                              <strong className="text-slate-800">
                                {formatDate(form.startDate)}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-red-400" />
                            <span>
                              Deadline:{" "}
                              <strong className="text-red-700 font-mono">
                                {formatDate(form.deadline)}
                              </strong>
                            </span>
                          </div>
                          {form.finalSubmissionOpen && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Final Deadline:{" "}
                                <strong className="text-emerald-800 font-mono">
                                  {formatDate(form.finalSubmissionDeadline || "2026-11-15")}
                                </strong>
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0D3481]" />
                            <span>
                              By: <strong>{form.dispatchedBy}</strong>
                            </span>
                          </div>
                        </div>

                        {isRegistered ? (
                          <div className="flex flex-wrap items-center gap-2.5">
                            {form.finalSubmissionOpen && (
                              <button
                                onClick={() => handleOpenFinalDeliverablesModal(form, form.submission)}
                                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                                  form.submission?.finalSubmissionCompleted
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md hover:shadow-lg"
                                }`}
                              >
                                <Send className="w-3.5 h-3.5 text-white" />
                                <span>
                                  {form.submission?.finalSubmissionCompleted
                                    ? "Final Deliverables Submitted (View/Edit)"
                                    : "Submit Final Deliverables"}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedForm(form);
                                setExistingSubmission(form.submission || null);
                                setStep("status");
                              }}
                              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>View Registration Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <button
                              onClick={() => handleSelectForm(form)}
                              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Register My Project Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            {form.finalSubmissionOpen && (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Final submissions open alongside registration</span>
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 3: Registration Form ═══ */}
          {step === "register" && student && selectedForm && (
            <motion.div
              key="register"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl w-full max-h-full flex flex-col min-h-0"
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-90px)]"
              >
                {/* Form Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0D3481] text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono font-bold text-[#0D3481]">
                        {selectedForm.subjectCode}
                      </span>
                      <h2 className="text-sm font-bold text-[#10334A] leading-tight truncate">
                        {selectedForm.title}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("forms")}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                  {/* Deadline Notice */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <span>
                      Dispatched by:{" "}
                      <strong>{selectedForm.dispatchedBy}</strong>
                    </span>
                    <span>
                      Deadline:{" "}
                      <strong className="text-red-700 font-mono">
                        {formatDate(selectedForm.deadline)}
                      </strong>
                    </span>
                  </div>

                  {/* Pre-filled Personal Details */}
                  <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3.5 h-3.5 text-[#0D3481]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Your Details (Auto-filled)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Name
                        </span>
                        <strong className="text-slate-800">
                          {student.name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          AFN
                        </span>
                        <strong className="text-slate-800 font-mono">
                          {student.afn}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Roll Number
                        </span>
                        <strong className="text-slate-800 font-mono">
                          {student.rollNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Email
                        </span>
                        <strong className="text-slate-800">
                          {student.email}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Course & Stream
                        </span>
                        <strong className="text-slate-800 inline-flex items-center gap-1 mt-0.5">
                          <span>{student.course} ·</span>
                          <StreamBadge stream={student.stream} />
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Year
                        </span>
                        <strong className="text-slate-800">
                          {student.year}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Registration Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Registration Type{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType("individual");
                          setTeamMembers([]);
                        }}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          registrationType === "individual"
                            ? "border-[#0D3481] bg-[#0D3481]/5"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <User
                          className={`w-5 h-5 mb-1.5 ${
                            registrationType === "individual"
                              ? "text-[#0D3481]"
                              : "text-slate-400"
                          }`}
                        />
                        <div
                          className={`text-xs font-bold ${
                            registrationType === "individual"
                              ? "text-[#0D3481]"
                              : "text-slate-700"
                          }`}
                        >
                          Individual
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Solo project registration
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegistrationType("group");
                          if (teamMembers.length === 0) {
                            setTeamMembers([
                              { afn: "", name: "", whatsapp: "" },
                            ]);
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          registrationType === "group"
                            ? "border-[#0D3481] bg-[#0D3481]/5"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <Users
                          className={`w-5 h-5 mb-1.5 ${
                            registrationType === "group"
                              ? "text-[#0D3481]"
                              : "text-slate-400"
                          }`}
                        />
                        <div
                          className={`text-xs font-bold ${
                            registrationType === "group"
                              ? "text-[#0D3481]"
                              : "text-slate-700"
                          }`}
                        >
                          Group
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Team project with members
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={LOGOS.whatsapp}
                        alt="WhatsApp"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <span>WhatsApp Number</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] text-slate-800"
                    />
                  </div>

                  {/* Project Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Project Name{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. AI-Powered Campus Surveillance System"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] text-slate-800"
                    />
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Project Description{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe your project idea, objectives, and approach..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] text-slate-800 leading-relaxed resize-none"
                    />
                  </div>

                  {/* Group: Team Members */}
                  {registrationType === "group" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#0D3481]" />
                          Team Members
                        </label>
                        {teamMembers.length < 5 && (
                          <button
                            type="button"
                            onClick={addTeamMember}
                            className="text-[11px] font-bold text-[#0D3481] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Member
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {teamMembers.map((mem, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Member {idx + 2}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeTeamMember(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                              {/* AFN */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 flex items-center h-4">
                                  <span>AFN</span>
                                </label>
                                <input
                                  type="text"
                                  value={mem.afn}
                                  onChange={(e) =>
                                    handleTeamMemberChange(
                                      idx,
                                      "afn",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    fetchTeamMemberName(idx, mem.afn)
                                  }
                                  placeholder="e.g. 232457"
                                  className="h-8 w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D3481] focus:border-[#0D3481]"
                                />
                              </div>

                              {/* Name (auto-filled) */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 h-4">
                                  <span>Name</span>
                                  {teamLoading[idx] && (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5 text-[#0D3481]" />
                                  )}
                                </label>
                                <input
                                  type="text"
                                  value={mem.name}
                                  readOnly
                                  placeholder="Auto-filled from AFN"
                                  className="h-8 w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-not-allowed"
                                />
                              </div>

                              {/* WhatsApp */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 h-4">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={LOGOS.whatsapp}
                                    alt="WhatsApp"
                                    className="w-3 h-3 object-contain shrink-0"
                                  />
                                  <span>WhatsApp</span>
                                </label>
                                <input
                                  type="tel"
                                  value={mem.whatsapp}
                                  onChange={(e) =>
                                    handleTeamMemberChange(
                                      idx,
                                      "whatsapp",
                                      e.target.value
                                    )
                                  }
                                  placeholder="9876543210"
                                  maxLength={10}
                                  className="h-8 w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0D3481] focus:border-[#0D3481]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Footer */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep("forms")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-white text-slate-600 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Response</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ═══ STEP 4: Success ═══ */}
          {step === "success" && existingSubmission && (
            <motion.div
              key="success"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-lg w-full"
            >
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </motion.div>

                <h2 className="text-xl font-extrabold text-slate-900">
                  Response Submitted!
                </h2>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  Your project details have been recorded successfully. Your
                  coordinator will review and verify them.
                </p>

                {/* Summary */}
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Project</span>
                    <strong className="text-slate-800">
                      {existingSubmission.projectName}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Type</span>
                    <strong className="text-slate-800 capitalize">
                      {existingSubmission.registrationType}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      Pending Review
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    onClick={() => {
                      if (student) {
                        loadFormsForStudent(student);
                      } else {
                        setStep("forms");
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View All Available Forms</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 5: Returning Student — Status View ═══ */}
          {step === "status" && student && existingSubmission && (
            <motion.div
              key="status"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-2xl w-full"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#0D3481]/10 flex items-center justify-center text-[#0D3481] font-extrabold text-lg">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {student.name}
                      </h2>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-[#0D3481]">
                          {student.afn}
                        </span>{" "}
                        · {student.course} · {student.year}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Approval Status Banner */}
                  {(() => {
                    const currentApproval = getSubmissionApprovalStatus(
                      existingSubmission,
                      selectedForm?.id,
                      student?.afn
                    );
                    const isApproved = currentApproval === "approved";
                    const isNotApproved = currentApproval === "not_approved";

                    return (
                      <div
                        className={`p-4 rounded-xl border flex items-center gap-3.5 transition-colors ${
                          isApproved
                            ? "bg-emerald-50 border-emerald-200"
                            : isNotApproved
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        {isApproved ? (
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                        ) : isNotApproved ? (
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                        )}
                        <div>
                          <div
                            className={`text-xs font-bold ${
                              isApproved
                                ? "text-emerald-800"
                                : isNotApproved
                                ? "text-red-800"
                                : "text-amber-800"
                            }`}
                          >
                            Approval Status:{" "}
                            <span>
                              {isApproved
                                ? "Approved"
                                : isNotApproved
                                ? "Not Approved"
                                : "Pending Review"}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 leading-relaxed ${
                              isApproved
                                ? "text-emerald-700"
                                : isNotApproved
                                ? "text-red-700"
                                : "text-amber-700"
                            }`}
                          >
                            {isApproved
                              ? "Your project registration has been approved & verified by your project coordinator."
                              : isNotApproved
                              ? "Your registration was marked as not approved. Please contact your coordinator."
                              : "Your submission is pending review by the project coordinator."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Project Details */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Project Details
                    </h3>

                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Project Name
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5">
                          {existingSubmission.projectName}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Description
                        </span>
                        <p className="text-slate-700 leading-relaxed mt-0.5">
                          {existingSubmission.projectDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Type
                          </span>
                          <p className="font-bold text-slate-800 capitalize mt-0.5">
                            {existingSubmission.registrationType}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            Submitted
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5">
                            {new Date(
                              existingSubmission.submittedAt
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Deliverables Section if open or submitted */}
                  {(selectedForm?.finalSubmissionOpen || existingSubmission.finalSubmissionCompleted || existingSubmission.finalSubmission) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          Final Project Deliverables
                        </h3>
                        {existingSubmission.finalSubmissionCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Submitted
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Phase Open
                          </span>
                        )}
                      </div>

                      <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3 text-xs">
                        {existingSubmission.finalSubmission ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {existingSubmission.finalSubmission.repoUrl && (
                                <a
                                  href={existingSubmission.finalSubmission.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 bg-white border border-emerald-200 rounded-lg hover:border-emerald-400 text-slate-800 flex items-center justify-between group transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FolderGit2 className="w-4 h-4 text-slate-700 shrink-0" />
                                    <div className="min-w-0">
                                      <span className="text-[10px] text-slate-400 block font-semibold">Git Repository</span>
                                      <span className="text-xs font-mono font-bold truncate block group-hover:text-[#0D3481]">
                                        {existingSubmission.finalSubmission.repoUrl.replace(/^https?:\/\//, "")}
                                      </span>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0D3481] shrink-0" />
                                </a>
                              )}

                              {existingSubmission.finalSubmission.demoUrl && (
                                <a
                                  href={existingSubmission.finalSubmission.demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 bg-white border border-emerald-200 rounded-lg hover:border-emerald-400 text-slate-800 flex items-center justify-between group transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                                    <div className="min-w-0">
                                      <span className="text-[10px] text-slate-400 block font-semibold">Prototype / Live Demo</span>
                                      <span className="text-xs font-mono font-bold truncate block group-hover:text-[#0D3481]">
                                        {existingSubmission.finalSubmission.demoUrl.replace(/^https?:\/\//, "")}
                                      </span>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0D3481] shrink-0" />
                                </a>
                              )}

                              {existingSubmission.finalSubmission.reportFileName && (
                                <div className="p-3 bg-white border border-emerald-200 rounded-lg text-slate-800 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-slate-400 block font-semibold">Report Dossier</span>
                                    <span className="text-xs font-bold truncate block">
                                      {existingSubmission.finalSubmission.reportFileName}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {existingSubmission.finalSubmission.slidesFileName && (
                                <div className="p-3 bg-white border border-emerald-200 rounded-lg text-slate-800 flex items-center gap-2">
                                  <Presentation className="w-4 h-4 text-amber-500 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-slate-400 block font-semibold">Presentation Slides</span>
                                    <span className="text-xs font-bold truncate block">
                                      {existingSubmission.finalSubmission.slidesFileName}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {existingSubmission.finalSubmission.remarks && (
                              <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-100">
                                <strong className="text-slate-800">Your Remarks:</strong> {existingSubmission.finalSubmission.remarks}
                              </p>
                            )}

                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenFinalDeliverablesModal(selectedForm || forms[0], existingSubmission)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Update Submitted Deliverables</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {selectedForm?.finalSubmissionConfig?.instructions ||
                                "Final submission phase has been opened by your coordinator. You can now submit your report dossier, Git repository link, and presentation slides."}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenFinalDeliverablesModal(selectedForm || forms[0], existingSubmission)}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              <span>Submit Final Deliverables Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Team Details (if group) */}
                  {existingSubmission.registrationType === "group" &&
                    existingSubmission.teamMembers.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Team Members (
                          {existingSubmission.teamMembers.length + 1} total)
                        </h3>

                        <div className="space-y-2">
                          {/* Team Lead */}
                          <div className="p-3 bg-[#0D3481]/5 border border-[#0D3481]/15 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0D3481] text-white flex items-center justify-center text-xs font-bold">
                              {existingSubmission.student.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900">
                                {existingSubmission.student.name}
                                <span className="ml-2 text-[10px] font-semibold text-[#0D3481] bg-[#0D3481]/10 px-1.5 py-0.5 rounded-md">
                                  Team Lead
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                AFN: {existingSubmission.student.afn}
                              </div>
                            </div>
                          </div>

                          {/* Members */}
                          {existingSubmission.teamMembers.map((mem, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                                {mem.name?.charAt(0) || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900">
                                  {mem.name || "—"}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  AFN: {mem.afn}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {(() => {
                    const currentApproval = getSubmissionApprovalStatus(
                      existingSubmission,
                      selectedForm?.id,
                      student?.afn
                    );
                    const isApproved = currentApproval === "approved";
                    const isNotApproved = currentApproval === "not_approved";

                    return (
                      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Approved & verified by the project coordinator</span>
                          </>
                        ) : isNotApproved ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-red-700 font-semibold">Not approved by the project coordinator</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-slate-500">Pending review by the concerned project coordinator</span>
                          </>
                        )}
                      </p>
                    );
                  })()}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep("forms")}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Forms</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-white text-slate-600 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Footer (Hidden when form is opened) ─── */}
      {step !== "register" && (
        <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/60 shrink-0">
          projects.kit · Kanpur Institute of Technology · Academic Project
          Lifecycle Suite
        </footer>
      )}

      {/* ─── Final Deliverables Submission Modal ─── */}
      {isFinalModalOpen && finalTargetForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFinalModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#10334A]">
                      Submit Final Deliverables
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-[#0D3481] border border-slate-200">
                      {finalTargetForm.subjectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {finalTargetForm.title} · Final Deadline: <strong className="text-red-700 font-mono">{formatDate(finalTargetForm.finalSubmissionDeadline || "2026-11-15")}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFinalModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitFinalDeliverables} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Instructions banner */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[#0D3481] tracking-wider block">
                  Coordinator Instructions
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {finalTargetForm.finalSubmissionConfig?.instructions ||
                    "Please upload your complete project report (PDF), presentation slides, and provide the link to your Git repository with clear README documentation."}
                </p>
              </div>

              {/* 1. Git Source Repository URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-700" />
                    <span>Git Source Repository URL</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Required
                  </span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/username/project-repo"
                  value={finalRepoUrl}
                  onChange={(e) => setFinalRepoUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                />
                <span className="text-[10px] text-slate-400 block">
                  Provide public repository URL with clear README and setup documentation.
                </span>
              </div>

              {/* 2. Project Dossier / Report PDF */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    <span>Project Report Dossier (PDF)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Required
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. BCS751_Final_Project_Report.pdf"
                    value={finalReportFileName}
                    onChange={(e) => setFinalReportFileName(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                  />
                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFinalReportFileName(file.name);
                      }}
                    />
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Max file size: {finalTargetForm.finalSubmissionConfig?.maxFileSizeMb || 25} MB (IEEE standard format)
                </span>
              </div>

              {/* 3. Presentation Slides (PPT/PDF) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Presentation className="w-3.5 h-3.5 text-amber-500" />
                    <span>Presentation Slides (PPT / PDF)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. BCS751_Evaluation_Deck.pptx"
                    value={finalSlidesFileName}
                    onChange={(e) => setFinalSlidesFileName(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                  />
                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFinalSlidesFileName(file.name);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* 4. Prototype / Live Demo URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Prototype / Hosted Live Demo URL</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                </label>
                <input
                  type="url"
                  placeholder="https://my-project-demo.vercel.app or Google Drive video link"
                  value={finalDemoUrl}
                  onChange={(e) => setFinalDemoUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
                />
              </div>

              {/* 5. Notes / Remarks */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Remarks / Special Instructions for Evaluators
                </label>
                <textarea
                  rows={2}
                  value={finalRemarks}
                  onChange={(e) => setFinalRemarks(e.target.value)}
                  placeholder="Any test credentials, build instructions, or additional notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFinalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFinal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingFinal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Deliverables...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Final Deliverables</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Success Notification Toast ─── */}
      {finalSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#10334A] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{finalSuccessToast}</span>
            <button
              onClick={() => setFinalSuccessToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Request to Add Record Modal ─── */}
      <RequestRecordModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialAfn={afn}
        onRequestSubmitted={handleRecordRequestSubmitted}
      />
    </div>
    </>
  );
}

export default PublicLandingPage;
