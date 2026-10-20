/**
 * Session Inactivity Management Suite
 *
 * Enforces a strict 20-minute inactivity timeout for all logged-in sessions (HOD, Coordinator).
 * Automatically tracks user interactions (clicks, keyboard, touch, scrolling), synchronizes
 * across open browser tabs via localStorage, and logs out the user after 20 minutes of inactivity.
 */

import { clearActiveSession, getActiveSession } from "./auth";

/** 20 minutes in milliseconds (20 * 60 * 1000) */
export const SESSION_INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

/** 60 seconds warning before timeout */
export const SESSION_WARNING_BEFORE_MS = 60 * 1000;

/** LocalStorage key for cross-tab activity synchronization */
export const LAST_ACTIVITY_KEY = "kit_last_activity_time";

/** LocalStorage key for session timeout flag */
export const SESSION_TIMED_OUT_KEY = "kit_session_timed_out";

/**
 * Record user activity timestamp.
 * Updates both localStorage and returns current timestamp.
 */
export function recordUserActivity(): number {
  if (typeof window === "undefined") return Date.now();
  const now = Date.now();
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } catch {}
  return now;
}

/**
 * Retrieve the timestamp of the last recorded user interaction.
 * Defaults to current timestamp if uninitialized.
 */
export function getLastActivityTime(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const val = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return Date.now();
}

/**
 * Clear the stored activity timestamp.
 */
export function clearLastActivityTime(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

/**
 * Calculate the milliseconds elapsed since the last user activity.
 */
export function getInactivityElapsedMs(): number {
  return Date.now() - getLastActivityTime();
}

/**
 * Check if the current session has exceeded the inactivity threshold.
 */
export function isSessionExpired(timeoutMs: number = SESSION_INACTIVITY_TIMEOUT_MS): boolean {
  return getInactivityElapsedMs() >= timeoutMs;
}

/**
 * Terminate active logged-in session due to inactivity and redirect to landing page.
 */
export function performInactivityLogout(redirectPath: string = "/?session_expired=1"): void {
  if (typeof window === "undefined") return;

  clearLastActivityTime();
  try {
    localStorage.setItem(SESSION_TIMED_OUT_KEY, "1");
  } catch {}

  // Clear auth session cookie and local storage
  clearActiveSession();

  try {
    window.dispatchEvent(
      new CustomEvent("kit-session-timeout", {
        detail: {
          reason: "inactivity_timeout",
          timeoutMinutes: 20,
        },
      })
    );
  } catch {}

  // Redirect to landing page
  if (typeof window !== "undefined" && window.location) {
    if (window.location.pathname === "/" && window.location.search.includes("session_expired=1")) {
      // Already on landing page with flag
      return;
    }
    window.location.href = redirectPath;
  }
}
