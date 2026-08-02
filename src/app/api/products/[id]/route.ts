import { NextRequest, NextResponse } from "next/server";
import { deleteDeal, updateDeal } from "@/lib/data";
import { isAdminAuthed } from "@/lib/auth";
import type { DealDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/products/[id]
 * Admin — update a deal (publish toggle, manual override edits, countdown,
 * category, everything).
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const deal = await updateDeal(id, body as Partial<DealDraft>);
    return NextResponse.json(deal);
  } catch (error) {
    const status = error instanceof Error && error.name === "LicenseGateError" ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deal" },
      { status }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Admin — remove a deal from the stream + dashboard.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ok = await deleteDeal(id);
  return NextResponse.json({ ok });
}
