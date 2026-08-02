import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";

export const dynamic = "force-dynamic";

/**
 * POST /api/scrape
 * Admin — accepts a JVZoo URL, auto-appends the site's affiliate tag, fetches
 * the sales page server-side and returns normalized OpenGraph / JSON-LD data
 * (title, description, hero image, VSL video, pricing, highlights).
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = String(body?.url ?? "").trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await scrapeUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
