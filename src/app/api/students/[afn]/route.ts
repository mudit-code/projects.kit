import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import studentsData from "@/data/students.json";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ afn: string }> }
) {
  const { afn } = await params;

  try {
    const student = await prisma.student.findUnique({
      where: { afn },
    });

    if (student) {
      return NextResponse.json(student);
    }
  } catch {
    // fallback
  }

  const fallbackStudent = (studentsData as any[]).find(
    (s) => String(s.afn) === String(afn)
  );

  if (!fallbackStudent) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(fallbackStudent);
}
