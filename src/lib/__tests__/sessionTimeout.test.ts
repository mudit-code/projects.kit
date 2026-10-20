import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_BEFORE_MS,
  LAST_ACTIVITY_KEY,
  SESSION_TIMED_OUT_KEY,
  recordUserActivity,
  getLastActivityTime,
  clearLastActivityTime,
  getInactivityElapsedMs,
  isSessionExpired,
  performInactivityLogout,
} from "../sessionTimeout";
import * as auth from "../auth";

describe("Session Inactivity Timeout (20 Minutes)", () => {
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

  it("enforces warning threshold of 60 seconds before timeout", () => {
    expect(SESSION_WARNING_BEFORE_MS).toBe(60 * 1000);
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

    performInactivityLogout("/?session_expired=1");

    expect(clearSessionSpy).toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_TIMED_OUT_KEY)).toBe("1");
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeNull();
  });
});
