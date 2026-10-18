import { NextRequest, NextResponse } from "next/server";
import {
  getServerSubmissionsForForm,
  saveServerSubmission,
  getAllServerSubmissions,
} from "@/lib/serverForms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    const submissions = await getServerSubmissionsForForm(cleanId);
    const all = await getAllServerSubmissions();

    return NextResponse.json({
      success: true,
      formId: cleanId,
      submissions,
      all,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    const body = await request.json();
    const submission = body.submission || body;

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Missing submission data" },
        { status: 400 }
      );
    }

    const saved = await saveServerSubmission(cleanId, submission);

    return NextResponse.json({
      success: true,
      formId: cleanId,
      submission: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save submission" },
      { status: 500 }
    );
  }
}
