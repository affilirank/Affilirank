import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  getAutopublishSettings,
  getGoogleAuth,
  getYoutubeAuth,
  googleOAuthConfigured,
} from "@/lib/youtube";
import { getAllDeals } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/status
 * Connection state + autopublish settings + per-deal video status.
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [auth, settings, deals, googleAuth, configured] = await Promise.all([
    getYoutubeAuth(),
    getAutopublishSettings(),
    getAllDeals(),
    getGoogleAuth(),
    googleOAuthConfigured(),
  ]);

  const dealsStatus = deals.map((d) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    published: d.published,
    hero_image: d.hero_image,
    auto_post_status: d.auto_post_status ?? null,
    youtube_video_id: d.youtube_video_id ?? null,
    youtube_url: d.youtube_url ?? null,
  }));

  return NextResponse.json({
    configured,
    /** Whether the client ID/secret came from Vercel env vars (host-managed). */
    envConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    google_auth: googleAuth
      ? {
          client_id: googleAuth.client_id,
          client_secret_set: Boolean(googleAuth.client_secret),
        }
      : null,
    connected: Boolean(auth),
    channel: auth
      ? { id: auth.channel_id, title: auth.channel_title, avatar: auth.channel_avatar ?? null }
      : null,
    connected_at: auth?.connected_at ?? null,
    settings,
    deals: dealsStatus,
  });
}
