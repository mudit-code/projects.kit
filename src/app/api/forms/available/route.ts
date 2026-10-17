import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/forms/available?year=4th Year&course=B.Tech&stream=COMPUTER SCIENCE AND ENGINEERING
 *
 * Fetches available project registration forms for a given student's
 * year, course, and stream. Sources from localStorage-persisted
 * initiatives on the admin side (kit_published_initiatives) and
 * provides a default form if none exist.
 *
 * Since localStorage is client-only, we return a static default form
 * and the client component also checks localStorage for dynamic forms.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || "";
  const course = searchParams.get("course") || "";
  const stream = searchParams.get("stream") || "";

  // Default institutional form — always available for demo
  const defaultForms = [
    {
      id: "FORM-75101",
      title: "Mini Project (Capstone Phase-I) Registration & Proposal Form",
      description:
        "Official departmental registration form for project topic approval, supervisor selection, and team composition.",
      dispatchedBy: "Rahul Singh (HOD)",
      roleBadge: "HOD",
      subjectCode: "KCS-751",
      category: "Academic",
      course: "B.Tech",
      stream: "CSE",
      year: "4th",
      section: "B",
      startDate: "2026-10-15",
      deadline: "2026-11-30",
      status: "Open",
    },
  ];

  // Filter based on provided params (loose match for demo)
  const filtered = defaultForms.filter((f) => {
    const yearMatch =
      !year || year.includes(f.year) || f.year.includes(year.replace(" Year", ""));
    const courseMatch = !course || f.course === course;
    return yearMatch && courseMatch;
  });

  return NextResponse.json({ forms: filtered });
}
