import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/forms/available
 *
 * Available project registration forms are driven directly by published
 * initiatives (kit_published_initiatives) on the client, keeping the
 * student portal in 100% real-time synchronization with the HOD/Faculty dashboard.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ forms: [] });
}
