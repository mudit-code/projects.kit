import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import studentsData from "@/data/students.json";

// High-performance O(1) in-memory indices for ultra-fast student lookups
const studentByAfn = new Map<string, any>();
const studentByRoll = new Map<string, any>();
const dynamicStudentCache = new Map<string, any>();

// Populate static index on module initialization
for (const s of (studentsData as any[])) {
  if (s.afn) {
    studentByAfn.set(String(s.afn).trim().toUpperCase(), s);
  }
  if (s.rollNumber) {
    studentByRoll.set(String(s.rollNumber).trim().toUpperCase(), s);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ afn: string }> }
) {
  const { afn } = await params;
  const cleanId = decodeURIComponent(afn || "").trim().toUpperCase();

  if (!cleanId) {
    return NextResponse.json({ error: "Missing AFN or Roll Number" }, { status: 400 });
  }

  // 1. Instant O(1) in-memory lookup from static roster (0ms)
  const cachedFromStatic = studentByAfn.get(cleanId) || studentByRoll.get(cleanId);
  if (cachedFromStatic) {
    return NextResponse.json(cachedFromStatic, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  }

  // 2. Check dynamic cache (e.g. newly added students) (0ms)
  const dynamicCached = dynamicStudentCache.get(cleanId);
  if (dynamicCached) {
    return NextResponse.json(dynamicCached, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  }

  // 3. Fallback to database only if not found in static roster
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { afn: cleanId },
          { rollNumber: cleanId },
          { afn: { equals: cleanId, mode: "insensitive" } },
          { rollNumber: { equals: cleanId, mode: "insensitive" } },
        ],
      },
    });

    if (student) {
      if (student.afn) dynamicStudentCache.set(student.afn.toUpperCase(), student);
      if (student.rollNumber) dynamicStudentCache.set(student.rollNumber.toUpperCase(), student);
      return NextResponse.json(student, {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    }
  } catch {
    // database error fallback
  }

  return NextResponse.json(
    { error: "Student not found" },
    { status: 404 }
  );
}

