import { describe, it, expect, beforeEach, vi } from "vitest";
import { ROLE_DATA, ROLE_PERMISSIONS, saveActiveSession, clearActiveSession, getActiveSession } from "../auth";
import { ROLE_OPTIONS } from "@/components/RoleSelector";
import {
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_BEFORE_MS,
  LAST_ACTIVITY_KEY,
  recordUserActivity,
  getLastActivityTime,
  isSessionExpired,
  performInactivityLogout,
} from "../sessionTimeout";

describe("Hidden Login Panel & Session Inactivity Suite", () => {
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
      history: { replaceState: vi.fn() },
    };
    (globalThis as any).document = {
      cookie: "",
    };
    (globalThis as any).localStorage = storageMock;
    vi.restoreAllMocks();
  });

  it("provides valid role definitions for both HOD and Faculty Coordinator", () => {
    expect(ROLE_DATA.HOD).toBeDefined();
    expect(ROLE_DATA.HOD.name).toBe("Rahul Singh");
    expect(ROLE_DATA.HOD.email).toBe("muditcodes@gmail.com");

    expect(ROLE_DATA.COORDINATOR).toBeDefined();
    expect(ROLE_DATA.COORDINATOR.name).toBe("Dr. A. Sharma");
    expect(ROLE_DATA.COORDINATOR.email).toBe("coordinator@kit.ac.in");

    expect(ROLE_OPTIONS.length).toBe(2);
    expect(ROLE_OPTIONS.map((o) => o.role)).toEqual(["HOD", "COORDINATOR"]);
  });

  it("updates activity time upon user session establishment", () => {
    const fixedTime = 1750000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedTime);

    saveActiveSession({
      role: "HOD",
      email: "muditcodes@gmail.com",
      name: "Rahul Singh",
      dept: "Dept. of Computer Science & Engineering",
    });

    expect(getLastActivityTime()).toBe(fixedTime);
    expect(isSessionExpired()).toBe(false);
  });

  it("triggers automatic logout after 20 minutes of inactivity", () => {
    const startTime = 1750000000000;
    vi.spyOn(Date, "now").mockReturnValue(startTime);
    recordUserActivity();

    // 19 minutes elapsed (not expired, within warning window)
    vi.spyOn(Date, "now").mockReturnValue(startTime + 19 * 60 * 1000);
    expect(isSessionExpired()).toBe(false);

    // 20 minutes elapsed (expired)
    vi.spyOn(Date, "now").mockReturnValue(startTime + 20 * 60 * 1000);
    expect(isSessionExpired()).toBe(true);

    performInactivityLogout();
    expect(window.location.href).toBe("/admin?session_expired=1");
    expect(mockStorage[LAST_ACTIVITY_KEY]).toBeUndefined();
  });
});
