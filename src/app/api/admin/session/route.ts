import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { isMockMode } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/session
 * Public — tells the login page / dashboard whether the session cookie is
 * valid, and whether the app is running in mock (no-Supabase) mode.
 */
export async function GET() {
  return NextResponse.json({
    authed: await isAdminAuthed(),
    mockMode: isMockMode(),
  });
}
