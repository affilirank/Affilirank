import { NextRequest, NextResponse } from "next/server";
import { getPublishedDeals } from "@/lib/data";
import { isAdminAuthed } from "@/lib/auth";
import type { DealDraft } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Public — returns published deals for the stream. Optional `category` and
 * `q` (search) query params.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const query = searchParams.get("q")?.toLowerCase().trim();

  const deals = await getPublishedDeals();

  let filtered = deals;
  if (category && category !== "all") {
    filtered = filtered.filter((d) => d.category === category);
  }
  if (query) {
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.subtitle?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.category?.toLowerCase().includes(query)
    );
  }

  return NextResponse.json(filtered);
}

/**
 * POST /api/products
 * Admin — create a new deal (used by the ingest + manual override flow).
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title?.trim() || !body?.affiliate_url?.trim()) {
    return NextResponse.json(
      { error: "title and affiliate_url are required" },
      { status: 400 }
    );
  }

  try {
    const deal = await import("@/lib/data").then((m) =>
      m.createDeal(body as DealDraft)
    );
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.name === "LicenseGateError" ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deal" },
      { status }
    );
  }
}

/**
 * DELETE /api/products
 * Admin — wipe the store (reset to seed in mock mode).
 */
export async function DELETE() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await import("@/lib/data").then((m) => m.resetToSeed());
  return NextResponse.json({ ok: true });
}
