"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { 
  PanelLeft, 
  LayoutDashboard, 
  FolderGit2, 
  Users, 
  Milestone, 
  FileCheck2, 
  Menu, 
  X, 
  ShieldCheck, 
  Award, 
  ChevronDown, 
  UserCog, 
  FileText,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { useLoading } from "@/components/PageLoadingProvider";
import { KitScreenLoader } from "@/components/KitScreenLoader";
import { getActiveSession } from "@/lib/auth";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { getCleanTrashForms } from "@/lib/trashForms";
import { FacultyHodMobileApp } from "@/components/mobile/admin/FacultyHodMobileApp";

export type RoleType = "HOD" | "COORDINATOR";

export const ROLE_LABELS: Record<RoleType, string> = {
  HOD: "HOD",
  COORDINATOR: "Faculty"
};

export const ROLE_PROFILES: Record<RoleType, { name: string; email: string; initial: string; role: string; dept: string }> = {
  HOD: {
    name: "Rahul Singh",
    email: "muditcodes@gmail.com",
    initial: "RS",
    role: "Head of Department (HOD)",
    dept: "Dept. of Computer Science & Engineering"
  },
  COORDINATOR: {
    name: "Dr. A. Sharma",
    email: "coordinator@kit.ac.in",
    initial: "AS",
    role: "Faculty (Project Coordinator)",
    dept: "Dept. of Computer Science"
  }
};

const NavLink = ({ 
  href, 
  icon: Icon, 
  label, 
  badge,
  isSidebarOpen, 
  setIsMobileMenuOpen 
}: any) => {
  const pathname = usePathname();
  const isActive = (href === "/hod" || href === "/coordinator" || href === "/") 
    ? pathname === href
    : (pathname === href || (pathname ? pathname.startsWith(href + "/") : false));

  return (
    <div className={`group relative ${isSidebarOpen ? 'w-full' : 'w-full flex justify-center'}`}>
      <Link 
        href={href} 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center transition-all bg-white shadow-sm hover:shadow ${
          isActive 
            ? 'text-[#0D3481] border-2 border-[#0D3481] font-bold' 
            : 'text-[#10334A] hover:text-[#0D3481] border-2 border-transparent hover:border-slate-200/80 font-bold'
        } ${
          isSidebarOpen 
            ? 'w-full p-3 rounded-xl justify-start' 
            : 'w-11 h-11 rounded-xl justify-center'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        <span className={`font-bold ml-3 text-sm ${!isSidebarOpen && 'hidden'}`}>{label}</span>
        {badge && isSidebarOpen && (
          <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-[#0D3481]">
            {badge}
          </span>
        )}
      </Link>
      {!isSidebarOpen && (
        <div className="hidden md:block absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md z-50">
          {label}
        </div>
      )}
    </div>
  );
};

export function DashboardLayoutClient({ 
  children,
  initialRole,
}: { 
  children: React.ReactNode;
  initialRole?: RoleType;
}) {
  const { isDashboardTabLoading, isNavComplete, dismissNavLoader } = useLoading();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType>(initialRole || "HOD");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const [profileDetails, setProfileDetails] = useState({
    name: ROLE_PROFILES[initialRole || "HOD"].name,
    email: ROLE_PROFILES[initialRole || "HOD"].email,
    phone: "+91 98765 43210",
    role: ROLE_PROFILES[initialRole || "HOD"].role
  });

  const [trashedCount, setTrashedCount] = useState(0);

  useEffect(() => {
    const updateTrashCount = () => {
      const items = getCleanTrashForms();
      setTrashedCount(items.length);
    };
    updateTrashCount();
    window.addEventListener("kit-trash-change", updateTrashCount);
    return () => window.removeEventListener("kit-trash-change", updateTrashCount);
  }, []);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "";

  // Contextual back button for nested routes
  const backLink = useMemo(() => {
    if (!pathname) return null;
    if (pathname === "/hod/settings") {
      return { href: "/hod", label: "Dashboard" };
    }
    if (pathname === "/coordinator/settings") {
      return { href: "/coordinator", label: "Dashboard" };
    }
    if (pathname.startsWith("/hod/forms/") && pathname !== "/hod/forms") {
      return { href: "/hod/forms", label: "Published Forms" };
    }
    if (pathname.startsWith("/coordinator/forms/") && pathname !== "/coordinator/forms") {
      return { href: "/coordinator/forms", label: "Published Forms" };
    }
    if (pathname.endsWith("/projects/new")) {
      return {
        href: pathname.startsWith("/coordinator") ? "/coordinator/forms" : "/hod/forms",
        label: "Forms",
      };
    }
    return null;
  }, [pathname]);
  useEffect(() => {
    const syncRole = () => {
      const session = getActiveSession();
      if (!session && !initialRole) {
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/" &&
          window.location.pathname !== "/login" &&
          !window.location.pathname.startsWith("/admin")
        ) {
          window.location.href = "/";
        }
        return;
      }
      const roleToUse: RoleType = (session?.role as RoleType) || initialRole || "HOD";
      setCurrentRole(roleToUse);
      const prof = ROLE_PROFILES[roleToUse];
      if (prof) {
        setProfileDetails(prev => ({
          ...prev,
          name: session?.name || prof.name,
          email: session?.email || prof.email,
          role: prof.role
        }));
      }
    };

    syncRole();
    window.addEventListener("kit-auth-change", syncRole);
    window.addEventListener("storage", syncRole);
    return () => {
      window.removeEventListener("kit-auth-change", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, [initialRole]);

  // Resize handling matching udyam sandhi
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const clientX = e.clientX;
      if (clientX < 190) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
        const newWidth = Math.min(clientX, 500);
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current && 
        !profileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest?.('#logout-modal')
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const dynamicInitial = profileDetails.name
    ? profileDetails.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : ROLE_PROFILES[currentRole].initial;

  return (
    <>
      {/* ── Native Mobile App (< 768px): Faculty/HOD MobileShell ── */}
      <div className="block md:hidden w-full h-[100dvh] overflow-hidden">
        <FacultyHodMobileApp role={currentRole} />
      </div>

      {/* ── Desktop Dashboard Layout (≥ 768px) ── */}
      <div className="hidden md:flex h-screen bg-slate-50 overflow-hidden relative w-full">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Desktop static + Mobile Off-canvas Drawer */}
      <aside 
        className={`
          fixed md:relative top-0 bottom-0 left-0 z-50 md:z-20
          bg-[#F6F5F2] border-r border-slate-200 shadow-2xl md:shadow-xl md:shadow-slate-200/50 
          text-[#10334A] flex flex-col h-full shrink-0
          ${!isResizing ? 'transition-all duration-300 ease-in-out' : ''}
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${!isSidebarOpen && !isMobileMenuOpen ? 'md:w-20' : ''}
        `}
        style={{
          width: isSidebarOpen && !isMobileMenuOpen ? `${sidebarWidth}px` : undefined
        }}
      >
        {/* Top Header of Sidebar */}
        <div className={`h-16 flex items-center bg-[#F6F5F2] border-b border-slate-200 shrink-0 ${isSidebarOpen ? 'justify-between px-4 md:px-5 gap-3' : 'justify-center px-1.5 gap-1'}`}>
          <Logo 
            href={currentRole === "HOD" ? "/hod" : "/coordinator"} 
            onClick={() => setIsMobileMenuOpen(false)} 
            collapsed={!isSidebarOpen} 
          />
          
          {/* Close button on mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 md:hidden shrink-0"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

          {/* Collapse toggle on Desktop */}
          <div className="hidden md:flex items-center relative z-50 shrink-0">
            <button 
              onClick={() => {
                if (!isSidebarOpen && sidebarWidth < 220) {
                  setSidebarWidth(256);
                }
                setIsSidebarOpen(!isSidebarOpen);
              }}
              className={`${isSidebarOpen ? 'p-2' : 'p-1'} rounded-xl text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer`}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft size={isSidebarOpen ? 20 : 18} />
            </button>
          </div>
        </div>

        {/* Resize Handle Zone */}
        <div 
          className="absolute top-0 right-0 bottom-0 w-4 translate-x-1/2 z-50 group flex items-center justify-center cursor-col-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          {/* Edge drag resizer for Desktop */}
          <div 
            className={`hidden md:flex items-center justify-center w-5 h-10 bg-white border border-slate-200 shadow-sm rounded text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100 ${isResizing ? 'bg-slate-100 ring-2 ring-blue-500/20 text-[#0D3481] !opacity-100' : ''}`}
            title="Drag to resize sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 11l-3-3 3-3M11 11l3-3-3-3M8 2v12"/>
            </svg>
          </div>
        </div>

        {/* Main Nav Links */}
        <div className={`flex-1 overflow-visible ${isSidebarOpen ? 'p-6' : 'py-5 px-0'} flex flex-col items-center`}>
          {isSidebarOpen && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2 w-full">
              Main Menu
            </div>
          )}
          
          <nav className={`space-y-2.5 ${isSidebarOpen ? 'w-full' : 'w-full flex flex-col items-center'}`}>
            {currentRole === "HOD" ? (
              <>
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/hod" 
                  icon={LayoutDashboard} 
                  label="dashboard" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/hod/forms" 
                  icon={FileCheck2} 
                  label="forms" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/hod/roles" 
                  icon={UserCog} 
                  label="manage roles" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/hod/students" 
                  icon={Users} 
                  label="students" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/hod/projects" 
                  icon={FolderGit2} 
                  label="project dir" 
                />
              </>

            ) : (
              <>
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/coordinator" 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/coordinator/forms" 
                  icon={FileCheck2} 
                  label="forms" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/coordinator/students" 
                  icon={Users} 
                  label="students" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/coordinator/projects" 
                  icon={FolderGit2} 
                  label="project dir" 
                />
              </>
            )}
          </nav>
        </div>

        {/* Profile & Logout Button at Bottom of Sidebar */}
        <div className="relative z-50 mt-auto" ref={profileMenuRef}>
          <div 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`bg-white border-t border-slate-200 shrink-0 flex items-center cursor-pointer hover:bg-slate-50 transition-colors ${isSidebarOpen ? 'p-5 justify-start' : 'py-4 justify-center'}`}
          >
            {isSidebarOpen ? (
              <div className="flex items-center space-x-3 w-full min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-[#0D3481] shrink-0 shadow-sm border border-blue-200">
                  {dynamicInitial}
                </div>
                <div className="overflow-hidden min-w-0 flex-1 group relative">
                  <div className="text-sm font-bold text-[#10334A] truncate" title={profileDetails.name}>
                    {profileDetails.name}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 truncate" title={profileDetails.role}>
                    {profileDetails.role}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isProfileMenuOpen ? 'rotate-180 text-[#0D3481]' : ''}`} />
              </div>
            ) : (
              <div 
                className="group relative flex items-center justify-center cursor-pointer"
                title={`${profileDetails.name} · Options`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-[#0D3481] shadow-sm border border-blue-200">
                  {dynamicInitial}
                </div>
                <div className="absolute left-full ml-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow-md z-50">
                  {profileDetails.name}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-[#10334A] truncate">{profileDetails.name}</p>
                <p className="text-xs text-slate-500 truncate">{profileDetails.role}</p>
              </div>

              {/* Settings Option with Gear Icon - Opens as Page/Tab */}
              <Link
                href={currentRole === "HOD" ? "/hod/settings" : "/coordinator/settings"}
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0D3481] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </div>
                {trashedCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                    {trashedCount} trashed
                  </span>
                )}
              </Link>

              <div className="border-t border-slate-100 my-1" />

              <div onClick={() => setIsProfileMenuOpen(false)}>
                <LogoutButton className="w-full flex items-center px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full min-w-0 relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-4 sm:px-8 sticky top-0 z-10 shadow-2xs shrink-0 justify-between relative">
          {/* Top Left: Mobile Menu Toggle + Contextual Back Button */}
          <div className="flex items-center gap-2 z-10">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 mr-1 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden shrink-0 border border-slate-200 shadow-2xs cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>

            {backLink && (
              <Link
                href={backLink.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0D3481] hover:border-[#0D3481]/30 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title={`Back to ${backLink.label}`}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Back to {backLink.label.replace(/^Back to\s+/i, '')}</span>
              </Link>
            )}
          </div>

          {/* Center: Subtle Text for Role & Department */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-medium text-slate-500 pointer-events-none select-none text-center">
            <span className="font-semibold text-slate-700 tracking-tight">{ROLE_LABELS[currentRole]}</span>
            <span className="text-slate-300">·</span>
            <span className="hidden sm:inline text-slate-500">Department of Computer Science &amp; Engineering</span>
            <span className="sm:hidden text-slate-500">Dept. of CSE</span>
          </div>

          {/* Right: Clean alignment spacer */}
          <div className="w-8 shrink-0" />
        </header>

        <main className="flex-1 w-full bg-slate-50 overflow-x-hidden relative min-h-0 flex flex-col p-4 sm:px-8 sm:py-4">
          {isDashboardTabLoading && (
            <div 
              aria-label="Loading dashboard content"
              className="absolute inset-0 z-30 flex items-center justify-center bg-slate-50/85 backdrop-blur-xs transition-opacity duration-150"
            >
              <KitScreenLoader
                mode="heartbeat"
                fullScreen={false}
                showText={false}
                showProgressBar={true}
                isComplete={isNavComplete}
                onComplete={dismissNavLoader}
                transparent={true}
              />
            </div>
          )}
          <div className="max-w-7xl mx-auto w-full flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        role={currentRole}
        onSave={(updated) => {
          setProfileDetails(prev => ({
            ...prev,
            name: updated.name,
            email: updated.email,
            role: `Student (${updated.course} ${updated.stream} - ${updated.year} Year)`
          }));
        }}
      />


      </div>
    </>
  );
}
