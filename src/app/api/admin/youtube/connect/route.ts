import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
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
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  if (!(await googleOAuthConfigured(tenant.id))) {
    return NextResponse.json(
      { error: "Google OAuth is not configured — add your client ID + secret in the Auto-Publish tab" },
      { status: 400 }
    );
  }
  const auth = await getYoutubeAuth(tenant.id);
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    authUrl: await buildAuthUrl("admin-connect", tenant.id, origin),
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
