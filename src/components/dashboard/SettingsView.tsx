"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Settings,
  User,
  Trash2,
  Mail,
  ShieldCheck,
  Building,
  RotateCcw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Bell,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  TrashedFormItem,
  getCleanTrashForms,
  restoreFormFromTrash,
  permanentlyDeleteFromTrash,
  emptyAllTrash,
  getRemainingDays,
  TRASH_RETENTION_DAYS,
} from "@/lib/trashForms";
import { RoleType, getActiveSession } from "@/lib/auth";

interface SettingsViewProps {
  role?: RoleType;
}

export function SettingsView({ role = "HOD" }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "trash">(
    initialTabParam === "trash" ? "trash" : initialTabParam === "preferences" ? "preferences" : "profile"
  );

  const [session, setSession] = useState({
    name: role === "HOD" ? "Rahul Singh" : "Dr. A. Sharma",
    email: role === "HOD" ? "muditcodes@gmail.com" : "coordinator@kit.ac.in",
    role: role === "HOD" ? "Head of Department (HOD)" : "Faculty (Project Coordinator)",
    dept: "Dept. of Computer Science & Engineering",
  });

  const [trashedItems, setTrashedItems] = useState<TrashedFormItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  // Preference states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load active session details
  useEffect(() => {
    const act = getActiveSession();
    if (act) {
      setSession((prev) => ({
        ...prev,
        name: act.name || prev.name,
        email: act.email || prev.email,
        role: act.role === "HOD" ? "Head of Department (HOD)" : "Faculty (Project Coordinator)",
        dept: act.dept || prev.dept,
      }));
    }
  }, []);

  // Sync tab with URL parameter if present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "trash") setActiveTab("trash");
    else if (tabParam === "preferences") setActiveTab("preferences");
    else if (tabParam === "profile") setActiveTab("profile");
  }, [searchParams]);

  const refreshTrash = async () => {
    try {
      const res = await fetch("/api/forms/trash");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setTrashedItems(data.items);
          localStorage.setItem("kit_trash_forms", JSON.stringify(data.items));
          return;
        }
      }
    } catch {
      // fallback
    }
    const items = getCleanTrashForms();
    setTrashedItems(items);
  };

  useEffect(() => {
    refreshTrash();
  }, []);

  useEffect(() => {
    const handleTrashChange = () => {
      refreshTrash();
    };
    window.addEventListener("kit-trash-change", handleTrashChange);
    return () => window.removeEventListener("kit-trash-change", handleTrashChange);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  const handleTabChange = (tab: "profile" | "preferences" | "trash") => {
    setActiveTab(tab);
    const basePath = role === "HOD" ? "/hod/settings" : "/coordinator/settings";
    if (tab === "profile") {
      router.replace(basePath);
    } else {
      router.replace(`${basePath}?tab=${tab}`);
    }
  };

  const handleRestore = async (id: string, title?: string) => {
    const success = await restoreFormFromTrash(id);
    if (success) {
      await refreshTrash();
      showToast(`Form "${title || id}" restored to active forms.`);
    }
  };

  const handlePermanentDelete = async (id: string, title?: string) => {
    const success = await permanentlyDeleteFromTrash(id);
    if (success) {
      setConfirmDeleteId(null);
      await refreshTrash();
      showToast(`Form "${title || id}" permanently deleted.`);
    }
  };

  const handleEmptyAll = async () => {
    await emptyAllTrash();
    setConfirmEmpty(false);
    await refreshTrash();
    showToast("Trash emptied completely.");
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0D3481]/10 border border-[#0D3481]/20 text-[#0D3481] flex items-center justify-center shrink-0 shadow-2xs">
            <Settings className="w-6 h-6 text-[#0D3481]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#10334A] tracking-tight">
                Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-[#0D3481] border border-slate-200">
                {role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your department profile, dashboard preferences, and trash module.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 gap-2 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={`py-3.5 px-2 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "profile"
                ? "text-[#0D3481] border-b-2 border-[#0D3481]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile &amp; Account</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("preferences")}
            className={`py-3.5 px-2 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "preferences"
                ? "text-[#0D3481] border-b-2 border-[#0D3481]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("trash")}
            className={`py-3.5 px-2 text-xs sm:text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "trash"
                ? "text-red-600 border-b-2 border-red-600"
                : "text-slate-500 hover:text-red-600"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash</span>
            {trashedItems.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {trashedItems.length}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal">0</span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 sm:p-8">
          {/* ─── TAB 1: PROFILE & ACCOUNT ─── */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#0D3481] font-extrabold flex items-center justify-center text-lg shadow-2xs">
                    {session.name
                      ? session.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "RS"}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#10334A]">{session.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{session.role}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Institutional Portal</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200/70 text-xs sm:text-sm">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Department</span>
                    <strong className="text-slate-800 font-semibold">{session.dept}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Institutional Email</span>
                    <strong className="text-slate-800 font-mono font-semibold">{session.email}</strong>
                  </div>
                </div>
              </div>

              {/* Trash shortcut card inside Settings Tab */}
              <div
                onClick={() => handleTabChange("trash")}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0D3481]/30 hover:bg-slate-50/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#10334A]">Trash &amp; Archival Retention</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        7-Day Retention
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review deleted forms, restore archived data, or permanently delete items. Auto-purged after 7 days.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0D3481] group-hover:translate-x-0.5 transition-transform shrink-0 self-end sm:self-auto">
                  <span>View Trash ({trashedItems.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PREFERENCES ─── */}
          {activeTab === "preferences" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dashboard Preferences
                </h3>

                <div className="flex items-center justify-between py-3 border-b border-slate-100 text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-slate-800 block">Email Reminder Notifications</span>
                    <span className="text-xs text-slate-500">
                      Receive activity notifications and dispatch receipts for student cohorts.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => {
                        setEmailAlerts(e.target.checked);
                        showToast("Preferences updated.");
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D3481]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-bold text-slate-800 block">Automatic Submissions Sync</span>
                    <span className="text-xs text-slate-500">
                      Sync student proposal changes and approval states in real-time.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => {
                        setAutoRefresh(e.target.checked);
                        showToast("Preferences updated.");
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D3481]"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic 7-Day Purge Policy:</strong> Any deleted form in Trash is stored with a 7-day retention countdown and will be permanently deleted once the timer expires.
                </span>
              </div>
            </div>
          )}

          {/* ─── TAB 3: TRASH MODULE (VIEW OF TRASHED THINGS) ─── */}
          {activeTab === "trash" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Policy Header Bar */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>7-Day Automatic Deletion:</strong> Trashed forms are retained for 7 days before being permanently deleted automatically.
                  </span>
                </div>
                {trashedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmEmpty(true)}
                    className="text-red-600 hover:text-red-700 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 self-end sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Empty Trash ({trashedItems.length})</span>
                  </button>
                )}
              </div>

              {/* Confirm Empty Trash Banner */}
              {confirmEmpty && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-semibold">
                      Permanently delete all {trashedItems.length} items from trash? This cannot be undone.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setConfirmEmpty(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEmptyAll}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-2xs"
                    >
                      Yes, Empty All
                    </button>
                  </div>
                </div>
              )}

              {/* Trashed Items List */}
              {trashedItems.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700">Trash is Empty</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Forms that you delete will appear here and are retained for{" "}
                    <span className="font-semibold text-slate-700">{TRASH_RETENTION_DAYS} days</span> before being automatically purged.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trashedItems.map((item) => {
                    const remainingDays = getRemainingDays(item.expiresAt);
                    const title =
                      item.form?.customProjectName ||
                      item.form?.title ||
                      item.form?.projectType ||
                      item.id;
                    const subjectCode = item.form?.subjectCode || item.form?.code || item.id;
                    const cohort = `${item.form?.course || "B.Tech"} · ${item.form?.stream || "CSE"} · ${item.form?.year || "4th Year"} (Sec ${item.form?.section || "A"})`;

                    return (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-[#0D3481] border border-slate-200">
                                {subjectCode}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {cohort}
                              </span>
                              {item.form?.category && (
                                <span className="text-xs text-slate-400">· {item.form.category}</span>
                              )}
                            </div>
                            <h4 className="text-base font-extrabold text-[#10334A] leading-snug">
                              {title}
                            </h4>
                          </div>

                          {/* Expiry Pill */}
                          <div className="shrink-0 flex items-center gap-1.5 self-start">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                remainingDays <= 2
                                  ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                  : remainingDays <= 4
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-blue-50 text-[#0D3481] border-blue-200"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {remainingDays === 0
                                  ? "Purges today"
                                  : remainingDays === 1
                                  ? "Auto-deletes tomorrow"
                                  : `Deletes in ${remainingDays} days`}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Metadata and Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3 text-xs">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Deleted {new Date(item.deletedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            {item.deletedBy && <span>by {item.deletedBy}</span>}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDelete(item.id, title)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-2xs cursor-pointer"
                                >
                                  Delete Permanently
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                                  title="Delete permanently right now"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Purge</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRestore(item.id, title)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
                                  title="Restore form back to active list"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore Form</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#10334A] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-white/10 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
