"use client";

import { useState, useEffect } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Calendar,
  X,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Layers,
  ArrowRight,
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

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const [trashedItems, setTrashedItems] = useState<TrashedFormItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  // Load and auto-prune trash items
  const refreshTrash = () => {
    const items = getCleanTrashForms();
    setTrashedItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      refreshTrash();
    }
  }, [isOpen]);

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
      aria-labelledby="trash-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="trash-modal-title" className="text-base sm:text-lg font-extrabold text-[#10334A]">
                  Trash &amp; Archival Retention
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {TRASH_RETENTION_DAYS}-Day Policy
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Forms moved to trash are automatically deleted permanently after {TRASH_RETENTION_DAYS} days.
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

        {/* Modal Subheader Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {trashedItems.length} {trashedItems.length === 1 ? "form" : "forms"} in trash
            </span>
          </div>

          {trashedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmEmpty(true)}
              className="text-red-600 hover:text-red-700 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Empty Trash</span>
            </button>
          )}
        </div>

        {/* Confirm Empty Trash Banner */}
        {confirmEmpty && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">
                Permanently delete all {trashedItems.length} items from trash? This cannot be undone.
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

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {trashedItems.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Trash is Empty</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Forms that you delete will be moved here. You can restore them anytime within{" "}
                <span className="font-semibold text-slate-700">{TRASH_RETENTION_DAYS} days</span> before they are permanently purged.
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

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Retention cycle runs automatically every time the app opens.
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
