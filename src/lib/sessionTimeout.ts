/**
 * Session Inactivity Management Suite
 *
 * Enforces a strict 20-minute inactivity timeout for all logged-in sessions (HOD, Coordinator).
 * Automatically tracks user interactions (clicks, keyboard, touch, scrolling), synchronizes
 * across open browser tabs via localStorage, and logs out the user after 20 minutes of inactivity.
 */

import { clearActiveSession, getActiveSession } from "./auth";

/** 20 minutes in milliseconds (20 * 60 * 1000) - Total session inactivity limit */
export const SESSION_INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

/** 5 minutes of inactivity before the pop-up warning appears (5 * 60 * 1000) */
export const SESSION_POPUP_INACTIVITY_MS = 5 * 60 * 1000;

/** 15 minutes countdown remaining before the 20-minute timeout (20 - 5 = 15 mins) */
export const SESSION_WARNING_BEFORE_MS = SESSION_INACTIVITY_TIMEOUT_MS - SESSION_POPUP_INACTIVITY_MS;

/** LocalStorage key for cross-tab activity synchronization */
export const LAST_ACTIVITY_KEY = "kit_last_activity_time";

/** LocalStorage key for session timeout flag */
export const SESSION_TIMED_OUT_KEY = "kit_session_timed_out";

/**
 * Check if inactivity has reached the 5-minute threshold to trigger the pop-up warning.
 */
export function shouldShowInactivityWarning(thresholdMs: number = SESSION_POPUP_INACTIVITY_MS): boolean {
  return getInactivityElapsedMs() >= thresholdMs && !isSessionExpired();
}

/**
 * Calculate the remaining milliseconds before the 20-minute session expires.
 */
export function getRemainingSessionMs(timeoutMs: number = SESSION_INACTIVITY_TIMEOUT_MS): number {
  const elapsed = getInactivityElapsedMs();
  return Math.max(0, timeoutMs - elapsed);
}

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
 * Terminate active logged-in session due to inactivity and redirect to hidden login panel.
 */
export function performInactivityLogout(redirectPath: string = "/admin?session_expired=1"): void {
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
        },
      })
    );
  } catch {}

  // Redirect to hidden login panel
  if (typeof window !== "undefined" && window.location) {
    if (window.location.pathname === "/admin" && window.location.search.includes("session_expired=1")) {
      // Already on admin login panel with flag
      return;
    }
    window.location.href = redirectPath;
  }
}
