import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import studentsData from "@/data/students.json";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const stream = searchParams.get("stream");
    const gender = searchParams.get("gender");

    const where: any = {};
    if (stream && stream !== "all") where.stream = stream;
    if (gender && gender !== "all") where.gender = gender;
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { afn: { contains: query } },
        { rollNumber: { contains: query } },
        { email: { contains: query } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { id: "asc" },
    });

    if (students.length > 0) {
      return NextResponse.json({ success: true, students });
    }
  } catch {
    // fallback
  }

  return NextResponse.json({ success: true, students: studentsData });
}
