import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/thumbnail?slug=...&variant=thumb|og
 *
 * Streams the auto-publisher's rendered deal thumbnail from Supabase Storage
 * back as an attachment download:
 *   thumb → previews/deals/{slug}.png   (the file YouTube thumbnails.set gets)
 *   og    → previews/og/{slug}.png      (1200x630 Facebook/X share image)
 *
 * Storage uses two layouts (newer worker uploads nest the tenant id:
 * deals/{tenantId}/{slug}.png, the older one is flat), so both are probed.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  const variant =
    req.nextUrl.searchParams.get("variant") === "og" ? "og" : "thumb";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json(
      { error: "Valid slug query parameter is required" },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return NextResponse.json(
      { error: "Supabase storage is not configured" },
      { status: 500 }
    );
  }

  const tenant = await getCurrentTenant();
  const root = `${base.replace(/\/$/, "")}/storage/v1/object/public/previews`;
  const prefixes = variant === "og" ? "og" : "deals";
  const paths = [
    `${prefixes}/${tenant.id}/${slug}.png`,
    `${prefixes}/${slug}.png`,
  ];

  let upstream: Response | null = null;
  for (const storagePath of paths) {
    const res = await fetch(`${root}/${storagePath}`, { cache: "no-store" });
    if (res.ok && res.body) {
      upstream = res;
      break;
    }
  }
  if (!upstream) {
    return NextResponse.json(
      {
        error: `No rendered thumbnail found in storage (previews/${prefixes}/…${slug}.png) — run the auto-publisher worker for this deal first.`,
      },
      { status: 404 }
    );
  }

  const filename =
    variant === "og"
      ? `${slug}-og-1200x630.png`
      : `${slug}-youtube-thumbnail.png`;
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
