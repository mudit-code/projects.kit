"use client";

import { useState } from "react";
import {
  ShieldCheck,
  UserCog,
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Eye,
  SlidersHorizontal,
  KeyRound,
  FileCheck2,
  FolderGit2
} from "lucide-react";
import { getActiveSession, saveActiveSession, ROLE_DATA, RoleType, ROLE_PERMISSIONS } from "@/lib/auth";

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  designation: string;
  assignedRole: RoleType;
  cohort: string;
  assignedSections: string[];
  status: "Active" | "Pending Review";
  canEvaluate: boolean;
  canReviewSubmissions: boolean;
}

const INITIAL_FACULTY: FacultyMember[] = [
  {
    id: "fac-1",
    name: "Dr. A. Sharma",
    email: "coordinator@kit.ac.in",
    designation: "Associate Professor",
    assignedRole: "COORDINATOR",
    cohort: "B.Tech CSE · 4th Year",
    assignedSections: ["A", "B"],
    status: "Active",
    canEvaluate: true,
    canReviewSubmissions: true,
  },
  {
    id: "fac-2",
    name: "Prof. R. K. Verma",
    email: "rk.verma@kit.ac.in",
    designation: "Assistant Professor",
    assignedRole: "COORDINATOR",
    cohort: "B.Tech CSE (AI & ML) · 4th Year",
    assignedSections: ["C"],
    status: "Active",
    canEvaluate: true,
    canReviewSubmissions: true,
  },
  {
    id: "fac-3",
    name: "Dr. Neha Gupta",
    email: "neha.gupta@kit.ac.in",
    designation: "Professor",
    assignedRole: "COORDINATOR",
    cohort: "B.Tech IT · 3rd Year",
    assignedSections: ["A"],
    status: "Active",
    canEvaluate: true,
    canReviewSubmissions: true,
  },
  {
    id: "fac-4",
    name: "Er. Manish Patel",
    email: "m.patel@kit.ac.in",
    designation: "Assistant Professor",
    assignedRole: "COORDINATOR",
    cohort: "B.Tech CSE · 3rd Year",
    assignedSections: ["B", "D"],
    status: "Active",
    canEvaluate: false,
    canReviewSubmissions: true,
  },
];

const ROUTE_SECURITY_MATRIX = [
  {
    path: "/",
    label: "Dashboard Home",
    description: "Welcome banner, batch analytics, quick links",
    hodAccess: "Full Department Admin",
    coordAccess: "Assigned Project View",
    hodAllowed: true,
    coordAllowed: true,
  },
  {
    path: "/forms",
    label: "Departmental Forms",
    description: "Capstone & mini-project lifecycle forms registry",
    hodAccess: "Publish & Oversee",
    coordAccess: "Review & Evaluate",
    hodAllowed: true,
    coordAllowed: true,
  },
  {
    path: "/students",
    label: "Student Directory",
    description: "348 enrolled student roster and academic records",
    hodAccess: "Full Enrolled Directory",
    coordAccess: "Assigned Cohort Roster",
    hodAllowed: true,
    coordAllowed: true,
  },
  {
    path: "/projects",
    label: "Project Directory",
    description: "Capstone archive, synopsis, and dossiers",
    hodAccess: "Department-wide Archive",
    coordAccess: "Assigned Evaluations",
    hodAllowed: true,
    coordAllowed: true,
  },
  {
    path: "/projects/new",
    label: "Start / Publish Project",
    description: "Initiate semester-wise academic & non-academic workflows",
    hodAccess: "Authorized (HOD Exclusive)",
    coordAccess: "Restricted (403 Forbidden)",
    hodAllowed: true,
    coordAllowed: false,
  },
  {
    path: "/roles",
    label: "Manage Roles & Governance",
    description: "Role assignments, RBAC policies, and faculty permissions",
    hodAccess: "Authorized (HOD Exclusive)",
    coordAccess: "Restricted (403 Forbidden)",
    hodAllowed: true,
    coordAllowed: false,
  },
];

export default function RolesPage() {
  const [session, setSession] = useState(() => getActiveSession());
  const [facultyList, setFacultyList] = useState<FacultyMember[]>(INITIAL_FACULTY);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"matrix" | "roster">("matrix");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulateCoordinator = () => {
    const coordData = ROLE_DATA.COORDINATOR;
    saveActiveSession({
      role: "COORDINATOR",
      email: coordData.email,
      name: coordData.name,
      dept: coordData.dept,
    });
    window.location.href = "/";
  };

  const toggleEvaluationPermission = (id: string) => {
    setFacultyList((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, canEvaluate: !f.canEvaluate } : f
      )
    );
    showToast("Faculty evaluation privilege updated successfully.");
  };

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cohort.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-[#F6F5F2] border border-slate-200/90 rounded-3xl shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -translate-y-20 translate-x-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white text-[#0D3481] border border-slate-200/80 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Campus RBAC Security &bull; Separation of Duties</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#10334A] flex items-center gap-3">
              <UserCog className="w-7 h-7 text-[#0D3481]" />
              Role Management &amp; Route Security
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              Configure access policies for Kanpur Institute of Technology. Enforce strict route authorization between the <strong className="text-[#0D3481]">Head of Department (HOD)</strong> and <strong className="text-[#0D3481]">Faculty Coordinators</strong>.
            </p>
          </div>

          {/* Quick Simulation / Test Control */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleSimulateCoordinator}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
              title="Switch session to test restricted coordinator view"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0D3481] group-hover:rotate-180 transition-transform duration-300" />
              <span>Test as Coordinator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Department Admin
          </div>
          <div className="text-xl font-black text-[#10334A] flex items-center gap-2">
            <span>Rahul Singh</span>
          </div>
          <p className="text-[11px] text-[#0D3481] font-semibold mt-0.5">Head of Department (HOD)</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Coordinators
          </div>
          <div className="text-xl font-black text-[#10334A]">
            {facultyList.length} Faculty
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Assigned to 4 Cohorts</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Protected Routes
          </div>
          <div className="text-xl font-black text-[#10334A]">
            2 HOD-Only
          </div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">/roles &amp; /projects/new</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Enforcement Tier
          </div>
          <div className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <span>Dual-Layer</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Server Proxy + Layout Guard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 text-xs sm:text-sm font-extrabold cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "matrix"
              ? "border-[#0D3481] text-[#0D3481]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Role Security Matrix &amp; Route Permissions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`pb-3 text-xs sm:text-sm font-extrabold cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "roster"
              ? "border-[#0D3481] text-[#0D3481]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty &amp; Coordinator Roster ({facultyList.length})</span>
        </button>
      </div>

      {/* TAB 1: ROLE SECURITY MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#10334A]">
                  Institutional Route Permission Matrix
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed access control breakdown enforced across server-side proxy and client-side route guards.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  <Lock className="w-3.5 h-3.5" /> Restricted (403)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Route Path</th>
                    <th className="py-3 px-4">Module Name</th>
                    <th className="py-3 px-4">HOD Access</th>
                    <th className="py-3 px-4">Faculty Coordinator Access</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ROUTE_SECURITY_MATRIX.map((item) => (
                    <tr key={item.path} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0D3481]">
                        {item.path}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.label}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{item.description}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0D3481] font-bold border border-blue-200/60 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0D3481]" />
                          <span>{item.hodAccess}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.coordAllowed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.coordAccess}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200/60 text-[11px]">
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span>{item.coordAccess}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.coordAllowed ? (
                          <span className="text-[11px] font-bold text-slate-600">Dual Role</span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            HOD Privilege
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Architecture Explanatory Box */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D3481]" />
              <span>Multi-Layer Route Security Architecture</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <strong className="text-[#10334A] block mb-1">1. Server-Side Proxy (`src/proxy.ts`):</strong>
                Runs on the Next.js Edge proxy layer before components render. Verifies the institutional session cookie (<code className="text-[#0D3481] bg-blue-50 px-1 py-0.5 rounded">kit_user_session</code>). Redirects unauthenticated visitors to institutional sign-in and rejects coordinator access to administrative endpoints.
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <strong className="text-[#10334A] block mb-1">2. Client-Side Layout Guard (`layout.tsx`):</strong>
                Continuously checks active local storage and dispatched auth events. If a user navigates to a restricted route client-side, it seamlessly presents the official KIT 403 Access Denied interface without visual glitches or unauthorized data exposure.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY & COORDINATOR ROSTER */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search faculty by name, email, or cohort..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481] transition-all"
              />
            </div>

            <div className="text-xs text-slate-500 font-semibold self-center sm:self-auto">
              Showing <span className="font-bold text-slate-800">{filteredFaculty.length}</span> assigned faculty
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Assigned Cohort</th>
                    <th className="py-3 px-4">Sections</th>
                    <th className="py-3 px-4">Evaluation Rights</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFaculty.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{member.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{member.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {member.designation}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {member.cohort}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1">
                          {member.assignedSections.map((sec) => (
                            <span
                              key={sec}
                              className="w-5 h-5 rounded-md bg-blue-50 text-[#0D3481] border border-blue-200 text-[10px] font-extrabold flex items-center justify-center"
                            >
                              {sec}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleEvaluationPermission(member.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            member.canEvaluate
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {member.canEvaluate ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Evaluator Enabled</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Only</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => showToast(`Permissions configured for ${member.name}.`)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
