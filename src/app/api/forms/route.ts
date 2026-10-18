import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllServerForms, upsertServerForm } from "@/lib/serverForms";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const course = searchParams.get("course");
    const year = searchParams.get("year");
    const section = searchParams.get("section");

    const where: any = { isTrashed: false };
    if (status) where.status = status;
    if (course) where.course = course;
    if (year) where.year = year;
    if (section) where.section = section;

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      forms: forms.map((f) => ({
        id: f.id,
        subjectCode: f.subjectCode,
        title: f.title,
        course: f.course,
        stream: f.stream,
        year: f.year,
        section: f.section,
        category: f.category,
        projectType: f.projectType,
        customProjectName: f.customProjectName,
        startDate: f.startDate,
        deadline: f.deadline,
        publishedAt: f.publishedAt,
        status: f.status,
        publishedBy: f.publishedBy,
        assignedTo: f.assignedTo,
        coordinator: {
          name: f.coordinatorName,
          email: f.coordinatorEmail,
          phone: f.coordinatorPhone,
          role: f.coordinatorRole,
        },
        finalSubmissionOpen: f.finalSubmissionOpen,
        finalSubmissionDeadline: f.finalSubmissionDeadline,
        presentationsScheduled: f.presentationsScheduled,
        presentationsConfig: f.presentationsConfig ? JSON.parse(f.presentationsConfig) : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || `INIT-${Math.floor(100000 + Math.random() * 900000)}`;

    const saved = await upsertServerForm({
      ...body,
      id,
    });

    return NextResponse.json({
      success: true,
      form: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create form" },
      { status: 500 }
    );
  }
}
