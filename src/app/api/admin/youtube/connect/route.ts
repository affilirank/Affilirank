import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  buildAuthUrl,
  googleOAuthConfigured,
  getYoutubeAuth,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/connect
 * Returns the Google OAuth URL for the admin to connect their channel.
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (missing GOOGLE_CLIENT_ID/SECRET)" },
      { status: 400 }
    );
  }
  const auth = await getYoutubeAuth();
  return NextResponse.json({
    authUrl: buildAuthUrl("admin-connect"),
    connected: Boolean(auth),
    channel: auth
      ? {
          id: auth.channel_id,
          title: auth.channel_title,
          avatar: auth.channel_avatar ?? null,
        }
      : null,
  });
}
