import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const course = searchParams.get("course");
    const stream = searchParams.get("stream");
    const year = searchParams.get("year");

    const where: any = {};
    if (session) where.session = session;
    if (course) where.course = course;
    if (stream) where.stream = stream;
    if (year) where.year = year;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        formId: p.formId,
        session: p.session,
        course: p.course,
        stream: p.stream,
        year: p.year,
        section: p.section,
        status: p.status,
        guideName: p.guideName,
        guideEmail: p.guideEmail,
        teamLeaderAfn: p.teamLeaderAfn,
        teamLeaderName: p.teamLeaderName,
        teamLeaderEmail: p.teamLeaderEmail,
        teamMembers: p.teamMembers ? JSON.parse(p.teamMembers) : [],
        repoUrl: p.repoUrl,
        liveUrl: p.liveUrl,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const teamMembersStr = body.teamMembers
      ? typeof body.teamMembers === "string"
        ? body.teamMembers
        : JSON.stringify(body.teamMembers)
      : null;

    const project = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description || null,
        category: body.category || "Academic",
        formId: body.formId || null,
        session: body.session || "2026-27",
        course: body.course || "B.Tech",
        stream: body.stream || "Computer Science & Engineering",
        year: body.year || "4th Year",
        section: body.section || "A",
        status: body.status || "In Progress",
        guideName: body.guideName || null,
        guideEmail: body.guideEmail || null,
        teamLeaderAfn: body.teamLeaderAfn || null,
        teamLeaderName: body.teamLeaderName || null,
        teamLeaderEmail: body.teamLeaderEmail || null,
        teamMembers: teamMembersStr,
        repoUrl: body.repoUrl || null,
        liveUrl: body.liveUrl || null,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
