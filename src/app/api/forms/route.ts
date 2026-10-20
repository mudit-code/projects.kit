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

    const allForms = await getAllServerForms();
    let forms = allForms;
    if (status && status !== "ALL" && status !== "All") forms = forms.filter((f) => f.status === status);
    if (course && course !== "All" && course !== "All Courses") forms = forms.filter((f) => f.course === course);
    if (year && year !== "All" && year !== "All Years") forms = forms.filter((f) => f.year === year);
    if (section && section !== "All" && section !== "All Sections") forms = forms.filter((f) => f.section === section);

    return NextResponse.json(
      {
        success: true,
        forms,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
        },
      }
    );
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
