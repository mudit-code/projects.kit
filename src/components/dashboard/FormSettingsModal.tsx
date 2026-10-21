"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Settings,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  FolderGit2,
  Presentation,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Sparkles,
  Save,
  Check,
  Plus,
  ExternalLink,
} from "lucide-react";
import { moveFormToTrash } from "@/lib/trashForms";
import { CustomDatePicker, getTodayIso } from "@/components/CustomDatePicker";

export interface FinalSubmissionConfig {
  enabled: boolean;
  deadline: string;
  requireReport: boolean;
  requireRepoUrl: boolean;
  requireSlides: boolean;
  requireDemoUrl: boolean;
  instructions: string;
  maxFileSizeMb: number;
}

export interface PresentationSlot {
  id: string;
  slotNumber: number;
  studentName: string;
  afn: string;
  projectName: string;
  date: string;
  time: string;
  venue: string;
  evaluators: string;
}

export interface PresentationScheduleConfig {
  mode: "in_person" | "online" | "hybrid";
  startDate: string;
  endDate: string;
  slotDurationMinutes: number;
  dailyStartTime: string;
  dailyEndTime: string;
  venue: string;
  meetLink: string;
  evaluators: string;
  slots: PresentationSlot[];
}

interface FormSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  form: any;
  registeredStudents: any[];
  submissions: any[];
  onFormUpdated?: (updatedForm: any) => void;
  onDeleted?: () => void;
  onResetSubmissions?: () => void;
}

export function FormSettingsModal({
  isOpen,
  onClose,
  formId,
  form,
  registeredStudents,
  submissions,
  onFormUpdated,
  onDeleted,
  onResetSubmissions,
}: FormSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"final_submission" | "presentations" | "danger_zone">("final_submission");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const formTitle = form?.customProjectName || form?.title || form?.projectType || "Mini Project";
  const subjectCode = form?.subjectCode || form?.id || "BCS751";

  // ─── 1. Final Submission State ───
  const [finalConfig, setFinalConfig] = useState<FinalSubmissionConfig>({
    enabled: false,
    deadline: "2026-11-15",
    requireReport: true,
    requireRepoUrl: true,
    requireSlides: true,
    requireDemoUrl: false,
    instructions: "Please upload your complete project report (PDF), presentation slides, and provide the link to your Git repository with clear README documentation.",
    maxFileSizeMb: 25,
  });

  // ─── 2. Presentation Schedule State ───
  const [presConfig, setPresConfig] = useState<PresentationScheduleConfig>({
    mode: "in_person",
    startDate: "2026-11-18",
    endDate: "2026-11-20",
    slotDurationMinutes: 20,
    dailyStartTime: "10:00",
    dailyEndTime: "16:00",
    venue: "Seminar Hall B (3rd Floor, CS Block)",
    meetLink: "https://meet.google.com/prj-eval-demo",
    evaluators: "Prof. Rahul Singh (HOD), Dr. A. Sharma",
    slots: [],
  });

  // ─── 3. Danger Zone State ───
  const [isSudoModalOpen, setIsSudoModalOpen] = useState(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState("");
  const expectedPhrase = `delete sudo ${formTitle}`;

  // Load existing configurations from localStorage or form on open
  useEffect(() => {
    if (!isOpen || !formId) return;

    try {
      const rawFinal = localStorage.getItem(`kit_final_submission_${formId}`);
      if (rawFinal) {
        setFinalConfig(JSON.parse(rawFinal));
      } else if (form?.finalSubmission) {
        setFinalConfig(form.finalSubmission);
      } else if (form?.finalSubmissionOpen !== undefined) {
        setFinalConfig((prev) => ({
          ...prev,
          enabled: Boolean(form.finalSubmissionOpen),
          deadline: form.finalSubmissionDeadline || prev.deadline,
        }));
      }

      const rawPres = localStorage.getItem(`kit_presentation_schedule_${formId}`);
      if (rawPres) {
        setPresConfig(JSON.parse(rawPres));
      } else if (form?.presentationsConfig) {
        try {
          const parsed = typeof form.presentationsConfig === "string" ? JSON.parse(form.presentationsConfig) : form.presentationsConfig;
          if (parsed && typeof parsed === "object") setPresConfig(parsed);
        } catch {}
      }
    } catch {}
  }, [isOpen, formId, form]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // Save Final Submission Settings
  const handleSaveFinalSubmission = async (overrideConfig?: FinalSubmissionConfig) => {
    const cfg = overrideConfig || finalConfig;
    if (overrideConfig) {
      setFinalConfig(overrideConfig);
    }
    try {
      localStorage.setItem(`kit_final_submission_${formId}`, JSON.stringify(cfg));

      // Sync to database via API
      try {
        await fetch(`/api/forms/${encodeURIComponent(formId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalSubmissionOpen: Boolean(cfg.enabled),
            finalSubmissionDeadline: cfg.deadline || null,
          }),
        });
      } catch (err) {
        console.warn("Could not sync final submission to server DB:", err);
      }

      // Also update kit_published_initiatives so forms table / student views know
      const rawInit = localStorage.getItem("kit_published_initiatives");
      if (rawInit) {
        const list: any[] = JSON.parse(rawInit);
        const idx = list.findIndex(
          (f) =>
            String(f.id) === String(formId) ||
            String(f.subjectCode) === String(formId) ||
            String(f.id).toUpperCase() === String(formId).toUpperCase()
        );
        if (idx >= 0) {
          list[idx].finalSubmission = cfg;
          list[idx].finalSubmissionOpen = Boolean(cfg.enabled);
          list[idx].finalSubmissionDeadline = cfg.deadline || null;
          localStorage.setItem("kit_published_initiatives", JSON.stringify(list));
          window.dispatchEvent(new Event("kit-initiatives-change"));
          onFormUpdated?.(list[idx]);
        }
      }

      showToast(
        cfg.enabled
          ? "Final Submission is now open for students!"
          : "Final Submission settings updated successfully."
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-generate Presentation Slots
  const handleGeneratePresentationSchedule = () => {
    const candidateList = submissions.length > 0 ? submissions : registeredStudents;
    if (!candidateList || candidateList.length === 0) {
      showToast("No registered students found to schedule. Register students first.");
      return;
    }

    const duration = presConfig.slotDurationMinutes || 20;
    const slots: PresentationSlot[] = [];

    // Base time: 10:00 AM on startDate
    let currentHour = 10;
    let currentMinute = 0;
    let dayOffset = 0;

    const baseDate = new Date(presConfig.startDate || "2026-11-18");

    candidateList.forEach((item: any, idx: number) => {
      const studentName = item.student?.name || item.name || `Student ${idx + 1}`;
      const afn = item.student?.afn || item.afn || "—";
      const pName = item.projectName || formTitle;

      const slotDate = new Date(baseDate);
      slotDate.setDate(slotDate.getDate() + dayOffset);

      const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")} ${currentHour >= 12 ? "PM" : "AM"}`;
      const dateStr = slotDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      slots.push({
        id: `slot-${idx + 1}`,
        slotNumber: idx + 1,
        studentName,
        afn,
        projectName: pName,
        date: dateStr,
        time: timeStr,
        venue: presConfig.mode === "online" ? "Google Meet" : presConfig.venue,
        evaluators: presConfig.evaluators,
      });

      // Advance time
      currentMinute += duration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
      if (currentHour >= 16) {
        // Next day
        currentHour = 10;
        currentMinute = 0;
        dayOffset += 1;
      }
    });

    setPresConfig((prev) => ({ ...prev, slots }));
    showToast(`Generated presentation schedule for ${slots.length} teams.`);
  };

  // Save Presentation Schedule
  const handleSavePresentationSchedule = async () => {
    try {
      localStorage.setItem(`kit_presentation_schedule_${formId}`, JSON.stringify(presConfig));

      // Sync to database via API
      try {
        await fetch(`/api/forms/${encodeURIComponent(formId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presentationsScheduled: presConfig.slots.length > 0,
            presentationsConfig: presConfig,
          }),
        });
      } catch (err) {
        console.warn("Could not sync presentation schedule to server DB:", err);
      }

      showToast(`Presentation schedule saved with ${presConfig.slots.length} presentation slots.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Move to Trash with sudo confirmation
  const isPhraseMatched =
    confirmPhraseInput.trim().toLowerCase() === expectedPhrase.trim().toLowerCase();

  const handleConfirmMoveToTrash = async () => {
    if (!isPhraseMatched) return;

    const success = await moveFormToTrash(formId, form, submissions);
    if (success) {
      setIsSudoModalOpen(false);
      onClose();
      onDeleted?.();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-settings-title"
      >
        <div
          className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D3481]/10 border border-[#0D3481]/20 text-[#0D3481] flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="form-settings-title" className="text-base font-extrabold text-[#10334A]">
                    Form Settings
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-[#0D3481] border border-slate-200">
                    {subjectCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200/80 bg-white px-5 sm:px-6 shrink-0 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("final_submission")}
              className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === "final_submission"
                  ? "text-[#0D3481] border-b-2 border-[#0D3481]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Submissions</span>
              {finalConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("presentations")}
              className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === "presentations"
                  ? "text-[#0D3481] border-b-2 border-[#0D3481]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>Presentations</span>
              {presConfig.slots.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#0D3481] text-[10px]">
                  {presConfig.slots.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("danger_zone")}
              className={`py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === "danger_zone"
                  ? "text-red-600 border-b-2 border-red-600"
                  : "text-slate-500 hover:text-red-600"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Danger</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* ─── TAB 1: FINAL SUBMISSION ─── */}
            {activeTab === "final_submission" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Status Banner */}
                {finalConfig.enabled ? (
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-3 text-emerald-950">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          Final Submissions are Open
                        </h4>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Students can now upload their completed deliverables on the portal.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      Live
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 rounded-xl bg-[#0D3481]/10 text-[#0D3481] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Open Final Submissions</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Set the submission deadline and required deliverables below to open final submissions for students.
                      </p>
                    </div>
                  </div>
                )}

                  {/* Deadline */}
                  <div className="space-y-1">
                    <CustomDatePicker
                      label="Submission Deadline"
                      value={finalConfig.deadline}
                      onChange={(val) =>
                        setFinalConfig((prev) => ({ ...prev, deadline: val }))
                      }
                      minDate={getTodayIso()}
                      popoverPlacement="bottom"
                      presets={[
                        { label: "+10 Days", daysFromBase: 10 },
                        { label: "+15 Days", daysFromBase: 15 },
                        { label: "+30 Days", daysFromBase: 30 },
                      ]}
                    />
                  </div>

                  {/* Required Deliverables Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Deliverable Links
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Unchecked items remain optional for students
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 1. Report */}
                      <div
                        onClick={() =>
                          setFinalConfig((prev) => ({ ...prev, requireReport: !prev.requireReport }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                          finalConfig.requireReport
                            ? "border-[#0D3481] bg-[#0D3481]/5 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={finalConfig.requireReport}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFinalConfig((prev) => ({ ...prev, requireReport: e.target.checked }));
                            }}
                            className="w-4 h-4 rounded text-[#0D3481] focus:ring-[#0D3481] cursor-pointer"
                          />
                          <FileText className="w-4 h-4 text-red-500" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Report</span>
                            <span className="text-[10px] text-slate-400 block">PDF format</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            finalConfig.requireReport
                              ? "text-red-700 bg-red-50 border border-red-200/80"
                              : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {finalConfig.requireReport ? "Mandatory" : "Optional"}
                        </span>
                      </div>

                      {/* 2. Git Repository */}
                      <div
                        onClick={() =>
                          setFinalConfig((prev) => ({ ...prev, requireRepoUrl: !prev.requireRepoUrl }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                          finalConfig.requireRepoUrl
                            ? "border-[#0D3481] bg-[#0D3481]/5 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={finalConfig.requireRepoUrl}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFinalConfig((prev) => ({ ...prev, requireRepoUrl: e.target.checked }));
                            }}
                            className="w-4 h-4 rounded text-[#0D3481] focus:ring-[#0D3481] cursor-pointer"
                          />
                          <FolderGit2 className="w-4 h-4 text-slate-800" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Git Repository</span>
                            <span className="text-[10px] text-slate-400 block">Repository link</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            finalConfig.requireRepoUrl
                              ? "text-red-700 bg-red-50 border border-red-200/80"
                              : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {finalConfig.requireRepoUrl ? "Mandatory" : "Optional"}
                        </span>
                      </div>

                      {/* 3. PPT */}
                      <div
                        onClick={() =>
                          setFinalConfig((prev) => ({ ...prev, requireSlides: !prev.requireSlides }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                          finalConfig.requireSlides
                            ? "border-[#0D3481] bg-[#0D3481]/5 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={finalConfig.requireSlides}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFinalConfig((prev) => ({ ...prev, requireSlides: e.target.checked }));
                            }}
                            className="w-4 h-4 rounded text-[#0D3481] focus:ring-[#0D3481] cursor-pointer"
                          />
                          <Presentation className="w-4 h-4 text-amber-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">PPT</span>
                            <span className="text-[10px] text-slate-400 block">Presentation link</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            finalConfig.requireSlides
                              ? "text-red-700 bg-red-50 border border-red-200/80"
                              : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {finalConfig.requireSlides ? "Mandatory" : "Optional"}
                        </span>
                      </div>

                      {/* 4. Demo */}
                      <div
                        onClick={() =>
                          setFinalConfig((prev) => ({ ...prev, requireDemoUrl: !prev.requireDemoUrl }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none ${
                          finalConfig.requireDemoUrl
                            ? "border-[#0D3481] bg-[#0D3481]/5 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={finalConfig.requireDemoUrl}
                            onChange={(e) => {
                              e.stopPropagation();
                              setFinalConfig((prev) => ({ ...prev, requireDemoUrl: e.target.checked }));
                            }}
                            className="w-4 h-4 rounded text-[#0D3481] focus:ring-[#0D3481] cursor-pointer"
                          />
                          <Video className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Demo</span>
                            <span className="text-[10px] text-slate-400 block">Live URL</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            finalConfig.requireDemoUrl
                              ? "text-red-700 bg-red-50 border border-red-200/80"
                              : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {finalConfig.requireDemoUrl ? "Mandatory" : "Optional"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions Textarea */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={finalConfig.instructions}
                      onChange={(e) =>
                        setFinalConfig((prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] leading-relaxed resize-none"
                      placeholder="Optional student instructions..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {finalConfig.enabled ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Open for student submissions
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Configure deadline &amp; deliverables above
                        </span>
                      )}
                    </div>

                    <div>
                      {!finalConfig.enabled ? (
                        <button
                          type="button"
                          onClick={() => handleSaveFinalSubmission({ ...finalConfig, enabled: true })}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Open Final Submission</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveFinalSubmission()}
                          className="px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </button>
                      )}
                    </div>
                  </div>
              </div>
            )}

            {/* ─── TAB 2: SCHEDULE PRESENTATIONS ─── */}
            {activeTab === "presentations" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-[#0D3481] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                      <Presentation className="w-4 h-4 text-[#0D3481]" />
                      <span>Presentation &amp; Viva Voce Defense</span>
                    </h4>
                    <p className="text-slate-600">
                      Configure presentation dates, slot durations, faculty evaluators, and auto-generate evaluation slots for all registered project teams.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePresentationSchedule}
                    className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-[#0D3481] hover:bg-blue-100/60 font-bold text-xs transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Auto-Schedule All</span>
                  </button>
                </div>

                {/* Mode & Venue Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Defense Mode</label>
                    <select
                      value={presConfig.mode}
                      onChange={(e) =>
                        setPresConfig((prev) => ({
                          ...prev,
                          mode: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                    >
                      <option value="in_person">In-Person (On-Campus)</option>
                      <option value="online">Online (Google Meet)</option>
                      <option value="hybrid">Hybrid (Campus + Online)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <CustomDatePicker
                      label="Start Date"
                      value={presConfig.startDate}
                      onChange={(val) =>
                        setPresConfig((prev) => ({ ...prev, startDate: val }))
                      }
                      minDate={getTodayIso()}
                      ruleBadge="Rule: Today or future"
                      popoverPlacement="bottom"
                      presets={[
                        { label: "Today", daysFromBase: 0 },
                        { label: "Tomorrow", daysFromBase: 1 },
                        { label: "+7 Days", daysFromBase: 7 },
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Slot Duration</label>
                    <select
                      value={presConfig.slotDurationMinutes}
                      onChange={(e) =>
                        setPresConfig((prev) => ({
                          ...prev,
                          slotDurationMinutes: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                    >
                      <option value={15}>15 Minutes per Team</option>
                      <option value={20}>20 Minutes per Team</option>
                      <option value={30}>30 Minutes per Team</option>
                      <option value={45}>45 Minutes per Team</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Venue / Room</span>
                    </label>
                    <input
                      type="text"
                      value={presConfig.venue}
                      onChange={(e) =>
                        setPresConfig((prev) => ({ ...prev, venue: e.target.value }))
                      }
                      placeholder="e.g. Seminar Hall B (CS Block)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-slate-500" />
                      <span>Meet / Stream URL</span>
                    </label>
                    <input
                      type="text"
                      value={presConfig.meetLink}
                      onChange={(e) =>
                        setPresConfig((prev) => ({ ...prev, meetLink: e.target.value }))
                      }
                      placeholder="https://meet.google.com/..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Evaluation Panel Members</span>
                  </label>
                  <input
                    type="text"
                    value={presConfig.evaluators}
                    onChange={(e) =>
                      setPresConfig((prev) => ({ ...prev, evaluators: e.target.value }))
                    }
                    placeholder="e.g. Prof. Rahul Singh (HOD), Dr. A. Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* Generated Slots Preview Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Scheduled Presentation Slots ({presConfig.slots.length})
                    </span>
                    {presConfig.slots.length > 0 && (
                      <span className="text-[11px] text-slate-500">
                        {presConfig.slotDurationMinutes} mins / slot
                      </span>
                    )}
                  </div>

                  {presConfig.slots.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-2">
                      <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">
                        No slots generated yet. Click &ldquo;Auto-Schedule All&rdquo; to create presentation slots for registered students.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Slot</th>
                            <th className="py-2 px-3">Student / Team</th>
                            <th className="py-2 px-3">Date &amp; Time</th>
                            <th className="py-2 px-3">Venue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {presConfig.slots.map((slot) => (
                            <tr key={slot.id} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 font-mono font-bold text-[#0D3481]">
                                #{slot.slotNumber}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-800">{slot.studentName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">AFN: {slot.afn}</div>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-700">{slot.date}</div>
                                <div className="text-[10px] text-slate-500">{slot.time}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">
                                {slot.venue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSavePresentationSchedule}
                    className="px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#071930] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Presentation Schedule</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── TAB 3: DANGER ZONE ─── */}
            {activeTab === "danger_zone" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <h4 className="text-sm font-extrabold">Danger Zone Administration</h4>
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Actions in this section can alter registration rosters or move the entire initiative form to Trash. Please review carefully.
                  </p>
                </div>

                {/* Reset submissions option */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-extrabold text-slate-800">
                      Reset All Student Submissions
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Reverts all registered student submissions back to Pending (0 submitted) while keeping the form itself published.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onResetSubmissions?.();
                    }}
                    className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Submissions</span>
                  </button>
                </div>

                {/* Delete Form Card */}
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 max-w-md">
                    <h5 className="text-xs font-extrabold text-red-800 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Delete Form &amp; Move to Trash</span>
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Removes this form from active student listings. In accordance with the retention policy, the form and its data are{" "}
                      <strong className="text-red-700">automatically purged after 7 days</strong>. You can restore it anytime before 7 days from Profile Settings &gt; Trash.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmPhraseInput("");
                      setIsSudoModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs transition-all shadow-sm shadow-red-500/20 shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete the Form</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              Form ID: {formId} · Changes are persisted immediately
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Toast Notification in Modal */}
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

      {/* ─── SUDO DELETE CONFIRMATION MODAL ─── */}
      {isSudoModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSudoModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSudoModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                    High Security Action
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#10334A] leading-snug">
                  Delete &ldquo;{formTitle}&rdquo;?
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This will remove <strong className="text-slate-900 font-bold">&ldquo;{formTitle}&rdquo;</strong> and move all its student submissions to <strong className="text-red-700">Trash</strong>.
            </p>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>7-Day Retention Notice:</strong> This item will be kept in your profile Trash module for 7 days before being automatically purged forever.
              </span>
            </div>

            {/* Sudo phrase prompt */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                To confirm deletion, please type the phrase below:
              </label>

              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <code className="text-xs font-mono font-bold text-slate-800 select-all">
                  {expectedPhrase}
                </code>
                <span className="text-[10px] text-slate-400 font-medium">Exact match</span>
              </div>

              <input
                type="text"
                value={confirmPhraseInput}
                onChange={(e) => setConfirmPhraseInput(e.target.value)}
                placeholder={`Type "${expectedPhrase}"`}
                autoFocus
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-semibold transition-all focus:bg-white focus:outline-hidden ${
                  isPhraseMatched
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800"
                    : confirmPhraseInput.length > 0
                    ? "border-amber-400 ring-2 ring-amber-400/20 text-slate-800"
                    : "border-slate-200 text-slate-800"
                }`}
              />

              <div className="flex items-center justify-between text-[11px] pt-1">
                {isPhraseMatched ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Phrase matched! You can now confirm.</span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Type the phrase exactly to unlock the delete button.
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSudoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isPhraseMatched}
                onClick={handleConfirmMoveToTrash}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all ${
                  isPhraseMatched
                    ? "bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md shadow-red-500/20 cursor-pointer"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move Form to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
