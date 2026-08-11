import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { normalizeAffiliateUrl, scrapeUrl } from "@/lib/scraper";
import { getYoutubeAuth, googleOAuthConfigured } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * POST /api/scrape
 * Admin — accepts a JVZoo URL, auto-appends the site's affiliate tag, fetches
 * the sales page server-side and returns normalized OpenGraph / JSON-LD data
 * (title, description, hero image, VSL video, pricing, highlights).
 *
 * Requires a connected YouTube channel first — the white-label deal stream is
 * built around the auto-publish engine, so parsing is gated on it.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await getCurrentTenant();
  const [auth, oauthConfigured] = await Promise.all([
    getYoutubeAuth(tenant.id),
    googleOAuthConfigured(tenant.id),
  ]);
  if (!oauthConfigured || !auth) {
    return NextResponse.json(
      {
        error:
          "Connect your YouTube channel first — parsing JVZoo links is enabled once auto-publish is set up.",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = String(body?.url ?? "").trim();
  const bundleUrl = String(body?.bundleUrl ?? "").trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const result = await scrapeUrl(url);
    if (bundleUrl) {
      return NextResponse.json({
        ...result,
        bundle_url: normalizeAffiliateUrl(bundleUrl),
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
