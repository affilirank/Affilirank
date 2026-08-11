import { NextResponse } from "next/server";
import { getAllDeals } from "@/lib/data";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * Admin only — every deal including drafts for the current tenant, newest
 * first. Used by the dashboard product list.
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const deals = await getAllDeals(tenant.id);
  return NextResponse.json(deals);
}
