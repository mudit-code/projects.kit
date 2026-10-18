import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    const form = await prisma.form.findUnique({ where: { id: cleanId } });
    if (!form) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    const restored = await prisma.form.update({
      where: { id: cleanId },
      data: {
        isTrashed: false,
        trashedAt: null,
        trashExpiresAt: null,
        deletedBy: null,
      },
    });

    return NextResponse.json({ success: true, message: "Form restored from trash", form: restored });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to restore form" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    await prisma.submission.deleteMany({ where: { formId: cleanId } });
    await prisma.project.deleteMany({ where: { formId: cleanId } });
    await prisma.form.deleteMany({ where: { id: cleanId } });

    return NextResponse.json({ success: true, message: "Form permanently purged from database" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to purge form" },
      { status: 500 }
    );
  }
}
