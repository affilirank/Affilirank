import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  fetchChannelInfo,
  setYoutubeAuth,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/youtube/callback?code=...&state=admin-connect
 * OAuth redirect target — exchanges the auth code, stores tokens, then sends
 * the admin back to the Auto-Publish tab.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  void searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://affilirank.com"}/admin?tab=autopublish&oauth=error`
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const channel = await fetchChannelInfo(tokens.access_token);
    await setYoutubeAuth({
      ...tokens,
      channel_id: channel.channel_id,
      channel_title: channel.channel_title,
      channel_avatar: channel.channel_avatar,
      connected_at: new Date().toISOString(),
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://affilirank.com"}/admin?tab=autopublish&oauth=success`
    );
  } catch (e) {
    console.error("YouTube OAuth callback failed:", e);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://affilirank.com"}/admin?tab=autopublish&oauth=error`
    );
  }
}
