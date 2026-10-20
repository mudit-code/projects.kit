"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  User,
  Hash,
  BookOpen,
} from "lucide-react";
import { DynamicSelect } from "@/components/DynamicSelect";

export interface StudentRecord {
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
}

interface RequestRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAfn: string;
  onRequestSubmitted: (student: StudentRecord) => void;
}

const COURSES = [
  { value: "B.Tech", label: "B.Tech", description: "Bachelor of Technology" },
  { value: "MCA", label: "MCA", description: "Master of Computer Applications" },
  { value: "M.Tech", label: "M.Tech", description: "Master of Technology" },
];

const STREAMS = [
  {
    value: "Computer Science & Engineering",
    label: "CSE",
    description: "Computer Science & Engineering",
  },
  {
    value: "Computer Science (AI & ML)",
    label: "CS (AIML)",
    description: "Computer Science & Engineering (AI & ML)",
  },
  {
    value: "Information Technology",
    label: "IT",
    description: "Information Technology",
  },
  {
    value: "Electronics & Communication",
    label: "ECE",
    description: "Electronics & Communication Engineering",
  },
  {
    value: "Mechanical Engineering",
    label: "ME",
    description: "Mechanical Engineering",
  },
  {
    value: "Biotechnology",
    label: "BT",
    description: "Biotechnology",
  },
];

const YEARS = ["4th Year", "3rd Year", "2nd Year", "1st Year"];
const SECTIONS = ["A", "B", "C"];

export function RequestRecordModal({
  isOpen,
  onClose,
  initialAfn,
  onRequestSubmitted,
}: RequestRecordModalProps) {
  const [afn, setAfn] = useState(initialAfn || "");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [course, setCourse] = useState("B.Tech");
  const [stream, setStream] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("4th Year");
  const [section, setSection] = useState("A");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [gender, setGender] = useState("Male");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<StudentRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAfn(initialAfn || "");
      setError("");
      setSubmittedSuccess(false);
      setCreatedStudent(null);
    }
  }, [isOpen, initialAfn]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAfn = afn.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanRoll = rollNumber.trim();
    const cleanEmail = email.trim();

    if (!cleanAfn) {
      setError("Please enter your Academic File Number (AFN).");
      return;
    }
    if (!cleanName) {
      setError("Please enter your Full Name.");
      return;
    }
    if (!cleanRoll) {
      setError("Please enter your University Roll Number.");
      return;
    }
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    setTimeout(() => {
      const newStudent: StudentRecord = {
        id: Date.now(),
        name: cleanName,
        afn: cleanAfn,
        rollNumber: cleanRoll,
        email: cleanEmail,
        year,
        batch: "2026-27",
        course,
        section,
        stream,
        gender,
      };

      // 1. Record the request in localStorage
      try {
        const existingRequests = JSON.parse(
          localStorage.getItem("kit_student_record_requests") || "[]"
        );
        existingRequests.unshift({
          ...newStudent,
          whatsapp: whatsapp.trim(),
          reason: reason.trim(),
          status: "pending_verification",
          requestedAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "kit_student_record_requests",
          JSON.stringify(existingRequests)
        );
      } catch {}

      // 2. Also register in local custom students list so student can immediately register
      try {
        const customStudents: StudentRecord[] = JSON.parse(
          localStorage.getItem("kit_custom_students") || "[]"
        );
        const idx = customStudents.findIndex(
          (s) => s.afn.toUpperCase() === cleanAfn
        );
        if (idx >= 0) {
          customStudents[idx] = newStudent;
        } else {
          customStudents.push(newStudent);
        }
        localStorage.setItem(
          "kit_custom_students",
          JSON.stringify(customStudents)
        );
      } catch {}

      setIsSubmitting(false);
      setCreatedStudent(newStudent);
      setSubmittedSuccess(true);
    }, 400);
  };

  const handleProceed = () => {
    if (createdStudent) {
      onRequestSubmitted(createdStudent);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-record-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-6 sm:p-7 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative text-left"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccess ? (
          /* ─── Success Confirmation Screen ─── */
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#10334A]">
              Record Request Submitted!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Your details for AFN <strong className="text-slate-800">{afn}</strong> have been recorded for faculty verification.
            </p>

            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
              <div>
                <strong className="text-slate-800">Student:</strong> {name}
              </div>
              <div>
                <strong className="text-slate-800">Roll No:</strong> {rollNumber}
              </div>
              <div>
                <strong className="text-slate-800">Program:</strong> {course} &bull; {stream} ({year})
              </div>
              <div>
                <strong className="text-slate-800">Email:</strong> {email}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-2.5 px-4 bg-[#0D3481] hover:bg-[#0A2761] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#0D3481]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Project Registration</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ─── Request Form ─── */
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-[#0D3481]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="request-record-title"
                  className="text-lg font-bold text-[#10334A] leading-tight"
                >
                  Request to Add Your Record
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit your details to request addition to the projects.kit registry.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* AFN & Roll Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    Academic File Number (AFN) *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={afn}
                      onChange={(e) => setAfn(e.target.value)}
                      required
                      placeholder="e.g. 232451"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    University Roll Number *
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    placeholder="e.g. 2201650100045"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#10334A] mb-1">
                  Full Student Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Rohit Sharma"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Course & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    Course
                  </label>
                  <DynamicSelect
                    label="Course"
                    value={course}
                    onChange={setCourse}
                    options={COURSES}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    Branch / Stream
                  </label>
                  <DynamicSelect
                    label="Branch / Stream"
                    value={stream}
                    onChange={setStream}
                    options={STREAMS}
                  />
                </div>
              </div>

              {/* Year, Section & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#10334A] mb-1">
                    Year
                  </label>
                  <DynamicSelect
                    label="Year"
                    value={year}
                    onChange={setYear}
                    options={YEARS}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10334A] mb-1">
                    Section
                  </label>
                  <DynamicSelect
                    label="Section"
                    value={section}
                    onChange={setSection}
                    options={SECTIONS.map((sec) => ({
                      value: sec,
                      label: `Section ${sec}`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10334A] mb-1">
                    Gender
                  </label>
                  <DynamicSelect
                    label="Gender"
                    value={gender}
                    onChange={setGender}
                    options={["Male", "Female", "Other"]}
                  />
                </div>
              </div>

              {/* Institutional Email & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="student@kit.ac.in"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10334A] mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Reason / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Reason for Request (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Lateral entry student / branch transfer"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0D3481] hover:bg-[#0A2761] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#0D3481]/20 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Submit Record Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestRecordModal;
