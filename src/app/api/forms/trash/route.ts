import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    // 1. Auto-purge any items whose 7-day retention has expired
    const expired = await prisma.form.findMany({
      where: {
        isTrashed: true,
        trashExpiresAt: { lte: now },
      },
    });

    if (expired.length > 0) {
      const expiredIds = expired.map((e) => e.id);
      await prisma.submission.deleteMany({ where: { formId: { in: expiredIds } } });
      await prisma.form.deleteMany({ where: { id: { in: expiredIds } } });
    }

    // 2. Fetch all currently active trashed forms
    const trashed = await prisma.form.findMany({
      where: {
        isTrashed: true,
        trashExpiresAt: { gt: now },
      },
      orderBy: { trashedAt: "desc" },
    });

    const items = trashed.map((f) => ({
      id: f.id,
      deletedAt: f.trashedAt ? f.trashedAt.toISOString() : now.toISOString(),
      expiresAt: f.trashExpiresAt ? f.trashExpiresAt.toISOString() : new Date(now.getTime() + 7 * 86400000).toISOString(),
      deletedBy: f.deletedBy || "Rahul Singh (HOD)",
      form: {
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
      },
    }));

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch trash" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const trashed = await prisma.form.findMany({
      where: { isTrashed: true },
      select: { id: true },
    });

    const ids = trashed.map((t) => t.id);
    if (ids.length > 0) {
      await prisma.submission.deleteMany({ where: { formId: { in: ids } } });
      await prisma.form.deleteMany({ where: { id: { in: ids } } });
    }

    return NextResponse.json({ success: true, message: "Trash emptied completely" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to empty trash" },
      { status: 500 }
    );
  }
}
