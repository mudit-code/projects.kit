"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Calendar,
  Hash,
  Layers,
  Save,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { RoleType } from "@/lib/auth";

export interface StudentProfileData {
  name: string;
  course: string;
  stream: string;
  year: string;
  section: string;
  rollNo: string;
  afn: string;
  session: string;
  email: string;
}

export const DEFAULT_STUDENT_PROFILE: StudentProfileData = {
  name: "Aashutosh Verma",
  course: "B.Tech",
  stream: "Computer Science & Engineering",
  year: "4th Year",
  section: "A",
  rollNo: "2301650100001",
  afn: "232451",
  session: "2023-27",
  email: "232451@kit.ac.in",
};

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleType;
  onSave?: (updated: StudentProfileData) => void;
}

const COURSES = ["B.Tech", "MCA", "M.Tech", "BBA", "MBA"];
const STREAMS = ["CSE", "CSE (AI/ML)", "IT", "BT", "ECE", "ME", "EEE"];
const YEARS = ["1st", "2nd", "3rd", "4th"];
const SECTIONS = ["A", "B", "C", "D", "E", "F"];

export function EditProfileModal({
  isOpen,
  onClose,
  role,
  onSave,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<StudentProfileData>(DEFAULT_STUDENT_PROFILE);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kit_student_profile");
      if (stored) {
        setFormData(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof StudentProfileData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // If AFN changes, update email prefix if it was standard
      ...(field === "afn" && prev.email.endsWith("@kit.ac.in")
        ? { email: `${value.toLowerCase()}@kit.ac.in` }
        : {}),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("kit_student_profile", JSON.stringify(formData));
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    if (onSave) {
      onSave(formData);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F6F5F2] border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D3481] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {formData.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "TS"}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#10334A] leading-tight">
                User Profile Details
              </h2>
              <p className="text-xs text-slate-500">
                View and edit your personal academic profile records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Profile details updated successfully!</span>
            </div>
          )}

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#0D3481]" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#0D3481]" />
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>
          </div>

          {/* Course & Stream */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#0D3481]" />
                Course
              </label>
              <select
                value={formData.course}
                onChange={(e) => handleChange("course", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#0D3481]" />
                Stream / Branch
              </label>
              <select
                value={formData.stream}
                onChange={(e) => handleChange("stream", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
              >
                {STREAMS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Year & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#0D3481]" />
                Year
              </label>
              <select
                value={formData.year}
                onChange={(e) => handleChange("year", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} Year
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D3481]" />
                Section
              </label>
              <select
                value={formData.section}
                onChange={(e) => handleChange("section", e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] cursor-pointer"
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roll Number & AFN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#0D3481]" />
                Roll Number
              </label>
              <input
                type="text"
                required
                value={formData.rollNo}
                onChange={(e) => handleChange("rollNo", e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#0D3481]" />
                AFN (Admission Form No)
              </label>
              <input
                type="text"
                required
                value={formData.afn}
                onChange={(e) => handleChange("afn", e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>
          </div>

          {/* Academic Session */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0D3481]" />
              Academic Session / Batch
            </label>
            <input
              type="text"
              required
              value={formData.session}
              onChange={(e) => handleChange("session", e.target.value)}
              placeholder="e.g. 2023-27"
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D3481] hover:bg-[#0b2b6b] text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
