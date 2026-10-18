export type RoleType = "HOD" | "COORDINATOR";

export interface UserSession {
  role: RoleType;
  email: string;
  name: string;
  dept: string;
}

export const ROLE_DATA: Record<RoleType, { 
  name: string; 
  email: string; 
  initial: string; 
  roleLabel: string; 
  dept: string;
  emoji: string;
  shortAction: string;
}> = {
  HOD: {
    name: "Rahul Singh",
    email: "muditcodes@gmail.com",
    initial: "RS",
    roleLabel: "HOD",
    dept: "Dept. of Computer Science & Engineering",
    emoji: "🎓",
    shortAction: "Administration",
  },
  COORDINATOR: {
    name: "Dr. A. Sharma",
    email: "coordinator@kit.ac.in",
    initial: "AS",
    roleLabel: "Faculty",
    dept: "Dept. of Computer Science",
    emoji: "👩‍💼",
    shortAction: "Project Coordinator",
  }
};

export const AUTH_COOKIE_NAME = "kit_user_session";

export function getActiveSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  
  try {
    const local = localStorage.getItem(AUTH_COOKIE_NAME);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed?.role === "HOD" && parsed?.email !== "muditcodes@gmail.com") {
        parsed.email = "muditcodes@gmail.com";
        saveActiveSession(parsed);
      }
      if (parsed?.role && (parsed.role === "HOD" || parsed.role === "COORDINATOR")) {
        return parsed;
      }
    }
  } catch {}

  // Fallback: check document.cookie
  try {
    const match = document.cookie.match(new RegExp('(^| )' + AUTH_COOKIE_NAME + '=([^;]+)'));
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[2]));
      if (parsed?.role === "HOD" && parsed?.email !== "muditcodes@gmail.com") {
        parsed.email = "muditcodes@gmail.com";
        saveActiveSession(parsed);
      }
      if (parsed?.role) return parsed;
    }
  } catch {}

  return null;
}

export function saveActiveSession(session: UserSession) {
  if (typeof window === "undefined") return;
  const str = JSON.stringify(session);
  try {
    localStorage.setItem(AUTH_COOKIE_NAME, str);
  } catch {}
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(str)}; path=/; max-age=604800; SameSite=Lax`;

  // Asynchronously synchronize with server session endpoint to issue signed HMAC cookie
  fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: str,
  }).catch(() => {});

  try {
    window.dispatchEvent(new Event("kit-auth-change"));
  } catch {}
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_COOKIE_NAME);
  } catch {}
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

  fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});

  try {
    window.dispatchEvent(new Event("kit-auth-change"));
  } catch {}
}

export interface RolePermissions {
  role: RoleType;
  roleName: string;
  baseRoute: string;
  description: string;
  allowedRoutes: string[];
  restrictedRoutes: string[];
  canInitiateProjects: boolean;
  canManageRoles: boolean;
  canReviewForms: boolean;
  canViewStudents: boolean;
  canViewProjects: boolean;
  canEvaluateSubmissions: boolean;
}

export const ROLE_PERMISSIONS: Record<RoleType, RolePermissions> = {
  HOD: {
    role: "HOD",
    roleName: "Head of Department (HOD)",
    baseRoute: "/hod",
    description: "Full administrative and departmental oversight, rubric approvals, project initiation, and role governance.",
    allowedRoutes: ["/hod", "/hod/forms", "/hod/projects", "/hod/projects/new", "/hod/students", "/hod/roles", "/coordinator"],
    restrictedRoutes: [],
    canInitiateProjects: true,
    canManageRoles: true,
    canReviewForms: true,
    canViewStudents: true,
    canViewProjects: true,
    canEvaluateSubmissions: true,
  },
  COORDINATOR: {
    role: "COORDINATOR",
    roleName: "Faculty / Project Coordinator",
    baseRoute: "/coordinator",
    description: "Supervises student batches, monitors capstone progress, and conducts rubric evaluations. Cannot initiate projects or manage roles.",
    allowedRoutes: ["/coordinator", "/coordinator/forms", "/coordinator/projects", "/coordinator/students"],
    restrictedRoutes: ["/hod", "/hod/roles", "/hod/projects/new", "/roles", "/projects/new"],
    canInitiateProjects: false,
    canManageRoles: false,
    canReviewForms: true,
    canViewStudents: true,
    canViewProjects: true,
    canEvaluateSubmissions: true,
  },
};

export function getRoleHomeRoute(role?: RoleType | null): string {
  if (role === "HOD") return "/hod";
  if (role === "COORDINATOR") return "/coordinator";
  return "/";
}

export function isRouteAllowedForRole(pathname: string, role: RoleType): boolean {
  // Public routes
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    return true;
  }

  // HOD dedicated routes: STRICTLY HOD ONLY
  if (pathname === "/hod" || pathname.startsWith("/hod/")) {
    return role === "HOD";
  }

  // Coordinator dedicated routes: COORDINATOR (and HOD super-admin inspection)
  if (pathname === "/coordinator" || pathname.startsWith("/coordinator/")) {
    return role === "COORDINATOR" || role === "HOD";
  }

  // Legacy routes
  if (pathname === "/roles" || pathname.startsWith("/roles/") || pathname.startsWith("/projects/new")) {
    return role === "HOD";
  }

  return true;
}


export function parseSessionCookie(cookieValue: string | undefined | null): UserSession | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);

    // Support signed token payload extraction
    if (decoded.startsWith("signed:")) {
      const parts = decoded.slice(7).split(".");
      if (parts.length === 2) {
        const jsonStr = atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
        const parsed = JSON.parse(jsonStr);
        if (parsed?.role === "HOD" || parsed?.role === "COORDINATOR") {
          return parsed;
        }
      }
    }

    const parsed = JSON.parse(decoded);
    if (parsed?.role === "HOD" || parsed?.role === "COORDINATOR") {
      return parsed;
    }
  } catch {
    try {
      const parsed = JSON.parse(cookieValue);
      if (parsed?.role === "HOD" || parsed?.role === "COORDINATOR") {
        return parsed;
      }
    } catch {}
  }
  return null;
}

