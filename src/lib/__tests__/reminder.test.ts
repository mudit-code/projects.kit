import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { signSessionToken, verifySessionToken } from "../sessionAuth";
import { JsonReminderStore, ReminderLogEntry } from "../reminderStore";
import { getEligibleStudentsForForm } from "../formTargeting";
import { sendReminderEmails } from "../email/sendReminderEmails";

describe("1. Cohort Targeting & Ground Truth", () => {
  it("resolves exactly 60 eligible students for B.Tech 4th Year CSE Section A", () => {
    const students = getEligibleStudentsForForm({
      course: "B.Tech",
      year: "4th Year",
      stream: "Computer Science & Engineering",
      section: "A",
    });

    expect(students.length).toBe(60);
    for (const student of students) {
      expect(student.course).toBe("B.Tech");
      expect(student.year).toContain("4th");
      expect(student.section).toBe("A");
    }
  });

  it("does not include students from Section B or other streams", () => {
    const students = getEligibleStudentsForForm({
      course: "B.Tech",
      year: "4th Year",
      stream: "Computer Science & Engineering",
      section: "A",
    });

    const hasSecB = students.some((s) => s.section === "B");
    expect(hasSecB).toBe(false);
  });
});

describe("2. HMAC Session Authentication Security", () => {
  const mockSession = {
    role: "HOD" as const,
    email: "hod@kit.ac.in",
    name: "Rahul Singh",
    dept: "Dept. of Computer Science & Engineering",
  };

  it("signs and successfully verifies a valid session token", () => {
    const token = signSessionToken(mockSession);
    expect(token).toMatch(/^signed:[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe("hod@kit.ac.in");
    expect(verified?.role).toBe("HOD");
  });

  it("rejects forged or tampered session payloads", () => {
    const token = signSessionToken(mockSession);
    const parts = token.slice(7).split(".");
    const originalPayloadBase64 = parts[0];
    const signature = parts[1];

    // Attacker modifies role from HOD to COORDINATOR or alters email
    const decoded = JSON.parse(
      Buffer.from(originalPayloadBase64, "base64url").toString("utf-8")
    );
    decoded.email = "attacker@evil.com";
    const forgedPayloadBase64 = Buffer.from(
      JSON.stringify(decoded)
    ).toString("base64url");

    const forgedToken = `signed:${forgedPayloadBase64}.${signature}`;
    const result = verifySessionToken(forgedToken);
    expect(result).toBeNull();
  });

  it("rejects unsigned raw json cookies by default", () => {
    const rawJson = JSON.stringify(mockSession);
    const result = verifySessionToken(rawJson);
    expect(result).toBeNull();
  });
});

describe("3. ReminderStore: Cooldown & Fail-Closed Behavior", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kit-remind-test-"));
    tempFile = path.join(tempDir, "reminder-log.json");
    await fs.writeFile(tempFile, "[]", "utf-8");
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("records and retrieves recent reminders for 24h cooldown", async () => {
    const store = new JsonReminderStore(tempFile);

    const now = new Date();
    const entry: ReminderLogEntry = {
      id: "rem-1",
      formId: "INIT-BCS751",
      studentId: "1",
      studentAfn: "232451",
      studentEmail: "232451@kit.ac.in",
      studentName: "Aashutosh Verma",
      sentAt: now.toISOString(),
      sentBy: "hod@kit.ac.in",
      status: "sent",
      mode: "log",
      recipientActual: "232451@kit.ac.in",
      recipientEffective: "232451@kit.ac.in",
    };

    await store.appendReminders([entry]);

    // Check recent within last 24 hours
    const recent = await store.getRecentReminders(
      "INIT-BCS751",
      "1",
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    expect(recent.length).toBe(1);
    expect(recent[0].studentId).toBe("1");

    // Check for another student: should be empty
    const other = await store.getRecentReminders(
      "INIT-BCS751",
      "2",
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    expect(other.length).toBe(0);
  });

  it("FAILS CLOSED when log file is corrupted or unreadable", async () => {
    // Write corrupted non-json content
    await fs.writeFile(tempFile, "{ broken json ...", "utf-8");
    const store = new JsonReminderStore(tempFile);

    await expect(
      store.getRecentReminders("INIT-BCS751", "1", new Date())
    ).rejects.toThrow(/Failed to read reminder log store/);

    await expect(
      store.appendReminders([
        {
          id: "rem-err",
          formId: "INIT-BCS751",
          studentId: "1",
          studentEmail: "test@kit.ac.in",
          studentName: "Test",
          sentAt: new Date().toISOString(),
          sentBy: "hod@kit.ac.in",
          status: "sent",
          mode: "log",
          recipientActual: "test@kit.ac.in",
          recipientEffective: "test@kit.ac.in",
        },
      ])
    ).rejects.toThrow(/Failed to read reminder log store/);
  });
});

describe("4. Email Safety: Default Log Mode & Test Recipient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to safe 'log' mode and does not make real network calls", async () => {
    delete process.env.EMAIL_MODE; // defaults to 'log'
    delete process.env.EMAIL_TEST_RECIPIENT;

    const mockStudent = {
      id: 1,
      name: "Aashutosh Verma",
      afn: "232451",
      rollNumber: "2301650100001",
      email: "232451@kit.ac.in",
      year: "4th Year",
      batch: "2023-27",
      course: "B.Tech",
      section: "A",
      stream: "COMPUTER SCIENCE AND ENGINEERING",
      gender: "Male",
    };

    const mockForm = {
      id: "INIT-BCS751",
      subjectCode: "BCS751",
      title: "Mini Project",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      year: "4th Year",
      section: "A",
      deadline: "2026-10-21",
      status: "Active",
    };

    const results = await sendReminderEmails({
      form: mockForm,
      students: [mockStudent],
      senderName: "Rahul Singh",
      senderEmail: "hod@kit.ac.in",
    });

    expect(results.length).toBe(1);
    expect(results[0].status).toBe("sent");
    expect(results[0].mode).toBe("log");
    expect(results[0].recipientActual).toBe("232451@kit.ac.in");
    expect(results[0].recipientEffective).toBe("232451@kit.ac.in");
    expect(results[0].messageId).toContain("log-");
  });

  it("reroutes all emails to EMAIL_TEST_RECIPIENT when configured", async () => {
    process.env.EMAIL_MODE = "log";
    process.env.EMAIL_TEST_RECIPIENT = "test-inbox@kit.ac.in";

    const mockStudent = {
      id: 2,
      name: "Aastha Tiwari",
      afn: "232457",
      rollNumber: "2301650100002",
      email: "232457@kit.ac.in",
      year: "4th Year",
      batch: "2023-27",
      course: "B.Tech",
      section: "A",
      stream: "COMPUTER SCIENCE AND ENGINEERING",
      gender: "Female",
    };

    const mockForm = {
      id: "INIT-BCS751",
      subjectCode: "BCS751",
      title: "Mini Project",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      year: "4th Year",
      section: "A",
      deadline: "2026-10-21",
      status: "Active",
    };

    const results = await sendReminderEmails({
      form: mockForm,
      students: [mockStudent],
      senderName: "Rahul Singh",
      senderEmail: "hod@kit.ac.in",
    });

    expect(results[0].recipientActual).toBe("232457@kit.ac.in");
    expect(results[0].recipientEffective).toBe("test-inbox@kit.ac.in");
  });
});
