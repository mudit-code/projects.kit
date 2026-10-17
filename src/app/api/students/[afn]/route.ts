import { NextRequest, NextResponse } from "next/server";
import studentsData from "@/data/students.json";

type StudentRecord = {
  id: number;
  name: string;
  afn: string;
  rollNumber: string;
  email: string;
  year: string;
  batch: string;
  course: string;
  section: string;
  stream: string;
  gender: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ afn: string }> }
) {
  const { afn } = await params;

  const student = (studentsData as StudentRecord[]).find(
    (s) => s.afn === afn
  );

  if (!student) {
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(student);
}
