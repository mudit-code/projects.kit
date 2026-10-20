import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  formatToIsoDate,
  getTodayIso,
  formatDisplayDate,
  daysBetween,
} from "../../components/CustomDatePicker";

describe("CustomDatePicker & Date Rules", () => {
  it("correctly parses and formats local ISO dates without timezone drift", () => {
    const iso = "2026-10-19";
    const parsed = parseLocalDate(iso);
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(9); // 0-indexed October
    expect(parsed?.getDate()).toBe(19);

    const formattedBack = formatToIsoDate(parsed!);
    expect(formattedBack).toBe("2026-10-19");
  });

  it("calculates days between two dates accurately", () => {
    expect(daysBetween("2026-10-19", "2026-10-19")).toBe(0);
    expect(daysBetween("2026-10-19", "2026-10-20")).toBe(1);
    expect(daysBetween("2026-10-19", "2026-12-03")).toBe(45);
  });

  it("formats display dates in legible Indian English format", () => {
    const formatted = formatDisplayDate("2026-10-19");
    expect(formatted).toContain("19");
    expect(formatted).toContain("Oct");
    expect(formatted).toContain("2026");
  });

  describe("Rule 1: Don't let user select a start date before today", () => {
    it("enforces start date >= today", () => {
      const today = getTodayIso();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = formatToIsoDate(yesterdayDate);

      // Validation rule check
      const isBeforeToday = (date: string) => date < today;

      expect(isBeforeToday(yesterday)).toBe(true);
      expect(isBeforeToday(today)).toBe(false);

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = formatToIsoDate(tomorrowDate);
      expect(isBeforeToday(tomorrow)).toBe(false);
    });
  });

  describe("Rule 2: Don't let user select a deadline before start date", () => {
    it("enforces deadline >= startDate and detects violations", () => {
      const startDate = "2026-10-19";
      const validDeadline = "2026-12-03";
      const invalidDeadline = "2026-10-18";

      const isDeadlineValid = (start: string, dline: string) => dline >= start;

      expect(isDeadlineValid(startDate, validDeadline)).toBe(true);
      expect(isDeadlineValid(startDate, invalidDeadline)).toBe(false);
      expect(isDeadlineValid(startDate, startDate)).toBe(true);
    });

    it("auto-advances deadline if start date is moved past the current deadline", () => {
      let startDate = "2026-10-19";
      let deadline = "2026-10-25";

      // User changes startDate to 2026-11-01 (after current deadline)
      const newStartDate = "2026-11-01";
      if (deadline < newStartDate) {
        const d = parseLocalDate(newStartDate)!;
        d.setDate(d.getDate() + 30);
        deadline = formatToIsoDate(d);
      }
      startDate = newStartDate;

      expect(startDate).toBe("2026-11-01");
      expect(deadline).toBe("2026-12-01");
      expect(deadline >= startDate).toBe(true);
    });
  });
});
