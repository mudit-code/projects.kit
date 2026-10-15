export type RoleType = "HOD" | "STUDENT" | "COORDINATOR";

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
    email: "hod@kit.ac.in",
    initial: "RS",
    roleLabel: "HOD",
    dept: "Dept. of Computer Science & Engineering",
    emoji: "🎓",
    shortAction: "Manage Roles",
  },
  STUDENT: {
    name: "Aarav Sharma",
    email: "student.lead@kit.ac.in",
    initial: "AS",
    roleLabel: "Student",
    dept: "B.Tech Final Year (CSE)",
    emoji: "👨‍🎓",
    shortAction: "Submit Model",
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
      if (parsed?.role && (parsed.role === "HOD" || parsed.role === "STUDENT" || parsed.role === "COORDINATOR")) {
        return parsed;
      }
    }
  } catch {}

  // Fallback: check document.cookie
  try {
    const match = document.cookie.match(new RegExp('(^| )' + AUTH_COOKIE_NAME + '=([^;]+)'));
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[2]));
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
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_COOKIE_NAME);
  } catch {}
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
