import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerForm, upsertServerForm } from "@/lib/serverForms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    const form = await getServerForm(cleanId);
    if (!form || form.isTrashed) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, form });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch form" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    const body = await request.json();

    const existing = await getServerForm(cleanId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404 }
      );
    }

    const updated = await upsertServerForm({
      ...existing,
      ...body,
      id: existing.id,
    });

    return NextResponse.json({ success: true, form: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update form" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      await prisma.submission.deleteMany({ where: { formId: cleanId } });
      await prisma.project.deleteMany({ where: { formId: cleanId } });
      await prisma.form.deleteMany({ where: { id: cleanId } });
      return NextResponse.json({ success: true, message: "Form permanently deleted" });
    }

    // Move to Trash with 7-day retention
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.form.update({
      where: { id: cleanId },
      data: {
        isTrashed: true,
        trashedAt: now,
        trashExpiresAt: expiresAt,
        deletedBy: "Rahul Singh (HOD)",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Form moved to trash with 7-day retention",
      trashExpiresAt: expiresAt.toISOString(),
      form: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete form" },
      { status: 500 }
    );
  }
}
