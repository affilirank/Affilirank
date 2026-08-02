import { NextResponse } from "next/server";
import { getAllDeals } from "@/lib/data";
import { isAdminAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 * Admin only — every deal including drafts, newest first. Used by the
 * dashboard product list.
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deals = await getAllDeals();
  return NextResponse.json(deals);
}
