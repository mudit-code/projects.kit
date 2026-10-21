"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  User,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { MobileAppBar } from "../patterns/MobileAppBar";
import { Stepper } from "../patterns/Stepper";
import { StickyActionBar } from "../patterns/StickyActionBar";
import { FilePicker } from "../patterns/FilePicker";
import { saveFormDraft, getFormDraft, clearFormDraft } from "@/lib/pwa/offlineDrafts";

export interface StudentFormFocusFlowProps {
  form: any;
  student: any;
  onBack: () => void;
  onSubmitSuccess: (submission: any) => void;
}

export function StudentFormFocusFlow({
  form,
  student,
  onBack,
  onSubmitSuccess,
}: StudentFormFocusFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [registrationType, setRegistrationType] = useState<"individual" | "group">("individual");
  const [whatsapp, setWhatsapp] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [teamMembers, setTeamMembers] = useState<Array<{ afn: string; name: string; rollNumber?: string }>>([]);
  const [fileStatus, setFileStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [fileProgress, setFileProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState("");

  const steps = [
    { id: "details", label: "Project Details" },
    { id: "team", label: "Team Members" },
    { id: "review", label: "Review & Submit" },
  ];

  // Load existing draft from IndexedDB on mount
  useEffect(() => {
    async function loadDraft() {
      const draft = await getFormDraft(form.id);
      if (draft && draft.data) {
        const d = draft.data;
        if (d.registrationType) setRegistrationType(d.registrationType);
        if (d.whatsapp) setWhatsapp(d.whatsapp);
        if (d.projectName) setProjectName(d.projectName);
        if (d.projectDescription) setProjectDescription(d.projectDescription);
        if (Array.isArray(d.teamMembers)) setTeamMembers(d.teamMembers);
        if (d.selectedFileName) {
          setSelectedFileName(d.selectedFileName);
          setFileStatus("success");
          setFileProgress(100);
        }
      }
    }
    loadDraft();
  }, [form.id]);

  // Autosave draft on every change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormDraft(form.id, {
        registrationType,
        whatsapp,
        projectName,
        projectDescription,
        teamMembers,
        selectedFileName,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [form.id, registrationType, whatsapp, projectName, projectDescription, teamMembers, selectedFileName]);

  // Add team member
  const addTeamMember = () => {
    if (teamMembers.length < 4) {
      setTeamMembers([...teamMembers, { afn: "", name: "" }]);
    }
  };

  // Remove team member
  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  // Fetch team member name via AFN
  const handleAfnBlur = async (index: number, afnVal: string) => {
    const trimmed = afnVal.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`/api/students/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) {
          const updated = [...teamMembers];
          updated[index] = {
            afn: trimmed,
            name: data.name,
            rollNumber: data.rollNumber || "",
          };
          setTeamMembers(updated);
        }
      }
    } catch {}
  };

  // Step validation
  const validateStep = (stepIndex: number): boolean => {
    setErrorMessage("");
    if (stepIndex === 0) {
      if (!projectName.trim()) {
        setErrorMessage("Please enter a project title.");
        return false;
      }
      if (!whatsapp.trim() || whatsapp.trim().length < 10) {
        setErrorMessage("Please enter a valid 10-digit WhatsApp number.");
        return false;
      }
      if (!projectDescription.trim()) {
        setErrorMessage("Please provide a brief project description.");
        return false;
      }
      return true;
    }

    if (stepIndex === 1) {
      if (registrationType === "group") {
        if (teamMembers.length === 0) {
          setErrorMessage("Please add at least one team member or select Individual registration.");
          return false;
        }
        for (const mem of teamMembers) {
          if (!mem.afn.trim()) {
            setErrorMessage("Please enter valid AFNs for all added team members.");
            return false;
          }
        }
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const submissionPayload = {
        formId: form.id,
        formTitle: form.title,
        subjectCode: form.subjectCode,
        student: {
          afn: student.afn,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          branch: student.branch || student.stream,
          year: student.year,
          section: student.section,
        },
        registrationType,
        whatsapp: whatsapp.trim(),
        projectName: projectName.trim(),
        projectDescription: projectDescription.trim(),
        teamMembers,
        reportFileName: selectedFileName || "Synopsis_Report.pdf",
        submittedAt: new Date().toISOString(),
        verificationStatus: "pending",
        approvalStatus: "pending",
      };

      // Save to localStorage submissions registry
      try {
        const stored = JSON.parse(localStorage.getItem("kit_public_submissions") || "{}");
        const list = stored[form.id] || [];
        // Replace if already exists or push
        const filtered = list.filter((s: any) => s.student?.afn !== student.afn);
        filtered.push(submissionPayload);
        stored[form.id] = filtered;
        localStorage.setItem("kit_public_submissions", JSON.stringify(stored));
        window.dispatchEvent(new Event("kit-submissions-change"));
      } catch {}

      // Clear draft after successful submission
      await clearFormDraft(form.id);

      // Trigger PWA install prompt after student's first successful submission
      if (typeof window !== "undefined" && window.triggerPwaInstall) {
        window.triggerPwaInstall();
      }

      onSubmitSuccess(submissionPayload);
    } catch {
      setErrorMessage("Failed to submit registration. Please check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Smooth auto-scroll focused input into center of scrollable form viewport
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F6F5F2] dark:bg-slate-950">
      {/* Fixed Top Header + Stepper */}
      <div className="shrink-0 z-30">
        <MobileAppBar
          title={form.subjectCode || "Registration"}
          subtitle={form.title}
          onBack={handlePrev}
          showFullscreenToggle
        />

        {/* Stepper progress */}
        <div className="bg-white dark:bg-slate-900 border-b border-neutral-200/80 dark:border-slate-800">
          <Stepper steps={steps} currentStepIndex={currentStep} />
        </div>
      </div>

      {/* Scrollable Form Content ONLY — smoothly navigate through input boxes */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 space-y-4 max-w-md mx-auto w-full pb-44"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ═══ STEP 1: Project Details ═══ */}
        {currentStep === 0 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Auto-filled Student Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B2A6F] dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Student Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">AFN</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{student.afn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Roll No</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{student.rollNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Section / Year</span>
                  <span className="text-slate-700 dark:text-slate-300">{student.section} • Year {student.year}</span>
                </div>
              </div>
            </div>

            {/* Registration Type Selection */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Registration Type
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType("individual");
                    setTeamMembers([]);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                    registrationType === "individual"
                      ? "border-[#0B2A6F] bg-blue-50/60 dark:bg-blue-950/40 text-[#0B2A6F] dark:text-blue-400 font-bold ring-1 ring-[#0B2A6F]/20"
                      : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      registrationType === "individual"
                        ? "border-[#0B2A6F] dark:border-blue-400 bg-white dark:bg-slate-900"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {registrationType === "individual" && (
                      <span className="w-2 h-2 rounded-full bg-[#0B2A6F] dark:bg-blue-400" />
                    )}
                  </span>
                  <User className="w-3.5 h-3.5" />
                  <span>Individual</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegistrationType("group");
                    if (teamMembers.length === 0) setTeamMembers([{ afn: "", name: "" }]);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                    registrationType === "group"
                      ? "border-[#0B2A6F] bg-blue-50/60 dark:bg-blue-950/40 text-[#0B2A6F] dark:text-blue-400 font-bold ring-1 ring-[#0B2A6F]/20"
                      : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      registrationType === "group"
                        ? "border-[#0B2A6F] dark:border-blue-400 bg-white dark:bg-slate-900"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {registrationType === "group" && (
                      <span className="w-2 h-2 rounded-full bg-[#0B2A6F] dark:bg-blue-400" />
                    )}
                  </span>
                  <Users className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
              </div>
            </div>

            {/* Project Title */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="e.g. Smart IoT Grid Monitoring"
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B2A6F]/20 focus:border-[#0B2A6F]"
              />
            </div>

            {/* WhatsApp */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                WhatsApp Contact <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                onFocus={handleInputFocus}
                placeholder="10-digit mobile number"
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-[16px] sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B2A6F]/20 focus:border-[#0B2A6F]"
              />
            </div>

            {/* Description */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Objectives & Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Describe your project idea and main problem solved..."
                className="w-full p-3.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-[16px] sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B2A6F]/20 focus:border-[#0B2A6F] resize-none"
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Team Members ═══ */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {registrationType === "individual" ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 text-center space-y-2">
                <User className="w-8 h-8 text-[#0B2A6F] dark:text-blue-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Individual Registration</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  You are registered as the sole author of this project. Proceed to synopsis upload and final review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Team Members ({teamMembers.length + 1} total)
                  </span>
                  {teamMembers.length < 4 && (
                    <button
                      type="button"
                      onClick={addTeamMember}
                      className="text-xs font-bold text-[#0B2A6F] dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>

                {/* Leader (Current Student) */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">Team Leader</span>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{student.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{student.afn} • {student.rollNumber}</div>
                  </div>
                </div>

                {/* Additional members */}
                {teamMembers.map((mem, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200 dark:border-slate-800 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Member {idx + 2}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        aria-label="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit AFN"
                        value={mem.afn}
                        onChange={(e) => {
                          const updated = [...teamMembers];
                          updated[idx] = { ...updated[idx], afn: e.target.value.replace(/\D/g, "") };
                          setTeamMembers(updated);
                        }}
                        onBlur={(e) => handleAfnBlur(idx, e.target.value)}
                        onFocus={handleInputFocus}
                        className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-[16px] sm:text-xs font-mono text-slate-900 dark:text-white"
                      />
                      {mem.name && (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
                          ✓ {mem.name} {mem.rollNumber ? `(${mem.rollNumber})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Synopsis & Review ═══ */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* File Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Project Synopsis Document (Optional)
              </label>
              <FilePicker
                label="Upload Synopsis (PDF / DOCX)"
                progress={fileProgress}
                status={fileStatus}
                onFileSelect={(file) => {
                  setSelectedFileName(file.name);
                  setFileStatus("uploading");
                  setFileProgress(25);
                  setTimeout(() => setFileProgress(75), 250);
                  setTimeout(() => {
                    setFileProgress(100);
                    setFileStatus("success");
                  }, 500);
                }}
                onFileRemove={() => {
                  setSelectedFileName("");
                  setFileStatus("idle");
                  setFileProgress(0);
                }}
              />
            </div>

            {/* Submission Summary Card */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/90 dark:border-slate-800 shadow-xs space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs border-b border-neutral-100 dark:border-slate-800 pb-2">
                Summary of Registration
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-400">Initiative</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{form.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Project Title</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{registrationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WhatsApp</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{whatsapp}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar with Visual Viewport Keyboard Handling */}
      <StickyActionBar
        primaryLabel={currentStep === steps.length - 1 ? "Submit Project Registration" : "Next Step"}
        onPrimaryClick={handleNext}
        primaryLoading={submitting}
        secondaryLabel={currentStep > 0 ? "Previous" : "Cancel"}
        onSecondaryClick={handlePrev}
      />
    </div>
  );
}
