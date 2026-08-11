import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/tenant";
import {
  exchangeCodeForTokens,
  fetchChannelInfo,
  getGoogleAuth,
  redirectUriFor,
  setYoutubeAuth,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/callback?code=...&state=admin-connect
 * OAuth redirect target — exchanges the auth code, stores tokens for the
 * current tenant, then sends the admin back to the Auto-Publish tab.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  void url.searchParams.get("state");

  const origin = url.origin;
  const tenant = await getCurrentTenant();
  const siteUrl = `${origin}/admin?tab=autopublish`;

  if (error) {
    return NextResponse.redirect(`${siteUrl}&oauth=error`);
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const creds = await getGoogleAuth(tenant.id);
    if (!creds) throw new Error("Google OAuth credentials are not configured");
    const tokens = await exchangeCodeForTokens(
      code,
      creds,
      redirectUriFor(origin)
    );
    const channel = await fetchChannelInfo(tokens.access_token);
    await setYoutubeAuth(tenant.id, {
      ...tokens,
      channel_id: channel.channel_id,
      channel_title: channel.channel_title,
      channel_avatar: channel.channel_avatar,
      connected_at: new Date().toISOString(),
    });
    return NextResponse.redirect(`${siteUrl}&oauth=success`);
  } catch (e) {
    console.error("YouTube OAuth callback failed:", e);
    return NextResponse.redirect(`${siteUrl}&oauth=error`);
  }
}
