import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST /api/admin/logout — clears the admin session cookie. */
export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
