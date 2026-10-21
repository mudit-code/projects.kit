"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { LOGOS } from "@/lib/logos";
import {
  FileText,
  FolderGit2,
  User,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Globe,
  LogOut,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { MobileShell } from "../MobileShell";
import {
  MobileTabItem,
  ListRow,
  StatusChip,
  SearchField,
  FilterPillBar,
  BottomSheet,
  SkeletonList,
  PullToRefresh,
} from "../patterns";
import { StudentFormFocusFlow } from "./StudentFormFocusFlow";
import { getSubmissionApprovalStatus } from "@/components/PublicLandingPage";

export interface StudentMobileAppProps {
  onAdminAccess?: () => void;
  heroLogoRef?: React.RefObject<HTMLDivElement | null>;
}

export function StudentMobileApp({ onAdminAccess, heroLogoRef }: StudentMobileAppProps = {}) {
  const router = useRouter();

  // Secret Admin Access via Long Press (Tap & Hold on Logo for 850ms)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const didTriggerLongPress = useRef(false);
  const [isHoldingLogo, setIsHoldingLogo] = useState(false);

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

  const handleLogoPointerDown = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
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
      }, 850);
    },
    [triggerHiddenLogin]
  );

  const handleLogoTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || e.touches.length === 0) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    // If finger moves more than 10px, cancel long-press to allow scrolling
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

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const [verifiedStudent, setVerifiedStudent] = useState<any | null>(null);
  const [afnInput, setAfnInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("forms");
  const [selectedFormForFocus, setSelectedFormForFocus] = useState<any | null>(null);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<any | null>(null);

  // Data State
  const [forms, setForms] = useState<any[]>([]);
  const [submissionsDict, setSubmissionsDict] = useState<Record<string, any[]>>({});
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPill, setSelectedPill] = useState("all");

  // Stage 2 Deliverables in bottom sheet
  const [stage2RepoUrl, setStage2RepoUrl] = useState("");
  const [stage2DemoUrl, setStage2DemoUrl] = useState("");
  const [stage2Saved, setStage2Saved] = useState(false);

  // Check stored verified student on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kit_student_afn_verified");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.afn) {
          setVerifiedStudent(parsed);
        }
      }
    } catch {}
  }, []);

  // Fetch Forms and Submissions
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      // 1. Fetch Forms
      const formsRes = await fetch("/api/forms");
      if (formsRes.ok) {
        const data = await formsRes.json();
        if (data.success && Array.isArray(data.forms)) {
          setForms(data.forms);
        }
      }

      // 2. Fetch Submissions from localStorage
      try {
        const storedSubs = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
        setSubmissionsDict(storedSubs);
      } catch {}
    } catch {
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (verifiedStudent) {
      loadData();
    }
  }, [verifiedStudent, loadData]);

  // Handle AFN Verification (direct, NO OTP as requested)
  const handleVerifyAfn = async (targetAfn?: string) => {
    const afnToTest = (targetAfn || afnInput).trim();
    if (!/^\d{6}$/.test(afnToTest)) {
      setVerifyError("Please enter a valid 6-digit Academic File Number.");
      return;
    }

    setVerifying(true);
    setVerifyError("");

    try {
      let studentRecord: any = null;
      const res = await fetch(`/api/students/${encodeURIComponent(afnToTest)}`);
      if (res.ok) {
        studentRecord = await res.json();
      }

      // Fallback to custom requested students
      if (!studentRecord) {
        try {
          const customList: any[] = JSON.parse(localStorage.getItem("kit_custom_students") || "[]");
          studentRecord = customList.find((s) => s.afn === afnToTest) || null;
        } catch {}
      }

      if (!studentRecord) {
        setVerifyError("No student record found for this AFN. Please check your number.");
        setVerifying(false);
        return;
      }

      // Verified!
      setVerifiedStudent(studentRecord);
      try {
        localStorage.setItem("kit_student_afn_verified", JSON.stringify(studentRecord));
      } catch {}
    } catch {
      setVerifyError("Verification failed. Please check your connection and retry.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOutStudent = () => {
    setVerifiedStudent(null);
    setAfnInput("");
    try {
      localStorage.removeItem("kit_student_afn_verified");
    } catch {}
  };

  // Find user's submission for a form
  const getStudentSubmissionForForm = useCallback(
    (formId: string) => {
      if (!verifiedStudent) return null;
      const formSubs = submissionsDict[formId] || [];
      const userAfn = verifiedStudent.afn.toUpperCase();

      for (const sub of formSubs) {
        const sAfn = (sub.student?.afn || sub.studentAfn || "").toUpperCase();
        if (sAfn === userAfn) return sub;

        // Check team members
        const members = sub.teamMembers || [];
        for (const m of members) {
          if ((m.afn || "").toUpperCase() === userAfn) return sub;
        }
      }
      return null;
    },
    [verifiedStudent, submissionsDict]
  );

  // Compute all user submissions across all forms
  const userProjects = useMemo(() => {
    if (!verifiedStudent) return [];
    const list: any[] = [];
    Object.keys(submissionsDict).forEach((formId) => {
      const sub = getStudentSubmissionForForm(formId);
      if (sub) {
        const effectiveStatus = getSubmissionApprovalStatus(sub, formId, verifiedStudent.afn);
        list.push({
          ...sub,
          formId,
          effectiveStatus,
        });
      }
    });
    return list;
  }, [verifiedStudent, submissionsDict, getStudentSubmissionForForm]);

  // Compute pending count for badge
  const pendingRegistrationsCount = useMemo(() => {
    if (!verifiedStudent) return 0;
    return forms.filter((f) => !getStudentSubmissionForForm(f.id)).length;
  }, [forms, verifiedStudent, getStudentSubmissionForForm]);

  // Filtered forms list
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const matchesSearch =
        !searchQuery.trim() ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.subjectCode.toLowerCase().includes(searchQuery.toLowerCase());

      const sub = getStudentSubmissionForForm(f.id);
      if (selectedPill === "pending") return matchesSearch && !sub;
      if (selectedPill === "registered") return matchesSearch && Boolean(sub);
      return matchesSearch;
    });
  }, [forms, searchQuery, selectedPill, getStudentSubmissionForForm]);

  // Save Stage 2 Deliverables
  const handleSaveStage2 = () => {
    if (!selectedProjectForDetails) return;

    try {
      const stored = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
      const formId = selectedProjectForDetails.formId;
      const list = stored[formId] || [];

      const updatedList = list.map((sub: any) => {
        if (sub.student?.afn === verifiedStudent.afn) {
          return {
            ...sub,
            finalSubmission: {
              repoUrl: stage2RepoUrl,
              demoUrl: stage2DemoUrl,
              submittedAt: new Date().toISOString(),
            },
            finalSubmissionCompleted: Boolean(stage2RepoUrl || stage2DemoUrl),
          };
        }
        return sub;
      });

      stored[formId] = updatedList;
      localStorage.setItem("kit_public_submissions", JSON.stringify(stored));
      setSubmissionsDict(stored);
      setStage2Saved(true);
      setTimeout(() => setStage2Saved(false), 2000);
    } catch {}
  };

  // 1. FOCUS FLOW: FORM REGISTRATION (Bottom Tab Bar hidden)
  if (selectedFormForFocus && verifiedStudent) {
    return (
      <StudentFormFocusFlow
        form={selectedFormForFocus}
        student={verifiedStudent}
        onBack={() => setSelectedFormForFocus(null)}
        onSubmitSuccess={(newSub) => {
          setSelectedFormForFocus(null);
          loadData();
          setActiveTab("projects");
        }}
      />
    );
  }

  // 2. UNVERIFIED: AFN ENTRY (Direct, NO OTP)
  if (!verifiedStudent) {
    return (
      <div className="mobile-shell-root flex flex-col justify-between min-h-[100dvh] bg-[#F6F5F2] dark:bg-slate-950 p-5 safe-top safe-bottom">
        {/* Top Minimal Bar with Institutional Logo (Tap & hold to enter staff gate) */}
        <div className="w-full flex items-center justify-between pt-2 px-1">
          <button
            type="button"
            onTouchStart={handleLogoPointerDown}
            onTouchMove={handleLogoTouchMove}
            onTouchEnd={handleLogoPointerUp}
            onTouchCancel={handleLogoPointerUp}
            onMouseDown={handleLogoPointerDown}
            onMouseUp={handleLogoPointerUp}
            onMouseLeave={handleLogoPointerUp}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
            className={`p-1 rounded-xl transition-all duration-200 cursor-pointer ${
              isHoldingLogo ? "scale-95 ring-4 ring-[#0B2A6F]/30 bg-blue-50/80 rounded-xl" : "active:scale-95"
            }`}
            aria-label="Kanpur Institute of Technology"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGOS.kit}
              alt="Kanpur Institute of Technology"
              className="h-7 w-auto max-w-[125px] object-contain pointer-events-none"
              draggable={false}
            />
          </button>

          <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Student Portal
          </span>
        </div>

        {/* Hero Branding with Official projects.kit Geometric Logo (Tap & hold supported) */}
        <div className="pt-2 sm:pt-4 text-center flex flex-col items-center">
          <div
            ref={heroLogoRef}
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
            aria-label="projects.kit logo (Tap and hold for staff panel)"
            className={`inline-flex items-center justify-center p-1 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
              isHoldingLogo
                ? "scale-90 ring-4 ring-[#0B2A6F]/30 bg-blue-50/70 dark:bg-blue-950/40 shadow-lg animate-pulse"
                : "active:scale-95 hover:scale-105"
            }`}
          >
            {/* Official projects.kit SVG logo — exact brand asset */}
            <svg
              viewBox="0 0 1930 1930"
              role="img"
              aria-label="projects.kit logo"
              className="h-14 sm:h-16 w-auto object-contain pointer-events-none"
              style={{ WebkitTouchCallout: "none", userSelect: "none" }}
            >
              <defs>
                <mask id="cut-mobile-student" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
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
                mask="url(#cut-mobile-student)"
              />
            </svg>
          </div>

          <div className="-mt-1">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              projects<span className="text-[#0B2A6F] dark:text-blue-400">.kit</span>
            </h1>
          </div>
        </div>

        {/* Verification Card */}
        <div className="w-full max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 border border-neutral-200/90 dark:border-slate-800 shadow-xl space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Academic File Number (AFN)
            </label>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
              Enter your 6-digit institutional number to access your project registration forms.
            </p>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={afnInput}
              onChange={(e) => {
                setAfnInput(e.target.value.replace(/\D/g, ""));
                setVerifyError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifyAfn();
              }}
              placeholder="e.g. 232451"
              className="w-full h-12 px-4 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-[18px] font-mono tracking-widest text-slate-900 dark:text-white text-center focus:outline-hidden focus:ring-2 focus:ring-[#0B2A6F]/20 focus:border-[#0B2A6F]"
              style={{ fontSize: "18px" }}
            />
          </div>

          {verifyError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleVerifyAfn()}
            disabled={verifying || afnInput.trim().length !== 6}
            className="w-full min-h-[46px] rounded-xl bg-[#0B2A6F] text-white text-sm font-bold shadow-md hover:bg-[#092257] active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {verifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-slate-400 text-center pb-2">
          Kanpur Institute of Technology
        </p>
      </div>
    );
  }

  // 3. VERIFIED: STUDENT MOBILE SHELL (3 Tabs: Forms | Projects | Account)
  const studentTabs: MobileTabItem[] = [
    {
      id: "forms",
      label: "Forms",
      icon: FileText,
      badge: pendingRegistrationsCount > 0 ? pendingRegistrationsCount : undefined,
      badgeColor: "blue",
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderGit2,
      badge: userProjects.length > 0 ? userProjects.length : undefined,
      badgeColor: "blue",
    },
    {
      id: "account",
      label: "Account",
      icon: User,
    },
  ];

  return (
    <MobileShell
      title={
        activeTab === "forms"
          ? "Available Forms"
          : activeTab === "projects"
          ? "My Projects"
          : "Student Account"
      }
      subtitle={
        activeTab === "forms"
          ? `${verifiedStudent.name} (${verifiedStudent.section})`
          : undefined
      }
      largeTitle={activeTab !== "account"}
      tabs={studentTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <PullToRefresh onRefresh={loadData}>
        {/* ═══ TAB 1: FORMS ═══ */}
        {activeTab === "forms" && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search initiatives (e.g. BCS751)..."
            />

            {/* Filter Pills */}
            <FilterPillBar
              pills={[
                { id: "all", label: "All Forms", count: forms.length },
                { id: "pending", label: "Need Registration", count: pendingRegistrationsCount },
                { id: "registered", label: "Registered", count: forms.length - pendingRegistrationsCount },
              ]}
              activePill={selectedPill}
              onSelectPill={setSelectedPill}
            />

            {/* Forms List Rows */}
            {loadingData ? (
              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <SkeletonList count={3} />
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No forms found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  No active initiatives matching your search criteria.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                {filteredForms.map((form) => {
                  const existingSub = getStudentSubmissionForForm(form.id);
                  const isSubmitted = Boolean(existingSub);
                  const status = isSubmitted
                    ? existingSub.approvalStatus === "approved"
                      ? "verified"
                      : existingSub.approvalStatus === "not_approved"
                      ? "rejected"
                      : "pending"
                    : "draft";

                  return (
                    <ListRow
                      key={form.id}
                      title={form.subjectCode}
                      subtitle={form.title}
                      status={isSubmitted ? status : undefined}
                      trailingMeta={isSubmitted ? "Registered" : "Open"}
                      onClick={() => {
                        if (isSubmitted) {
                          setSelectedProjectForDetails({
                            ...existingSub,
                            formId: form.id,
                            formTitle: form.title,
                            subjectCode: form.subjectCode,
                          });
                        } else {
                          setSelectedFormForFocus(form);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: PROJECTS ═══ */}
        {activeTab === "projects" && (
          <div className="p-4 space-y-4">
            {userProjects.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 space-y-3">
                <FolderGit2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Registered Projects Yet
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select an open initiative from the Forms tab to register your project topic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("forms")}
                  className="px-4 py-2 bg-[#0B2A6F] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  View Available Forms
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedProjectForDetails(proj);
                      setStage2RepoUrl(proj.finalSubmission?.repoUrl || "");
                      setStage2DemoUrl(proj.finalSubmission?.demoUrl || "");
                    }}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-2.5 active:scale-99 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-[#0B2A6F] dark:text-blue-400">
                        {proj.subjectCode || "Project"}
                      </span>
                      <StatusChip
                        status={
                          proj.effectiveStatus === "approved"
                            ? "verified"
                            : proj.effectiveStatus === "not_approved"
                            ? "rejected"
                            : "pending"
                        }
                        size="sm"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {proj.projectName || "Registered Project"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {proj.projectDescription}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Submitted: {new Date(proj.submittedAt).toLocaleDateString()}</span>
                      <span className="font-semibold text-[#0B2A6F] dark:text-blue-400">
                        Tap for Details &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 3: ACCOUNT ═══ */}
        {activeTab === "account" && (
          <div className="p-4 space-y-4">
            {/* Student Profile Card */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0B2A6F] dark:text-blue-400 flex items-center justify-center font-bold text-xl shrink-0">
                  {verifiedStudent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {verifiedStudent.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {verifiedStudent.rollNumber} • {verifiedStudent.afn}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Course & Branch</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {verifiedStudent.course} ({verifiedStudent.branch || verifiedStudent.stream})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Section / Year</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Section {verifiedStudent.section} • Year {verifiedStudent.year}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">Institutional Email</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {verifiedStudent.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Switch Student Action */}
            <button
              type="button"
              onClick={handleSignOutStudent}
              className="w-full min-h-[46px] rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-800 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Switch Student (Change AFN)</span>
            </button>

            {/* Institutional Brand footer with Tap and Hold */}
            <div className="pt-4 text-center space-y-2">
              <button
                type="button"
                onTouchStart={handleLogoPointerDown}
                onTouchMove={handleLogoTouchMove}
                onTouchEnd={handleLogoPointerUp}
                onTouchCancel={handleLogoPointerUp}
                onMouseDown={handleLogoPointerDown}
                onMouseUp={handleLogoPointerUp}
                onMouseLeave={handleLogoPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                className={`inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  isHoldingLogo ? "scale-95 ring-4 ring-[#0B2A6F]/30 bg-blue-50 dark:bg-blue-950/40" : "active:scale-95"
                }`}
                aria-label="KIT Logo (Tap and hold for staff access)"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGOS.kit}
                  alt="Kanpur Institute of Technology"
                  className="h-6 w-auto object-contain pointer-events-none"
                  draggable={false}
                />
              </button>
              <p className="text-[11px] text-slate-400">
                Kanpur Institute of Technology
              </p>
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* 4. Project Details & Stage 2 Deliverables Bottom Sheet */}
      <BottomSheet
        open={Boolean(selectedProjectForDetails)}
        onOpenChange={(open) => !open && setSelectedProjectForDetails(null)}
        title={selectedProjectForDetails?.projectName || "Project Details"}
        description={selectedProjectForDetails?.subjectCode}
      >
        {selectedProjectForDetails && (
          <div className="space-y-4 py-1 text-left text-xs">
            {/* Status summary */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-500">Evaluation Status</span>
              <StatusChip
                status={
                  selectedProjectForDetails.effectiveStatus === "approved"
                    ? "verified"
                    : selectedProjectForDetails.effectiveStatus === "not_approved"
                    ? "rejected"
                    : "pending"
                }
                size="sm"
              />
            </div>

            {/* Description */}
            <div className="p-3.5 bg-neutral-50 dark:bg-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Abstract</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedProjectForDetails.projectDescription}
              </p>
            </div>

            {/* Stage 2 Deliverables Section */}
            <div className="p-4 border border-blue-200/80 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B2A6F] dark:text-blue-300">
                <FolderGit2 className="w-4 h-4" />
                <span>Stage 2 Deliverables</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={stage2RepoUrl}
                    onChange={(e) => setStage2RepoUrl(e.target.value)}
                    placeholder="https://github.com/org/project"
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Live Demo / Video URL
                  </label>
                  <input
                    type="url"
                    value={stage2DemoUrl}
                    onChange={(e) => setStage2DemoUrl(e.target.value)}
                    placeholder="https://demo.project.kit or YouTube link"
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveStage2}
                className="w-full min-h-[40px] rounded-xl bg-[#0B2A6F] text-white text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {stage2Saved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved Deliverables</span>
                  </>
                ) : (
                  <span>Save Stage 2 Links</span>
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </MobileShell>
  );
}
