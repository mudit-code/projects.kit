"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, ShieldAlert, LogOut, CheckCircle2, X } from "lucide-react";
import { getActiveSession, UserSession } from "@/lib/auth";
import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_POPUP_INACTIVITY_MS,
  SESSION_WARNING_BEFORE_MS,
  LAST_ACTIVITY_KEY,
  recordUserActivity,
  getLastActivityTime,
  isSessionExpired,
  performInactivityLogout,
} from "@/lib/sessionTimeout";

/** Minimum interval between recording user activity to storage (prevents CPU thrash) */
const THROTTLE_MS = 2000;

/** Regular tick check interval */
const CHECK_INTERVAL_MS = 3000;

/** Total seconds of warning countdown (15 minutes = 900s) */
const TOTAL_WARNING_SECONDS = (SESSION_INACTIVITY_TIMEOUT_MS - SESSION_POPUP_INACTIVITY_MS) / 1000;

export function SessionInactivityWatcher() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_WARNING_SECONDS);

  const lastRecordedTimeRef = useRef<number>(0);
  const isWarningOpenRef = useRef<boolean>(false);

  // Keep ref synced to state
  useEffect(() => {
    isWarningOpenRef.current = showWarningModal;
  }, [showWarningModal]);

  // Sync active session on mount and when auth changes
  useEffect(() => {
    setMounted(true);
    const sync = () => {
      const active = getActiveSession();
      setSession(active);
      if (active) {
        // Initialize activity if not already present
        try {
          if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
            recordUserActivity();
          }
        } catch {
          recordUserActivity();
        }
      } else {
        setShowWarningModal(false);
      }
    };

    sync();
    window.addEventListener("kit-auth-change", sync);
    window.addEventListener("storage", sync);

    // Testing convenience: ?testInactivity=1 triggers the modal preview
    if (typeof window !== "undefined" && (window.location.search.includes("testInactivity=1") || window.location.search.includes("testInactivity=true"))) {
      setSession((prev) => prev || { name: "Rahul Singh", role: "HOD", email: "muditcodes@gmail.com", dept: "CSE" });
      setSecondsRemaining(895);
      setShowWarningModal(true);
    }

    return () => {
      window.removeEventListener("kit-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Handle user interaction to reset inactivity timer
  const handleUserActivity = useCallback(() => {
    if (!session) return;

    // When the warning modal is open, passive mousemove/scroll events should not
    // silently dismiss it before the user can read the timer or choose an action.
    if (isWarningOpenRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRecordedTimeRef.current >= THROTTLE_MS) {
      lastRecordedTimeRef.current = now;
      recordUserActivity();
    }
  }, [session]);

  // Attach event listeners for user activity
  useEffect(() => {
    if (!session) return;

    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
      "wheel",
      "click",
    ];

    const onActivity = () => handleUserActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onActivity);
      });
    };
  }, [session, handleUserActivity]);

  // Main inactivity timer watchdog
  useEffect(() => {
    if (!session) return;

    const checkInactivity = () => {
      const isTest = typeof window !== "undefined" && (window.location.search.includes("testInactivity=1") || window.location.search.includes("testInactivity=true"));
      if (isTest) {
        setShowWarningModal(true);
        return;
      }

      const currentSession = getActiveSession();
      if (!currentSession) return;

      const last = getLastActivityTime();
      const elapsed = Date.now() - last;

      if (elapsed >= SESSION_INACTIVITY_TIMEOUT_MS) {
        // 20 minutes exceeded -> logout immediately
        setShowWarningModal(false);
        performInactivityLogout();
        return;
      }

      // Check if 5 minutes of inactivity has elapsed
      if (elapsed >= SESSION_POPUP_INACTIVITY_MS) {
        const remaining = Math.max(0, Math.ceil((SESSION_INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setShowWarningModal(true);
      } else {
        if (isWarningOpenRef.current) {
          setShowWarningModal(false);
        }
      }
    };

    // Run check immediately
    checkInactivity();

    // Check every 3 seconds
    const interval = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    // Also check on visibility change (e.g. computer woke from sleep or user returned to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (isSessionExpired()) {
          setShowWarningModal(false);
          performInactivityLogout();
        } else {
          checkInactivity();
        }
      }
    };

    const handleFocus = () => {
      if (isSessionExpired()) {
        setShowWarningModal(false);
        performInactivityLogout();
      } else {
        checkInactivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [session]);

  // Secondary high-frequency 1s interval when warning modal is active for real-time countdown
  useEffect(() => {
    if (!showWarningModal || !session) return;

    const isTest = typeof window !== "undefined" && (window.location.search.includes("testInactivity=1") || window.location.search.includes("testInactivity=true"));

    const countdownInterval = setInterval(() => {
      if (isTest) {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowWarningModal(false);
            performInactivityLogout();
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      const last = getLastActivityTime();
      const elapsed = Date.now() - last;
      const remaining = Math.max(0, Math.ceil((SESSION_INACTIVITY_TIMEOUT_MS - elapsed) / 1000));

      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setShowWarningModal(false);
        performInactivityLogout();
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showWarningModal, session]);

  // Handle Escape key to dismiss and stay logged in
  useEffect(() => {
    if (!showWarningModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleStaySignedIn();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showWarningModal]);

  const handleStaySignedIn = () => {
    recordUserActivity();
    setShowWarningModal(false);
  };

  const handleSignOutNow = () => {
    setShowWarningModal(false);
    performInactivityLogout();
  };

  if (!mounted || !session || !showWarningModal || typeof document === "undefined") {
    return null;
  }

  // Calculate formatted countdown MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Calculate progress bar percent (starts at 100% when modal opens at 15m left, empties at 0)
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / TOTAL_WARNING_SECONDS) * 100));
  const isUrgent = secondsRemaining < 120; // Critical alert when under 2 minutes remaining

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-warning-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleStaySignedIn();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150 select-none"
    >
      <div className="relative w-full max-w-sm bg-white rounded-xl border border-neutral-200/90 p-5 sm:p-6 shadow-xl shadow-black/[0.08] text-left animate-in zoom-in-98 duration-150">
        {/* Top bar: minimal badge and clean cross button */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200/60 text-neutral-600 text-[11px] font-medium tracking-wide">
            <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-red-500 animate-pulse" : "bg-neutral-500"}`} />
            <span>Inactivity Notice</span>
          </div>

          <button
            type="button"
            onClick={handleStaySignedIn}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close dialog and stay logged in"
            title="Stay Logged In"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Heading & Subtitle */}
        <h3 id="inactivity-warning-title" className="text-sm font-semibold text-neutral-900 tracking-tight mb-1.5">
          Are you still working?
        </h3>

        <p className="text-xs text-neutral-500 leading-relaxed mb-4">
          You have been inactive for 5 minutes. You will be automatically logged out when the timer runs out.
        </p>

        {/* Matte Timer Block */}
        <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200/70 mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Time remaining
            </span>
            <span className={`text-xl font-mono font-semibold tracking-tight tabular-nums ${
              isUrgent ? "text-red-600 font-bold" : "text-neutral-900"
            }`}>
              {formattedTime}
            </span>
          </div>

          {/* Minimal hairline progress track */}
          <div className="w-full h-1 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isUrgent ? "bg-red-600" : "bg-neutral-900"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions: Log Out or Stay Logged In */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleSignOutNow}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer border border-neutral-200/80"
          >
            Log Out
          </button>

          <button
            type="button"
            onClick={handleStaySignedIn}
            className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 active:bg-black rounded-lg transition-colors cursor-pointer"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default SessionInactivityWatcher;

