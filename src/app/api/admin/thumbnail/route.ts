import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getDealById } from "@/lib/data";
import { generateAiThumbnail } from "@/lib/thumbnail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/thumbnail
 * Admin — generate a Gemini AI thumbnail for a deal, upload it to the public
 * previews bucket and repoint the deal's hero_image at it.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const dealId = String(body?.dealId ?? "").trim();
  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const deal = await getDealById(dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  try {
    const result = await generateAiThumbnail(deal);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Thumbnail generation failed" },
      { status: 500 }
    );
  }
}
