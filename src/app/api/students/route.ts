import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import studentsData from "@/data/students.json";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim().toLowerCase();
    const stream = searchParams.get("stream");
    const gender = searchParams.get("gender");

    let students = studentsData as any[];
    if (stream && stream !== "all") {
      students = students.filter((s) => s.stream?.toLowerCase() === stream.toLowerCase());
    }
    if (gender && gender !== "all") {
      students = students.filter((s) => s.gender?.toLowerCase() === gender.toLowerCase());
    }
    if (query) {
      students = students.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.afn && String(s.afn).toLowerCase().includes(query)) ||
          (s.rollNumber && String(s.rollNumber).toLowerCase().includes(query)) ||
          (s.email && s.email.toLowerCase().includes(query))
      );
    }

    return NextResponse.json(
      { success: true, students },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: true, students: studentsData },
      {
        headers: {
          "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
        },
      }
    );
  }
}
