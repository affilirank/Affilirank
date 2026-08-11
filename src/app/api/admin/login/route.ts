import { NextRequest, NextResponse } from "next/server";
import { setAdminSessionCookie, verifyTenantPassword } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/login
 * Public — verifies the current tenant's admin password and issues a signed
 * HttpOnly cookie bound to that tenant.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? "");
  const tenant = await getCurrentTenant();

  if (!password || !verifyTenantPassword(password, tenant)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAdminSessionCookie(tenant.id);
  return NextResponse.json({ ok: true });
}
