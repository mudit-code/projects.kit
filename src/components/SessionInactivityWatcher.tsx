"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";
import { getActiveSession, UserSession } from "@/lib/auth";
import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_BEFORE_MS,
  recordUserActivity,
  getLastActivityTime,
  isSessionExpired,
  performInactivityLogout,
} from "@/lib/sessionTimeout";

/** Minimum interval between recording user activity to storage (prevents CPU thrash) */
const THROTTLE_MS = 2000;

/** Regular tick check interval */
const CHECK_INTERVAL_MS = 5000;

export function SessionInactivityWatcher() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

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
        // Initialize activity if first load
        recordUserActivity();
      } else {
        setShowWarningModal(false);
      }
    };

    sync();
    window.addEventListener("kit-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kit-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Handle user interaction to reset inactivity timer
  const handleUserActivity = useCallback(() => {
    if (!session) return;

    const now = Date.now();
    if (now - lastRecordedTimeRef.current >= THROTTLE_MS) {
      lastRecordedTimeRef.current = now;
      recordUserActivity();

      // If warning modal is open, user activity dismisses it
      if (isWarningOpenRef.current) {
        setShowWarningModal(false);
      }
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
      // Re-verify session
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

      const warningThreshold = SESSION_INACTIVITY_TIMEOUT_MS - SESSION_WARNING_BEFORE_MS;
      if (elapsed >= warningThreshold) {
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

    // Check every 5 seconds
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

  // Secondary high-frequency timer when warning modal is active for countdown
  useEffect(() => {
    if (!showWarningModal || !session) return;

    const countdownInterval = setInterval(() => {
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

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-warning-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xl shadow-slate-900/20 text-left animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <h3 id="inactivity-warning-title" className="text-lg font-extrabold text-[#10334A] tracking-tight mb-2">
          Session Inactivity Warning
        </h3>

        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          You have been inactive for 19 minutes. For institutional security, your logged-in session will automatically expire and redirect to the landing page in:
        </p>

        {/* Countdown Pill */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-900">
              Auto sign-out in
            </span>
          </div>
          <span className="text-sm font-mono font-extrabold text-amber-700 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs">
            {secondsRemaining}s
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSignOutNow}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </button>

          <button
            type="button"
            onClick={handleStaySignedIn}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0D3481] hover:bg-[#0A2761] active:bg-[#081F4D] rounded-xl shadow-md shadow-[#0D3481]/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default SessionInactivityWatcher;
