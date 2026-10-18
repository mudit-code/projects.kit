import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/forms/[id]/submissions/route";
import { getServerSubmissionsForForm, upsertServerForm, saveServerSubmission } from "../serverForms";
import { prisma } from "../prisma";

describe("Submissions API & Server Synchronization", () => {
  beforeAll(async () => {
    // Seed test form
    await upsertServerForm({
      id: "INIT-759402",
      subjectCode: "BCS751",
      title: "Mini Project",
      course: "B.Tech",
      stream: "Computer Science & Engineering",
      year: "4th Year",
      section: "A",
      deadline: "2026-11-30",
      status: "Active",
    });

    // Seed test submission for Aman Kumar
    await saveServerSubmission("INIT-759402", {
      formId: "INIT-759402",
      registrationType: "individual",
      student: {
        afn: "233206",
        name: "Aman Kumar",
        rollNumber: "2301650100024",
        email: "233206@kit.ac.in",
        course: "B.Tech",
        stream: "COMPUTER SCIENCE AND ENGINEERING",
        year: "4th Year",
      },
      projectName: "AI-Powered Campus Surveillance & Management System",
      projectDescription: "An integrated computer vision system",
      submittedAt: new Date().toISOString(),
      verificationStatus: "verified",
    });
  });

  afterAll(async () => {
    await prisma.submission.deleteMany({ where: { formId: "INIT-759402" } });
    await prisma.form.deleteMany({ where: { id: "INIT-759402" } });
  });

  it("retrieves submissions for INIT-759402 including Aman Kumar", async () => {
    const req = new NextRequest("http://localhost:3000/api/forms/INIT-759402/submissions", {
      method: "GET",
    });

    const res = await GET(req, {
      params: Promise.resolve({ id: "INIT-759402" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.submissions)).toBe(true);

    const aman = body.submissions.find(
      (s: any) => s.student?.afn === "233206" || s.student?.rollNumber === "2301650100024"
    );
    expect(aman).toBeDefined();
    expect(aman.student.name).toBe("Aman Kumar");
  });

  it("retrieves submissions for BCS751 and matches correctly", async () => {
    const submissions = await getServerSubmissionsForForm("BCS751");
    expect(Array.isArray(submissions)).toBe(true);
    const aman = submissions.find((s) => s.student?.afn === "233206");
    expect(aman).toBeDefined();
    expect(aman?.projectName).toContain("Campus");
  });

  it("persists a new submission and returns it via API", async () => {
    const testSub = {
      formId: "INIT-759402",
      registrationType: "individual",
      student: {
        afn: "233267",
        name: "Aman Patel",
        rollNumber: "2301650100025",
        email: "233267@kit.ac.in",
        course: "B.Tech",
        stream: "COMPUTER SCIENCE AND ENGINEERING",
        year: "4th Year",
      },
      projectName: "Decentralized Credential Verification System",
      projectDescription: "Blockchain-based student degree and merit verification",
      teamMembers: [],
      submittedAt: new Date().toISOString(),
      verificationStatus: "verified",
    };

    const req = new NextRequest("http://localhost:3000/api/forms/INIT-759402/submissions", {
      method: "POST",
      body: JSON.stringify(testSub),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: "INIT-759402" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission.student.afn).toBe("233267");

    const refreshed = await getServerSubmissionsForForm("INIT-759402");
    const patel = refreshed.find((s) => s.student?.afn === "233267");
    expect(patel).toBeDefined();
    expect(patel?.student?.name).toBe("Aman Patel");
  });
});
