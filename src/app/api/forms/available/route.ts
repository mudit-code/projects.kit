import { NextRequest, NextResponse } from "next/server";
import { getAllServerForms } from "@/lib/serverForms";

/**
 * GET /api/forms/available
 *
 * Returns active forms from the real database for student registration.
 */
export async function GET(_request: NextRequest) {
  try {
    const forms = await getAllServerForms();
    return NextResponse.json({ forms });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, forms: [], error: err?.message },
      { status: 500 }
    );
  }
}
