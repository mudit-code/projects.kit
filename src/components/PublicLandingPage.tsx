"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { getActiveSession, UserSession } from "@/lib/auth";
import { LOGOS } from "@/lib/logos";
import { StreamBadge } from "@/components/StreamBadge";
import { isStudentEligibleForForm } from "@/lib/formTargeting";
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
};

/* ─── Constants ─── */
const STORAGE_KEY = "kit_public_submissions";
const LONG_PRESS_MS = 1200; // 1.2s long-press to trigger admin access on mobile

/* ─── Helpers ─── */
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

/* ═══════════════════════════════════════════════════
   PUBLIC LANDING PAGE
   ═══════════════════════════════════════════════════ */
export function PublicLandingPage({ onAdminAccess }: PublicLandingPageProps) {
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

  // Registration form state
  const [registrationType, setRegistrationType] = useState<"individual" | "group">("individual");
  const [whatsapp, setWhatsapp] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState<Record<number, boolean>>({});

  // Secret access: long-press timer ref
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync active session and mark mounted on client to eliminate hydration diffs
  useEffect(() => {
    setIsMounted(true);
    setActiveSession(getActiveSession());

    const syncSession = () => setActiveSession(getActiveSession());
    window.addEventListener("kit-auth-change", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("kit-auth-change", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  // Focus AFN input on mount
  useEffect(() => {
    if (step === "landing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  /* ─── Secret Access: Ctrl+Shift+H (desktop) ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h")) {
        e.preventDefault();
        onAdminAccess?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAdminAccess]);

  /* ─── Secret Access: Long-press logo (mobile) ─── */
  const handleLogoTouchStart = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.navigator && "vibrate" in window.navigator) {
          window.navigator.vibrate(50);
        }
      } catch {
        // ignore
      }
      onAdminAccess?.();
    }, LONG_PRESS_MS);
  }, [onAdminAccess]);

  const handleLogoTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
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

  // Lock body scroll when registration form is open so only the form content scrolls
  useEffect(() => {
    if (step === "register") {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [step]);

  /* ─── Fetch Student ─── */
  const handleAfnSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = afn.trim();
      if (!trimmed) {
        setError("Please enter your AFN.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/students/${trimmed}`);
        if (!res.ok) {
          setError("No student found with this AFN. Please check and try again.");
          setLoading(false);
          return;
        }

        const data: StudentRecord = await res.json();
        setStudent(data);

        // Check if already submitted
        const existing = findSubmissionByAfn(trimmed);
        if (existing) {
          setExistingSubmission(existing);
          setStep("status");
          setLoading(false);
          return;
        }

        // Load published initiatives from localStorage (the single source of truth shared with dashboard)
        let publishedInitiatives: any[] = [];
        try {
          const stored = localStorage.getItem("kit_published_initiatives");
          if (stored) {
            publishedInitiatives = JSON.parse(stored);
          }
        } catch {
          publishedInitiatives = [];
        }

        let allForms: AvailableForm[] = [];

        publishedInitiatives.forEach((init: any) => {
          if (isStudentEligibleForForm(data, init)) {
            allForms.push({
              id: init.id,
              title: init.customProjectName
                ? `${init.customProjectName} Registration Form`
                : `${init.projectType || "Project"} Registration Form`,
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
              status: "Open",
            });
          }
        });

        // Filter out forms student has already submitted to
        const submissions = loadSubmissions();
        allForms = allForms.filter(
          (f) => !submissions[f.id]?.some((s) => s.student.afn === trimmed)
        );

        setForms(allForms);
        setStep("forms");
      } catch {
        setError("Something went wrong. Please try again.");
      }

      setLoading(false);
    },
    [afn]
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
    setTeamLoading((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch(`/api/students/${memberAfn.trim()}`);
      if (res.ok) {
        const data: StudentRecord = await res.json();
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

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div className={`bg-[#F6F5F2] flex flex-col ${step === "register" ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      {/* ─── Header ─── */}
      <header className="relative w-full px-5 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        {/* Leftmost: Institution Logo */}
        <div className="flex items-center">
          <button
            onClick={handleReset}
            onTouchStart={handleLogoTouchStart}
            onTouchEnd={handleLogoTouchEnd}
            onTouchCancel={handleLogoTouchEnd}
            onMouseDown={handleLogoTouchStart}
            onMouseUp={handleLogoTouchEnd}
            onMouseLeave={handleLogoTouchEnd}
            className="flex items-center group cursor-pointer select-none"
            aria-label="Kanpur Institute of Technology"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGOS.kit}
              alt="KIT Logo"
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

      {/* ─── Main Content ─── */}
      <main className={`flex-1 flex items-center justify-center px-4 ${step === "register" ? "py-2 sm:py-3 overflow-hidden min-h-0" : "py-8 sm:py-12"}`}>
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: Landing — AFN Entry ═══ */}
          {step === "landing" && (
            <motion.div
              key="landing"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="max-w-lg w-full"
            >
              <div className="text-center mb-8">
                {/* KIT Logo instead of badge */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="flex justify-center mb-5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={LOGOS.kit}
                    alt="Kanpur Institute of Technology"
                    className="h-14 sm:h-16 w-auto object-contain cursor-pointer select-none active:scale-95 transition-transform"
                    draggable={false}
                    onTouchStart={handleLogoTouchStart}
                    onTouchEnd={handleLogoTouchEnd}
                    onTouchCancel={handleLogoTouchEnd}
                    onMouseDown={handleLogoTouchStart}
                    onMouseUp={handleLogoTouchEnd}
                    onMouseLeave={handleLogoTouchEnd}
                  />
                </motion.div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10334A] tracking-tight leading-tight">
                  Welcome to{" "}
                  <span className="text-[#0D3481]">projects.kit</span>
                </h1>
                <p className="text-sm text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                  Enter your AFN to check available project registrations and
                  submit your project details.
                </p>
              </div>

              {/* AFN Input Card */}
              <form
                onSubmit={handleAfnSubmit}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90"
              >
                <label className="block text-xs font-bold text-[#10334A] mb-2">
                  Academic File Number (AFN)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={afn}
                    onChange={(e) => {
                      setAfn(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. 232451"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-slate-50/50 transition-all text-slate-800 placeholder:text-slate-400"
                    maxLength={10}
                    autoComplete="off"
                  />
                </div>

                {error && (
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
                  disabled={loading}
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

                    return (
                      <motion.div
                        key={form.id}
                        variants={fadeUp}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#0D3481]/10 text-[#0D3481]">
                            {form.subjectCode}
                          </span>
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            {form.category}
                          </span>
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
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0D3481]" />
                            <span>
                              By: <strong>{form.dispatchedBy}</strong>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectForm(form)}
                          className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Register My Project Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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
                      Pending Verification
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0A2761] text-white shadow-md transition-all cursor-pointer"
                >
                  Done
                </button>
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
                  {/* Verification Status */}
                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${
                      existingSubmission.verificationStatus === "verified"
                        ? "bg-emerald-50 border-emerald-200"
                        : existingSubmission.verificationStatus === "rejected"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    {existingSubmission.verificationStatus === "verified" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : existingSubmission.verificationStatus === "rejected" ? (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          existingSubmission.verificationStatus === "verified"
                            ? "text-emerald-800"
                            : existingSubmission.verificationStatus ===
                              "rejected"
                            ? "text-red-800"
                            : "text-amber-800"
                        }`}
                      >
                        Verification Status:{" "}
                        <span className="capitalize">
                          {existingSubmission.verificationStatus}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          existingSubmission.verificationStatus === "verified"
                            ? "text-emerald-700"
                            : existingSubmission.verificationStatus ===
                              "rejected"
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}
                      >
                        {existingSubmission.verificationStatus === "verified"
                          ? "Your project has been verified by the coordinator."
                          : existingSubmission.verificationStatus === "rejected"
                          ? "Your submission was rejected. Please contact your coordinator."
                          : "Your submission is pending review by the project coordinator."}
                      </p>
                    </div>
                  </div>

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
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">
                    Verified by the concerned project coordinator
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-white text-slate-600 transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
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
    </div>
  );
}

export default PublicLandingPage;
