import { NextRequest, NextResponse } from "next/server";
import { setAdminSessionCookie, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/login
 * Public — verifies the admin password and issues a signed HttpOnly cookie.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? "");

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
