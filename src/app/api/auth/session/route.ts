import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, RoleType } from "@/lib/auth";
import {
  signSessionToken,
  getAuthenticatedSession,
} from "@/lib/sessionAuth";

const SessionSchema = z.object({
  role: z.enum(["HOD", "COORDINATOR"]),
  email: z.string().email(),
  name: z.string().min(1),
  dept: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SessionSchema.parse(body);

    const token = signSessionToken(validated);

    const response = NextResponse.json({
      success: true,
      session: validated,
      token,
    });

    // Set signed cookie: HttpOnly, SameSite=Lax, 7 days
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: false, // allow client-side sync if needed, but signed with HMAC
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid session request payload." },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getAuthenticatedSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, session });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, loggedOut: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
