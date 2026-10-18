import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAllServerSubmissions,
  saveServerSubmission,
} from "@/lib/serverForms";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");

    if (formId) {
      const subs = await prisma.submission.findMany({
        where: { formId },
        orderBy: { submittedAt: "desc" },
      });
      return NextResponse.json({ success: true, submissions: subs });
    }

    const all = await getAllServerSubmissions();
    return NextResponse.json({ success: true, submissions: all });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formId = body.formId || body.submission?.formId || "INIT-PROJECT";
    const submission = body.submission || body;

    const saved = await saveServerSubmission(formId, submission);
    return NextResponse.json({ success: true, submission: saved });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, formId, studentAfn, verificationStatus, approvalStatus } = body;

    const where: any = {};
    if (id) {
      where.id = id;
    } else if (formId && studentAfn) {
      where.formId = formId;
      where.studentAfn = studentAfn;
    } else {
      return NextResponse.json(
        { success: false, error: "Must provide submission id or formId + studentAfn" },
        { status: 400 }
      );
    }

    const sub = await prisma.submission.findFirst({ where });
    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.submission.update({
      where: { id: sub.id },
      data: {
        ...(verificationStatus ? { verificationStatus } : {}),
        ...(approvalStatus ? { approvalStatus } : {}),
      },
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update submission" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const formId = searchParams.get("formId");
    const studentAfn = searchParams.get("studentAfn");

    if (id) {
      await prisma.submission.delete({ where: { id } });
    } else if (formId && studentAfn) {
      await prisma.submission.deleteMany({
        where: { formId, studentAfn },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Missing id or formId + studentAfn" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Submission removed" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete submission" },
      { status: 500 }
    );
  }
}
