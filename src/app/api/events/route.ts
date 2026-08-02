import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/events
 * Public — best-effort persistence of analytics events into the `deal_events`
 * table when Supabase is configured. Fire-and-forget from the browser.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const event = typeof body?.event === "string" ? body.event.slice(0, 120) : null;
  if (!event) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  const sb = await createSupabaseServerClient();
  if (sb) {
    const data = body.data && typeof body.data === "object" ? body.data : {};
    await sb.from("deal_events").insert({
      event,
      payload: data,
      page_url: body?.page_url?.slice(0, 500) ?? null,
      user_agent: body?.user_agent?.slice(0, 300) ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
