import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { setYoutubeAuth } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/youtube/disconnect
 * Removes the current tenant's stored YouTube tokens (does not revoke on
 * Google's side).
 */
export async function DELETE() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  await setYoutubeAuth(tenant.id, null);
  return NextResponse.json({ ok: true });
}
