import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { slugify } from "@/lib/utils";
import { getYoutubeAuth } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET /r/[...path]
 * Public — brandable link shortener for video descriptions. Keeps the raw
 * JVZoo affiliate URL (which looks spammy and links to the wrong place in
 * YouTube) out of the description, and instead points at a trusted short URL
 * on the site itself:
 *
 *   /r/<youtube-profile-name>/<deal-slug>          -> affiliate_url (front-end)
 *   /r/<youtube-profile-name>/bundle/<deal-slug>   -> bundle_url
 *
 * The leading profile-name segment is cosmetic (it makes the URL look like it
 * belongs to the channel) but is not required — `/r/<deal-slug>` and
 * `/r/bundle/<deal-slug>` work too. The lookup is by the last path segment
 * (the deal slug), and the target lives in the DB so links never go stale:
 * edit the deal in the admin portal and every past description updates.
 */
export async function GET(request: NextRequest) {
  const segments = request.nextUrl.pathname
    .replace(/^\/r\/?/, "")
    .split("/")
    .filter(Boolean);

  const bundle = segments.includes("bundle");
  const dealSlug = segments[segments.length - 1];
  if (!dealSlug) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const sb = await createSupabaseServerClient();
  const deal = sb
    ? await sb.from("products").select("*").eq("slug", dealSlug).maybeSingle()
    : { data: null, error: null };

  const target =
    bundle && !deal.error
      ? (deal.data?.bundle_url ?? deal.data?.affiliate_url)
      : deal.data?.affiliate_url;

  if (deal.error || !target) {
    return NextResponse.redirect(new URL("/deals", request.url), 302);
  }

  // Best-effort click tracking (fire-and-forget, never blocks the redirect).
  void (async () => {
    try {
      const [auth] = await Promise.all([getYoutubeAuth()]);
      const profile = slugify(auth?.channel_title ?? "");
      await sb?.from("deal_events").insert({
        event: "shortlink_click",
        payload: {
          deal_id: deal.data.id,
          deal_slug: dealSlug,
          kind: bundle ? "bundle" : "front-end",
          profile: profile || undefined,
        },
        page_url: request.url.slice(0, 500),
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      });
    } catch {
      // never block the redirect on a tracking failure
    }
  })();

  return NextResponse.redirect(target, 302);
}
