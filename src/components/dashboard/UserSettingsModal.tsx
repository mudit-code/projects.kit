"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Trash2,
  X,
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
import { RoleType } from "@/lib/auth";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "preferences" | "trash";
  profileDetails: {
    name: string;
    email: string;
    role: string;
    dept?: string;
  };
  currentRole: RoleType;
}

export function UserSettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
  profileDetails,
  currentRole,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "trash">(initialTab);
  const [trashedItems, setTrashedItems] = useState<TrashedFormItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  // Preference states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshTrash = () => {
    const items = getCleanTrashForms();
    setTrashedItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      refreshTrash();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleTrashChange = () => {
      refreshTrash();
    };
    window.addEventListener("kit-trash-change", handleTrashChange);
    return () => window.removeEventListener("kit-trash-change", handleTrashChange);
  }, []);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDeleteId || confirmEmpty) {
          setConfirmDeleteId(null);
          setConfirmEmpty(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmDeleteId, confirmEmpty, onClose]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  const handleRestore = async (id: string, title?: string) => {
    const success = await restoreFormFromTrash(id);
    if (success) {
      refreshTrash();
      showToast(`Form "${title || id}" restored to active forms.`);
    }
  };

  const handlePermanentDelete = async (id: string, title?: string) => {
    const success = await permanentlyDeleteFromTrash(id);
    if (success) {
      setConfirmDeleteId(null);
      refreshTrash();
      showToast(`Form "${title || id}" permanently deleted.`);
    }
  };

  const handleEmptyAll = async () => {
    await emptyAllTrash();
    setConfirmEmpty(false);
    refreshTrash();
    showToast("Trash emptied completely.");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-settings-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D3481]/10 border border-[#0D3481]/20 text-[#0D3481] flex items-center justify-center shrink-0 shadow-2xs">
              <Settings className="w-5 h-5 text-[#0D3481]" />
            </div>
            <div>
              <h3 id="user-settings-modal-title" className="text-base sm:text-lg font-extrabold text-[#10334A]">
                Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your account profile, dashboard preferences, and trash module.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 bg-white px-5 sm:px-6 shrink-0 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
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
            onClick={() => setActiveTab("preferences")}
            className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
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
            onClick={() => setActiveTab("trash")}
            className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "trash"
                ? "text-red-600 border-b-2 border-red-600"
                : "text-slate-500 hover:text-red-600"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash</span>
            {trashedItems.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                {trashedItems.length}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-normal">0</span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* ─── TAB 1: PROFILE & ACCOUNT ─── */}
          {activeTab === "profile" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-[#0D3481] font-extrabold flex items-center justify-center text-base">
                    {profileDetails.name
                      ? profileDetails.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "RS"}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#10334A]">{profileDetails.name}</h4>
                    <p className="text-xs text-slate-500">{profileDetails.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                    <strong className="text-slate-800">
                      {profileDetails.dept || "Dept. of Computer Science & Engineering"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <strong className="text-slate-800 font-mono">{profileDetails.email}</strong>
                  </div>
                </div>
              </div>

              {/* Trash shortcut card inside Settings */}
              <div
                onClick={() => setActiveTab("trash")}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0D3481]/30 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-[#10334A]">Trash &amp; Archival Retention</h5>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        7-Day Retention
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      View, restore, or permanently purge deleted forms. Items auto-delete within 7 days.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D3481] group-hover:translate-x-0.5 transition-transform shrink-0">
                  <span>Open Trash ({trashedItems.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PREFERENCES ─── */}
          {activeTab === "preferences" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Settings</h4>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Email Reminder Notifications</span>
                    <span className="text-[11px] text-slate-500">
                      Receive activity notifications when students submit proposals.
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
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D3481]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Automatic Roster Sync</span>
                    <span className="text-[11px] text-slate-500">
                      Sync student proposals and verification states across browser sessions.
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
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D3481]"></div>
                  </label>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic 7-Day Purge Policy:</strong> Any deleted form in Trash is stored with a 7-day retention countdown and will be permanently deleted once the timer expires.
                </span>
              </div>
            </div>
          )}

          {/* ─── TAB 3: TRASH MODULE (VIEW OF TRASHED THINGS) ─── */}
          {activeTab === "trash" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Policy Header Bar */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>7-Day Automatic Deletion:</strong> Items in trash are automatically purged after 7 days.
                  </span>
                </div>
                {trashedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmEmpty(true)}
                    className="text-red-600 hover:text-red-700 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1 text-[11px] shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Empty Trash</span>
                  </button>
                )}
              </div>

              {/* Confirm Empty Trash Banner */}
              {confirmEmpty && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-semibold">
                      Permanently delete all {trashedItems.length} items from trash?
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmEmpty(false)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEmptyAll}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Yes, Empty All
                    </button>
                  </div>
                </div>
              )}

              {/* Trashed Items List */}
              {trashedItems.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                    <Trash2 className="w-7 h-7 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Trash is Empty</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Forms that you delete will appear here and are retained for{" "}
                    <span className="font-semibold text-slate-700">{TRASH_RETENTION_DAYS} days</span> before being automatically purged.
                  </p>
                </div>
              ) : (
                trashedItems.map((item) => {
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
                      className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-[#0D3481] border border-slate-200">
                              {subjectCode}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {cohort}
                            </span>
                            {item.form?.category && (
                              <span className="text-[10px] text-slate-400">· {item.form.category}</span>
                            )}
                          </div>
                          <h4 className="text-sm font-extrabold text-[#10334A] leading-snug">
                            {title}
                          </h4>
                        </div>

                        {/* Expiry Pill */}
                        <div className="shrink-0 flex items-center gap-1.5 self-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              remainingDays <= 2
                                ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                : remainingDays <= 4
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-[#0D3481] border-blue-200"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 border-t border-slate-100 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
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
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(item.id, title)}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs"
                              >
                                Delete Permanently
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                title="Delete permanently right now"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Purge</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRestore(item.id, title)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1.5"
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
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            {activeTab === "trash"
              ? "Retention cycle runs automatically every time the app opens."
              : `Logged in as ${profileDetails.role}`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Toast within Modal */}
        {toastMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-[#10334A] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border border-white/10 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
