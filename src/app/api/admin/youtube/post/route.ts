import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/youtube/post  { dealId }
 * Enqueue a deal for auto-posting — sets auto_post_status='pending' so the
 * worker picks it up. Also supports { dealId: null } to enqueue all
 * published deals without a video yet.
 */
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dealId } = (await req.json().catch(() => ({}))) as {
    dealId?: string | null;
  };

  const sb = await createSupabaseServerClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  if (dealId) {
    const { error } = await sb
      .from("products")
      .update({ auto_post_status: "pending" })
      .eq("id", dealId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, enqueued: 1 });
  }

  // Enqueue all published deals without a video yet
  const { data, error } = await sb
    .from("products")
    .update({ auto_post_status: "pending" })
    .eq("published", true)
    .is("youtube_video_id", null)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enqueued: data?.length ?? 0 });
}
