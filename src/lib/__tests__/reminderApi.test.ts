import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { signSessionToken } from "../sessionAuth";
import { AUTH_COOKIE_NAME } from "../auth";
import { POST, GET } from "../../app/api/forms/[id]/remind/route";
import { upsertServerForm } from "../serverForms";
import { prisma } from "../prisma";

describe("API Route: /api/forms/[id]/remind", () => {
  beforeAll(async () => {
    await upsertServerForm({
      id: "INIT-BCS751",
      subjectCode: "BCS751",
      title: "Mini Project",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      year: "4th Year",
      section: "A",
      deadline: "2026-11-30",
      status: "Active",
    });
  });

  afterAll(async () => {
    await prisma.submission.deleteMany({ where: { formId: "INIT-BCS751" } });
    await prisma.form.deleteMany({ where: { id: "INIT-BCS751" } });
  });

  const hodSession = {
    role: "HOD" as const,
    email: "hod@kit.ac.in",
    name: "Rahul Singh",
    dept: "Dept. of Computer Science & Engineering",
  };

  const studentSession = {
    role: "STUDENT" as any,
    email: "student@kit.ac.in",
    name: "Test Student",
    dept: "CSE",
  };

  const logFilePath = path.join(process.cwd(), "src/data/reminder-log.json");
  let originalLog = "[]";

  beforeEach(async () => {
    try {
      originalLog = await fs.readFile(logFilePath, "utf-8");
    } catch {
      originalLog = "[]";
    }
    await fs.writeFile(logFilePath, "[]", "utf-8");
  });

  afterEach(async () => {
    try {
      await fs.writeFile(logFilePath, originalLog, "utf-8");
    } catch {}
  });

  it("returns 401 Unauthorized when session cookie is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Authentication required");
  });

  it("returns 403 Forbidden when session has an unauthorized role", async () => {
    const signedToken = signSessionToken(studentSession as any);
    const req = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 404 if form does not exist", async () => {
    const signedToken = signSessionToken(hodSession);
    const req = new NextRequest("http://localhost:3000/api/forms/NONEXISTENT999/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "NONEXISTENT999" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 200 and stats via GET endpoint", async () => {
    const req = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "GET",
    });

    const res = await GET(req, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.subjectCode).toBe("BCS751");
    expect(data.totalCohort).toBe(60);
  });

  it("dispatches reminder to student and enforces 24h cooldown on immediate retry", async () => {
    const signedToken = signSessionToken(hodSession);

    // First call: dispatches reminder
    const req1 = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ studentIds: ["1"] }),
    });

    const res1 = await POST(req1, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.sent).toBe(1);
    expect(data1.skipped).toBe(0);

    // Immediate second call: must be skipped due to 24h cooldown!
    const req2 = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ studentIds: ["1"] }),
    });

    const res2 = await POST(req2, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sent).toBe(0);
    expect(data2.skipped).toBe(1);
    expect(data2.message).toContain("Cooldown is active");
  });

  it("dispatches reminder to custom test recipient (e.g. muditcodes@gmail.com)", async () => {
    const signedToken = signSessionToken({
      role: "HOD",
      email: "muditcodes@gmail.com",
      name: "Rahul Singh",
      dept: "Dept. of Computer Science & Engineering",
    });

    const req = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentIds: [],
        customRecipients: [
          { email: "muditcodes@gmail.com", name: "Mudit Test" },
        ],
        customSubject: "Direct Test Reminder",
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(1);
  });

  it("successfully resolves and dispatches reminders for dynamic form IDs like INIT-759402", async () => {
    const signedToken = signSessionToken({
      role: "HOD",
      email: "muditcodes@gmail.com",
      name: "Rahul Singh",
      dept: "Dept. of Computer Science & Engineering",
    });

    const req = new NextRequest("http://localhost:3000/api/forms/INIT-759402/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentIds: [],
        customRecipients: [
          { email: "muditcodes@gmail.com", name: "Mudit" },
          { email: "tvandana342@gmail.com" },
        ],
        customSubject: "Dynamic Form Test",
        formMeta: {
          id: "INIT-759402",
          subjectCode: "BCS751",
          title: "Mini Project",
          course: "B.Tech",
          stream: "Computer Science & Engineering",
          year: "4th Year",
          section: "A",
          deadline: "2026-10-21",
          status: "Active",
        },
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "INIT-759402" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.sent).toBe(2);
  });

  it("rejects invalid request body with 400 Bad Request", async () => {
    const signedToken = signSessionToken(hodSession);
    const req = new NextRequest("http://localhost:3000/api/forms/BCS751/remind", {
      method: "POST",
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ studentIds: "not-an-array-invalid" }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "BCS751" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid request payload");
  });
});
