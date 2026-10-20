import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { isStudentEligibleForForm } from "@/lib/formTargeting";
import { upsertServerForm, getAllServerForms } from "@/lib/serverForms";
import { GET as getForms, POST as postForm } from "@/app/api/forms/route";
import { GET as getStudent } from "@/app/api/students/[afn]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

describe("Form Publishing & Student Reflection Suite", () => {
  afterAll(async () => {
    await prisma.submission.deleteMany({
      where: { formId: { startsWith: "INIT-TEST-" } },
    });
    await prisma.form.deleteMany({
      where: { id: { startsWith: "INIT-TEST-" } },
    });
  });
  it("matches student cohort correctly across sections", () => {
    const studentSecA = {
      course: "B.Tech",
      year: "4th Year",
      stream: "COMPUTER SCIENCE AND ENGINEERING",
      section: "A",
    };

    const studentSecB = {
      course: "B.Tech",
      year: "4th Year",
      stream: "COMPUTER SCIENCE AND ENGINEERING",
      section: "B",
    };

    const formAllSections = {
      course: "B.Tech",
      year: "4th Year",
      stream: "Computer Science & Engineering",
      section: "All",
    };

    const formSecBOnly = {
      course: "B.Tech",
      year: "4th Year",
      stream: "Computer Science & Engineering",
      section: "B",
    };

    // All sections form should match both A and B
    expect(isStudentEligibleForForm(studentSecA, formAllSections)).toBe(true);
    expect(isStudentEligibleForForm(studentSecB, formAllSections)).toBe(true);

    // Section B form should only match Section B
    expect(isStudentEligibleForForm(studentSecA, formSecBOnly)).toBe(false);
    expect(isStudentEligibleForForm(studentSecB, formSecBOnly)).toBe(true);
  });

  it("publishes a new form via API and retrieves it in forms list", async () => {
    const testId = `INIT-TEST-${Date.now().toString().slice(-5)}`;
    const postReq = new NextRequest("http://localhost:3000/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: testId,
        title: "Cloud Computing Capstone Registration Form",
        subjectCode: "KCS752",
        course: "B.Tech",
        stream: "Computer Science & Engineering",
        year: "4th Year",
        section: "All",
        deadline: "2026-12-15",
        status: "Active",
      }),
    });

    const postRes = await postForm(postReq);
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.form.id).toBe(testId);

    // Retrieve via GET /api/forms
    const getReq = new NextRequest("http://localhost:3000/api/forms");
    const getRes = await getForms(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBe(true);

    const found = getData.forms.find((f: any) => f.id === testId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Cloud Computing Capstone Registration Form");
    expect(found.section).toBe("All");
  });

  it("finds student by roll number as well as AFN", async () => {
    // 232457 is Aastha Tiwari, rollNumber is 2301650100002
    const afnReq = new NextRequest("http://localhost:3000/api/students/232457");
    const afnRes = await getStudent(afnReq, { params: Promise.resolve({ afn: "232457" }) });
    expect(afnRes.status).toBe(200);
    const afnStudent = await afnRes.json();
    expect(afnStudent.name).toBe("Aastha Tiwari");

    const rollReq = new NextRequest("http://localhost:3000/api/students/2301650100002");
    const rollRes = await getStudent(rollReq, { params: Promise.resolve({ afn: "2301650100002" }) });
    expect(rollRes.status).toBe(200);
    const rollStudent = await rollRes.json();
    expect(rollStudent.name).toBe("Aastha Tiwari");
  });
});
