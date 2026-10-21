import { describe, it, expect } from "vitest";
import { isDateEnded, isFormLifecycleEnded } from "@/components/dashboard/ProjectsTable";

describe("Project Directory Full Lifecycle Suite", () => {
  it("determines that past dates have ended and future dates have not", () => {
    // Past date
    expect(isDateEnded("2026-10-01")).toBe(true);
    expect(isDateEnded("2025-12-31")).toBe(true);

    // Future date
    expect(isDateEnded("2026-11-30")).toBe(false);
    expect(isDateEnded("2027-01-01")).toBe(false);

    // Invalid or null dates
    expect(isDateEnded(null)).toBe(false);
    expect(isDateEnded("")).toBe(false);
  });

  it("does not consider active forms with future deadlines as ended lifecycle", () => {
    const activeForm = {
      id: "INIT-197635",
      subjectCode: "BCS753",
      title: "Mini Project Registration Form",
      deadline: "2026-11-05",
      status: "Active",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(activeForm)).toBe(false);
  });

  it("considers forms with passed deadlines as completed lifecycle", () => {
    const passedForm = {
      id: "INIT-PAST",
      subjectCode: "BCS750",
      title: "Previous Semester Project",
      deadline: "2026-10-10",
      status: "Active",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(passedForm)).toBe(true);
  });

  it("respects finalSubmissionDeadline when configured", () => {
    // If registration deadline passed but final submission deadline is still in the future
    const formWithFinal = {
      id: "INIT-PHASE2",
      subjectCode: "BCS752",
      deadline: "2026-10-15", // Passed
      finalSubmissionDeadline: "2026-11-15", // Future
      status: "Active",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(formWithFinal)).toBe(false);

    // When both have passed
    const formBothPassed = {
      id: "INIT-PHASE2-DONE",
      subjectCode: "BCS752",
      deadline: "2026-10-10",
      finalSubmissionDeadline: "2026-10-18",
      status: "Active",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(formBothPassed)).toBe(true);
  });

  it("considers forms explicitly marked Completed/Closed/Archived as ended lifecycle", () => {
    const completedForm = {
      id: "INIT-DONE",
      deadline: "2026-12-31", // future deadline, but HOD completed it
      status: "Completed",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(completedForm)).toBe(true);

    const closedForm = {
      id: "INIT-CLOSED",
      deadline: "2026-12-31",
      status: "Closed",
      isTrashed: false,
    };

    expect(isFormLifecycleEnded(closedForm)).toBe(true);
  });

  it("never includes trashed forms in project directory lifecycle", () => {
    const trashedForm = {
      id: "INIT-703668",
      deadline: "2026-10-01",
      status: "Active",
      isTrashed: true,
    };

    expect(isFormLifecycleEnded(trashedForm)).toBe(false);
  });
});
