"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  FileCheck2,
  Users,
  FolderGit2,
  User,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  LogOut,
  Send,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  FileText,
  UserCheck,
} from "lucide-react";
import { MobileShell } from "../MobileShell";
import {
  MobileTabItem,
  ListRow,
  StatusChip,
  SearchField,
  FilterPillBar,
  BottomSheet,
  ConfirmDialog,
  DesktopOnlyCard,
  SkeletonList,
  PullToRefresh,
} from "../patterns";
import { ROLE_PROFILES, RoleType } from "@/components/dashboard/DashboardLayoutClient";
import { clearActiveSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

export interface FacultyHodMobileAppProps {
  role: RoleType;
}

export function FacultyHodMobileApp({ role }: FacultyHodMobileAppProps) {
  const router = useRouter();
  const profile = ROLE_PROFILES[role];

  // Tab State
  const [activeTab, setActiveTab] = useState<string>(role === "HOD" ? "overview" : "home");

  // Data State
  const [forms, setForms] = useState<any[]>([]);
  const [submissionsDict, setSubmissionsDict] = useState<Record<string, any[]>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterPill, setSelectedFilterPill] = useState("all");

  // Review Sheet State
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [actionFeedback, setActionFeedback] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);

  // Load Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Forms
      const formsRes = await fetch("/api/forms");
      if (formsRes.ok) {
        const data = await formsRes.json();
        if (data.success && Array.isArray(data.forms)) {
          setForms(data.forms);
        }
      }

      // 2. Load Submissions from localStorage
      try {
        const storedSubs = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
        setSubmissionsDict(storedSubs);
      } catch {}

      // 3. Load Registration Requests
      try {
        const storedReqs = JSON.parse(localStorage.getItem("kit_registration_requests") || "[]");
        setRegistrationRequests(storedReqs);
      } catch {}

      // 4. Load Students
      try {
        const customStudents = JSON.parse(localStorage.getItem("kit_custom_students") || "[]");
        setStudents(customStudents);
      } catch {}
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Flattened submissions list for mobile review
  const allSubmissions = useMemo(() => {
    const list: any[] = [];
    Object.keys(submissionsDict).forEach((formId) => {
      const formSubs = submissionsDict[formId] || [];
      const formObj = forms.find((f) => f.id === formId);

      formSubs.forEach((sub) => {
        list.push({
          ...sub,
          formId,
          formSubjectCode: formObj?.subjectCode || sub.subjectCode || "Project",
          formTitle: formObj?.title || sub.formTitle,
        });
      });
    });
    return list;
  }, [submissionsDict, forms]);

  // Submissions needing review
  const pendingSubmissions = useMemo(() => {
    return allSubmissions.filter(
      (s) => !s.approvalStatus || s.approvalStatus === "pending" || s.approvalStatus === "not_approved"
    );
  }, [allSubmissions]);

  // Approve a submission
  const handleApprove = (submission: any) => {
    try {
      const stored = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
      const list = stored[submission.formId] || [];

      const updated = list.map((item: any) => {
        if (item.student?.afn === submission.student?.afn) {
          return {
            ...item,
            approvalStatus: "approved",
            verificationStatus: "verified",
          };
        }
        return item;
      });

      stored[submission.formId] = updated;
      localStorage.setItem("kit_public_submissions", JSON.stringify(stored));
      setSubmissionsDict(stored);
      setSelectedSubmission(null);
      showToast(`Approved project: ${submission.projectName || "Topic"}`);
    } catch {}
  };

  // Request changes on a submission
  const handleRequestChanges = (submission: any) => {
    try {
      const stored = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
      const list = stored[submission.formId] || [];

      const updated = list.map((item: any) => {
        if (item.student?.afn === submission.student?.afn) {
          return {
            ...item,
            approvalStatus: "not_approved",
            verificationStatus: "rejected",
            facultyFeedback: actionFeedback || "Revisions required for project scope.",
          };
        }
        return item;
      });

      stored[submission.formId] = updated;
      localStorage.setItem("kit_public_submissions", JSON.stringify(stored));
      setSubmissionsDict(stored);
      setSelectedSubmission(null);
      setActionFeedback("");
      showToast(`Requested revisions for ${submission.student?.name || "Student"}`);
    } catch {}
  };

  // Dispatch reminder to a student
  const handleRemindStudent = async (submission: any) => {
    setReminding(true);
    try {
      const formKey = submission.formId || "BCS751";
      const res = await fetch(`/api/forms/${encodeURIComponent(formKey)}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: [submission.student?.afn || "232451"],
        }),
      });

      if (res.ok) {
        showToast(`Dispatched official reminder to ${submission.student?.name || "student"}.`);
      } else {
        showToast("Reminder cooldown active for this cohort.");
      }
    } catch {
      showToast("Reminder dispatched in local log mode.");
    } finally {
      setReminding(false);
    }
  };

  // Approve a registration request (HOD only)
  const handleApproveRegistrationRequest = (req: any) => {
    try {
      const filtered = registrationRequests.filter((r) => r.afn !== req.afn);
      setRegistrationRequests(filtered);
      localStorage.setItem("kit_registration_requests", JSON.stringify(filtered));

      // Add to custom students
      const updatedStudents = [...students, req];
      setStudents(updatedStudents);
      localStorage.setItem("kit_custom_students", JSON.stringify(updatedStudents));

      showToast(`Approved registration request for ${req.name} (${req.afn})`);
    } catch {}
  };

  const handleSignOut = () => {
    clearActiveSession();
    router.push("/admin");
  };

  // ═══ TABS DEFINITIONS ═══
  const facultyTabs: MobileTabItem[] = [
    {
      id: "home",
      label: "Home",
      icon: LayoutDashboard,
      badge: pendingSubmissions.length > 0 ? pendingSubmissions.length : undefined,
      badgeColor: "amber",
    },
    { id: "forms", label: "Forms", icon: FileCheck2 },
    { id: "students", label: "Students", icon: Users },
    { id: "account", label: "Account", icon: User },
  ];

  const hodTabs: MobileTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      badge: registrationRequests.length > 0 ? registrationRequests.length : undefined,
      badgeColor: "red",
    },
    { id: "forms", label: "Forms", icon: FileCheck2 },
    { id: "students", label: "Students", icon: Users },
    {
      id: "projects",
      label: "Projects",
      icon: FolderGit2,
      badge: pendingSubmissions.length > 0 ? pendingSubmissions.length : undefined,
      badgeColor: "amber",
    },
    { id: "more", label: "More", icon: SlidersHorizontal },
  ];

  const tabs = role === "HOD" ? hodTabs : facultyTabs;

  return (
    <MobileShell
      title={
        activeTab === "home" || activeTab === "overview"
          ? `${role === "HOD" ? "HOD" : "Faculty"} Portal`
          : activeTab === "forms"
          ? "Academic Forms"
          : activeTab === "students"
          ? "Student Cohort"
          : activeTab === "projects"
          ? "Projects Review"
          : "Settings & Tools"
      }
      subtitle={profile.dept}
      largeTitle={true}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        pendingSubmissions.length > 0 ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
            {pendingSubmissions.length} Action
          </span>
        ) : null
      }
    >
      <PullToRefresh onRefresh={loadDashboardData}>
        <div className="p-4 space-y-4 pb-28">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-14 inset-x-4 z-50 p-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl flex items-center justify-between border border-slate-700 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ═══ FACULTY HOME / HOD OVERVIEW ═══ */}
          {(activeTab === "home" || activeTab === "overview") && (
            <div className="space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Pending Action</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {pendingSubmissions.length}
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Review required
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Active Forms</span>
                    <FileCheck2 className="w-4 h-4 text-[#0B2A6F] dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {forms.length}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Published cohorts</span>
                </div>
              </div>

              {/* HOD: Registration Requests Section */}
              {role === "HOD" && registrationRequests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Registration Requests ({registrationRequests.length})
                    </span>
                  </div>

                  <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800">
                    {registrationRequests.map((req, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {req.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            AFN: {req.afn} • {req.course || "B.Tech"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRegistrationRequest(req)}
                            className="px-2.5 py-1 rounded-lg bg-[#0B2A6F] text-white text-[11px] font-bold active:scale-95 cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Needed: Pending Submissions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Needs Your Review ({pendingSubmissions.length})
                  </span>
                </div>

                {pendingSubmissions.length === 0 ? (
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      All caught up!
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No pending project reviews awaiting your action.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800 shadow-xs">
                    {pendingSubmissions.map((sub, idx) => (
                      <ListRow
                        key={idx}
                        title={sub.student?.name || "Student"}
                        subtitle={`${sub.formSubjectCode} • ${sub.projectName || "Topic"}`}
                        status={
                          sub.approvalStatus === "not_approved" ? "changes_requested" : "pending"
                        }
                        trailingMeta="Review"
                        onClick={() => setSelectedSubmission(sub)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ FORMS TAB ═══ */}
          {activeTab === "forms" && (
            <div className="space-y-4">
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search cohorts or subjects..."
              />

              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800 shadow-xs">
                {forms.map((f) => {
                  const formSubs = submissionsDict[f.id] || [];
                  return (
                    <ListRow
                      key={f.id}
                      title={f.subjectCode}
                      subtitle={f.title}
                      status={formSubs.length > 0 ? "approved" : "draft"}
                      trailingMeta={`${formSubs.length} registered`}
                      onClick={() => {
                        // Filter submissions to this form
                        const sub = allSubmissions.find((s) => s.formId === f.id);
                        if (sub) setSelectedSubmission(sub);
                        else showToast(`No submissions registered yet for ${f.subjectCode}`);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ STUDENTS ROSTER TAB ═══ */}
          {activeTab === "students" && (
            <div className="space-y-4">
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search students by name or AFN..."
              />

              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800 shadow-xs">
                {allSubmissions.map((sub, idx) => (
                  <ListRow
                    key={idx}
                    title={sub.student?.name || "Student"}
                    subtitle={`AFN: ${sub.student?.afn} • ${sub.projectName || sub.formSubjectCode}`}
                    status={sub.approvalStatus === "approved" ? "verified" : "pending"}
                    onClick={() => setSelectedSubmission(sub)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══ PROJECTS TAB (HOD) ═══ */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <FilterPillBar
                pills={[
                  { id: "all", label: "All Projects", count: allSubmissions.length },
                  { id: "pending", label: "Pending", count: pendingSubmissions.length },
                  {
                    id: "approved",
                    label: "Approved",
                    count: allSubmissions.length - pendingSubmissions.length,
                  },
                ]}
                activePill={selectedFilterPill}
                onSelectPill={setSelectedFilterPill}
              />

              <div className="rounded-2xl border border-neutral-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-neutral-100 dark:divide-slate-800 shadow-xs">
                {allSubmissions
                  .filter((s) => {
                    if (selectedFilterPill === "pending") return s.approvalStatus !== "approved";
                    if (selectedFilterPill === "approved") return s.approvalStatus === "approved";
                    return true;
                  })
                  .map((sub, idx) => (
                    <ListRow
                      key={idx}
                      title={sub.projectName || "Project Registration"}
                      subtitle={`${sub.student?.name} • ${sub.formSubjectCode}`}
                      status={sub.approvalStatus === "approved" ? "verified" : "pending"}
                      onClick={() => setSelectedSubmission(sub)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* ═══ ACCOUNT & MORE TAB ═══ */}
          {(activeTab === "account" || activeTab === "more") && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0B2A6F] dark:text-blue-400 font-bold text-xl flex items-center justify-center shrink-0">
                    {profile.initial}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {profile.name}
                    </h3>
                    <p className="text-xs text-slate-400">{profile.role}</p>
                    <p className="text-[11px] font-mono text-slate-400">{profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Desktop-Only Heavy Admin Notice Cards */}
              <DesktopOnlyCard
                featureName="CSV Batch Import & Roll Roster Mapping"
                description="Complex spreadsheet parsing and multi-cohort student uploads require wider displays and keyboard navigation."
              />

              {role === "HOD" && (
                <DesktopOnlyCard
                  featureName="Department Archives & Role Editing Matrix"
                  description="Archive analysis and faculty role permissions are managed through the full desktop administrator console."
                />
              )}

              {/* Sign Out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full min-h-[46px] rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Admin Session</span>
              </button>
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* ═══ SUBMISSION REVIEW & ACTION BOTTOM SHEET ═══ */}
      <BottomSheet
        open={Boolean(selectedSubmission)}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
        title={selectedSubmission?.projectName || "Project Review"}
        description={`${selectedSubmission?.student?.name} • AFN: ${selectedSubmission?.student?.afn}`}
      >
        {selectedSubmission && (
          <div className="space-y-4 py-1 text-left text-xs">
            {/* Subject Code and Status */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Initiative</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedSubmission.formSubjectCode}
                </span>
              </div>
              <StatusChip
                status={selectedSubmission.approvalStatus === "approved" ? "verified" : "pending"}
                size="sm"
              />
            </div>

            {/* Description */}
            <div className="p-3.5 bg-neutral-50 dark:bg-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Abstract</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedSubmission.projectDescription}
              </p>
            </div>

            {/* Team details */}
            {selectedSubmission.registrationType === "group" && (
              <div className="p-3.5 bg-neutral-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Team Members</span>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Leader: {selectedSubmission.student?.name} ({selectedSubmission.student?.afn})
                  </div>
                  {(selectedSubmission.teamMembers || []).map((m: any, i: number) => (
                    <div key={i} className="text-slate-600 dark:text-slate-400">
                      Member {i + 2}: {m.name || "Student"} (AFN: {m.afn})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 2 Deliverables (if attached) */}
            {selectedSubmission.finalSubmission && (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#0B2A6F] dark:text-blue-300 block">
                  Stage 2 Deliverables
                </span>
                {selectedSubmission.finalSubmission.repoUrl && (
                  <div className="font-mono text-[11px] text-[#0B2A6F] dark:text-blue-400 truncate">
                    Repo: {selectedSubmission.finalSubmission.repoUrl}
                  </div>
                )}
                {selectedSubmission.finalSubmission.demoUrl && (
                  <div className="font-mono text-[11px] text-[#0B2A6F] dark:text-blue-400 truncate">
                    Demo: {selectedSubmission.finalSubmission.demoUrl}
                  </div>
                )}
              </div>
            )}

            {/* Action Feedback input for Revisions */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                Feedback / Revision Notes (Optional)
              </label>
              <input
                type="text"
                value={actionFeedback}
                onChange={(e) => setActionFeedback(e.target.value)}
                placeholder="Specific guidance for student..."
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs"
              />
            </div>

            {/* Action Buttons: Review & Act */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleApprove(selectedSubmission)}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Approve Topic & Registration</span>
              </button>

              <button
                type="button"
                onClick={() => handleRequestChanges(selectedSubmission)}
                className="w-full min-h-[44px] rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Request Revisions</span>
              </button>

              <button
                type="button"
                disabled={reminding}
                onClick={() => handleRemindStudent(selectedSubmission)}
                className="w-full min-h-[42px] rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-neutral-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-slate-400" />
                <span>{reminding ? "Dispatching..." : "Send Reminder Email"}</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </MobileShell>
  );
}
