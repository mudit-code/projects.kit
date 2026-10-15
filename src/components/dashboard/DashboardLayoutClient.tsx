"use client";

import { useState, useRef, useEffect } from "react";
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
  UserCog
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { useLoading } from "@/components/PageLoadingProvider";
import { KitScreenLoader } from "@/components/KitScreenLoader";
import { getActiveSession, saveActiveSession } from "@/lib/auth";

export type RoleType = "HOD" | "STUDENT" | "COORDINATOR";

export const ROLE_LABELS: Record<RoleType, string> = {
  HOD: "HOD",
  STUDENT: "Student",
  COORDINATOR: "Faculty"
};

export const ROLE_PROFILES: Record<RoleType, { name: string; email: string; initial: string; role: string; dept: string }> = {
  HOD: {
    name: "Rahul Singh",
    email: "hod@kit.ac.in",
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
  },
  STUDENT: {
    name: "Aarav Sharma",
    email: "student.lead@kit.ac.in",
    initial: "AS",
    role: "Student (Team Lead)",
    dept: "B.Tech Final Year (CSE)"
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
  const isActive = href === "/" || href === "/dashboard" 
    ? (pathname === "/" || pathname === "/dashboard")
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
  const { isDashboardTabLoading, isNavComplete } = useLoading();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleType>(initialRole || "HOD");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const [profileDetails, setProfileDetails] = useState({
    name: ROLE_PROFILES[initialRole || "HOD"].name,
    email: ROLE_PROFILES[initialRole || "HOD"].email,
    phone: "+91 98765 43210",
    role: ROLE_PROFILES[initialRole || "HOD"].role
  });

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Sync role from active session
  useEffect(() => {
    const session = getActiveSession();
    if (!session && !initialRole) {
      if (typeof window !== "undefined" && window.location.pathname !== "/" && window.location.pathname !== "/login") {
        window.location.href = "/";
      }
      return;
    }
    const roleToUse = initialRole || session?.role || "HOD";
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
      if (
        roleMenuRef.current && 
        !roleMenuRef.current.contains(event.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden relative">
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
        <div className={`h-16 md:h-20 flex items-center bg-[#F6F5F2] border-b border-slate-200 shrink-0 ${isSidebarOpen ? 'justify-between px-4 md:px-5 gap-3' : 'justify-center px-1.5 gap-1'}`}>
          <Logo 
            href="/" 
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
                  href="/" 
                  icon={LayoutDashboard} 
                  label="dashboard" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/roles" 
                  icon={UserCog} 
                  label="manage roles" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/students" 
                  icon={Users} 
                  label="students" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/projects" 
                  icon={FolderGit2} 
                  label="project dir" 
                />
              </>
            ) : currentRole === "STUDENT" ? (
              <>
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/" 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/projects" 
                  icon={FolderGit2} 
                  label="project dir" 
                />
              </>
            ) : (
              <>
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/" 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/students" 
                  icon={Users} 
                  label="students" 
                />
                <NavLink 
                  isSidebarOpen={isSidebarOpen} 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  href="/projects" 
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
                  {ROLE_PROFILES[currentRole].initial}
                </div>
                <div className="overflow-hidden min-w-0 flex-1 group relative">
                  <div className="text-sm font-bold text-[#10334A] truncate" title={profileDetails.name}>
                    {profileDetails.name}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 truncate" title={profileDetails.role}>
                    {profileDetails.role}
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative flex items-center justify-center cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-[#0D3481] shadow-sm border border-blue-200">
                  {ROLE_PROFILES[currentRole].initial}
                </div>
                <div className="absolute left-full ml-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow-md z-50">
                  {profileDetails.name}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Menu - Logout Only */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-[#10334A] truncate">{profileDetails.name}</p>
                <p className="text-xs text-slate-500 truncate">{profileDetails.role}</p>
              </div>
              <div onClick={() => setIsProfileMenuOpen(false)}>
                <LogoutButton className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full min-w-0 relative">
        <header className="h-16 border-b bg-white flex items-center px-4 sm:px-8 sticky top-0 z-10 shadow-sm shrink-0 justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 mr-3 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden shrink-0 border border-slate-200 shadow-2xs"
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>
            

          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#10334A] shadow-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#0D3481]" />
                <span>Role: <strong className="text-[#0D3481]">{ROLE_LABELS[currentRole]}</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Role
                  </div>
                  {(Object.keys(ROLE_LABELS) as RoleType[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setCurrentRole(role);
                        const prof = ROLE_PROFILES[role];
                        setProfileDetails(prev => ({
                          ...prev,
                          name: prof.name,
                          email: prof.email,
                          role: prof.role
                        }));
                        saveActiveSession({
                          role,
                          email: prof.email,
                          name: prof.name,
                          dept: prof.dept
                        });
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentRole === role ? "text-[#0D3481] bg-blue-50/50 font-bold" : "text-slate-700"
                      }`}
                    >
                      <span>{ROLE_LABELS[role]}</span>
                      {currentRole === role && <span className="w-1.5 h-1.5 rounded-full bg-[#0D3481]"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0D3481] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {ROLE_PROFILES[currentRole].initial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#10334A] leading-tight">{profileDetails.name}</span>
                <span className="text-[11px] text-slate-500 leading-tight">{ROLE_PROFILES[currentRole].dept}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full bg-slate-50 overflow-x-hidden relative min-h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-8">
          {isDashboardTabLoading && (
            <div 
              aria-label="Loading dashboard content"
              className="absolute inset-0 z-30 flex items-center justify-center bg-slate-50/85 backdrop-blur-xs transition-opacity duration-150"
            >
              <KitScreenLoader
                fullScreen={false}
                showText={false}
                isComplete={isNavComplete}
                transparent={true}
              />
            </div>
          )}
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
