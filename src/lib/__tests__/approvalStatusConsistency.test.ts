import { describe, it, expect } from "vitest";
import { getSubmissionApprovalStatus } from "@/components/PublicLandingPage";

describe("Approval Status Consistency Suite", () => {
  it("resolves approved when approvalStatus is approved", () => {
    const sub = {
      approvalStatus: "approved",
      verificationStatus: "pending",
      projectName: "AI Attendance System",
    };
    expect(getSubmissionApprovalStatus(sub, "INIT-PROJECT", "233206")).toBe("approved");
  });

  it("resolves approved when verificationStatus is verified", () => {
    const sub = {
      verificationStatus: "verified",
      projectName: "AI Attendance System",
    };
    expect(getSubmissionApprovalStatus(sub, "INIT-PROJECT", "233206")).toBe("approved");
  });

  it("resolves approved when coordinator approved in localStorage", () => {
    const sub = {
      verificationStatus: "pending",
      projectName: "AI Attendance System",
    };
    // Mock localStorage
    const originalLocal = globalThis.localStorage;
    const store: Record<string, string> = {
      "kit_approvals_INIT-PROJECT": JSON.stringify({ "233206": "approved" }),
    };
    globalThis.localStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {},
      key: (i: number) => Object.keys(store)[i] || null,
      length: Object.keys(store).length,
    } as any;

    try {
      expect(getSubmissionApprovalStatus(sub, "INIT-PROJECT", "233206")).toBe("approved");
    } finally {
      globalThis.localStorage = originalLocal;
    }
  });

  it("resolves not_approved when marked not approved or rejected", () => {
    const sub1 = { approvalStatus: "not_approved" };
    expect(getSubmissionApprovalStatus(sub1)).toBe("not_approved");

    const sub2 = { verificationStatus: "rejected" };
    expect(getSubmissionApprovalStatus(sub2)).toBe("not_approved");
  });

  it("resolves pending for unreviewed submissions", () => {
    const sub = { verificationStatus: "pending" };
    expect(getSubmissionApprovalStatus(sub)).toBe("pending");
  });
});
