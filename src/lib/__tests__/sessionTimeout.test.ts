import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_POPUP_INACTIVITY_MS,
  SESSION_WARNING_BEFORE_MS,
  LAST_ACTIVITY_KEY,
  SESSION_TIMED_OUT_KEY,
  recordUserActivity,
  getLastActivityTime,
  clearLastActivityTime,
  getInactivityElapsedMs,
  isSessionExpired,
  shouldShowInactivityWarning,
  getRemainingSessionMs,
  performInactivityLogout,
} from "../sessionTimeout";
import * as auth from "../auth";

describe("Session Inactivity Timeout (20 Minutes & 5 Minute Popup)", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    };

    (globalThis as any).window = {
      location: { href: "/", pathname: "/", search: "" },
      dispatchEvent: vi.fn(),
    };
    (globalThis as any).localStorage = storageMock;
    vi.restoreAllMocks();
  });

  it("enforces timeout duration of exactly 20 minutes (1,200,000 ms)", () => {
    expect(SESSION_INACTIVITY_TIMEOUT_MS).toBe(20 * 60 * 1000);
    expect(SESSION_INACTIVITY_TIMEOUT_MS).toBe(1200000);
  });

  it("enforces 5-minute inactivity popup rule with 15 minutes remaining on timer", () => {
    expect(SESSION_POPUP_INACTIVITY_MS).toBe(5 * 60 * 1000);
    expect(SESSION_POPUP_INACTIVITY_MS).toBe(300000);
    expect(SESSION_WARNING_BEFORE_MS).toBe(15 * 60 * 1000);
    expect(SESSION_WARNING_BEFORE_MS).toBe(900000);
  });

  it("triggers warning pop-up at 5 minutes of inactivity and accurately calculates remaining time", () => {
    const startTime = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    recordUserActivity();

    // After 4 minutes: pop-up should NOT show yet
    vi.spyOn(Date, "now").mockReturnValue(startTime + 4 * 60 * 1000);
    expect(shouldShowInactivityWarning()).toBe(false);
    expect(getRemainingSessionMs()).toBe(16 * 60 * 1000);

    // After 5 minutes: pop-up SHOULD show
    vi.spyOn(Date, "now").mockReturnValue(startTime + 5 * 60 * 1000);
    expect(shouldShowInactivityWarning()).toBe(true);
    expect(getRemainingSessionMs()).toBe(15 * 60 * 1000);

    // After 19 minutes: pop-up still active with 1 minute remaining
    vi.spyOn(Date, "now").mockReturnValue(startTime + 19 * 60 * 1000);
    expect(shouldShowInactivityWarning()).toBe(true);
    expect(getRemainingSessionMs()).toBe(1 * 60 * 1000);

    // After 20 minutes: session is expired
    vi.spyOn(Date, "now").mockReturnValue(startTime + 20 * 60 * 1000);
    expect(shouldShowInactivityWarning()).toBe(false);
    expect(isSessionExpired()).toBe(true);
    expect(getRemainingSessionMs()).toBe(0);
  });

  it("records user activity timestamp in localStorage", () => {
    const now = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const recorded = recordUserActivity();
    expect(recorded).toBe(now);
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(now.toString());
    expect(getLastActivityTime()).toBe(now);
  });

  it("correctly identifies active sessions as not expired", () => {
    const startTime = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    recordUserActivity();

    // Fast-forward 10 minutes (less than 20 minutes)
    vi.spyOn(Date, "now").mockReturnValue(startTime + 10 * 60 * 1000);
    expect(getInactivityElapsedMs()).toBe(10 * 60 * 1000);
    expect(isSessionExpired()).toBe(false);
  });

  it("correctly identifies inactive sessions as expired when 20 minutes elapse", () => {
    const startTime = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    recordUserActivity();

    // Fast-forward 20 minutes
    vi.spyOn(Date, "now").mockReturnValue(startTime + 20 * 60 * 1000);
    expect(getInactivityElapsedMs()).toBe(20 * 60 * 1000);
    expect(isSessionExpired()).toBe(true);

    // Fast-forward 25 minutes
    vi.spyOn(Date, "now").mockReturnValue(startTime + 25 * 60 * 1000);
    expect(isSessionExpired()).toBe(true);
  });

  it("clears activity timestamp upon logout", () => {
    recordUserActivity();
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeTruthy();

    clearLastActivityTime();
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeNull();
  });

  it("performInactivityLogout clears session and sets timeout flag", () => {
    const clearSessionSpy = vi.spyOn(auth, "clearActiveSession").mockImplementation(() => {});
    recordUserActivity();

    performInactivityLogout();

    expect(clearSessionSpy).toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_TIMED_OUT_KEY)).toBe("1");
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeNull();
  });
});
