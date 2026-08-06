import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/constants";

/**
 * YouTube Data API v3 OAuth — server-side token store + refresh.
 *
 * Tokens live in the Supabase `settings` row (column `youtube_auth`) so they
 * survive across deployments and are readable by both the Next.js app (to
 * render connection state) and the Python upload worker (which uses the same
 * Supabase table). Access tokens are refreshed automatically before use.
 */

export interface YoutubeAuth {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  channel_id: string;
  channel_title: string;
  /** Channel profile picture URL — overlaid on generated thumbnails when enabled. */
  channel_avatar?: string | null;
  connected_at: string;
}

export interface AutopublishSettings {
  enabled: boolean;
  interval: "hourly" | "daily" | "manual";
  format: "short" | "standard";
  /** Overlay the channel avatar on generated thumbnails (CTR booster). */
  profile_in_thumbnails?: boolean;
  thumbnail_tone?: string;
}

export const DEFAULT_AUTOPUBLISH: AutopublishSettings = {
  enabled: false,
  interval: "hourly",
  format: "short",
  profile_in_thumbnails: true,
};

const clientId = () => process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";
export const YOUTUBE_REDIRECT_URI = `${SITE_URL}/api/admin/youtube/callback`;

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function googleOAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

/* ---------------------------------------------------------------------------
 * Settings persistence (Supabase `settings` row, id=1)
 * ------------------------------------------------------------------------- */

export async function getYoutubeAuth(): Promise<YoutubeAuth | null> {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("settings")
    .select("youtube_auth")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  const auth = (data as { youtube_auth: YoutubeAuth | null }).youtube_auth;
  return auth ?? null;
}

export async function setYoutubeAuth(
  auth: YoutubeAuth | null
): Promise<void> {
  const sb = await createSupabaseServerClient();
  if (!sb) return;
  await sb
    .from("settings")
    .upsert({ id: 1, youtube_auth: auth }, { onConflict: "id" });
}

export async function getAutopublishSettings(): Promise<AutopublishSettings> {
  const sb = await createSupabaseServerClient();
  if (!sb) return { ...DEFAULT_AUTOPUBLISH };
  const { data, error } = await sb
    .from("settings")
    .select("autopublish")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_AUTOPUBLISH };
  const stored = (data as { autopublish: AutopublishSettings | null })
    .autopublish;
  return { ...DEFAULT_AUTOPUBLISH, ...(stored ?? {}) };
}

export async function setAutopublishSettings(
  settings: AutopublishSettings
): Promise<AutopublishSettings> {
  const sb = await createSupabaseServerClient();
  if (!sb) return settings;
  const merged = { ...DEFAULT_AUTOPUBLISH, ...settings };
  await sb
    .from("settings")
    .upsert({ id: 1, autopublish: merged }, { onConflict: "id" });
  return merged;
}

/* ---------------------------------------------------------------------------
 * OAuth
 * ------------------------------------------------------------------------- */

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: YOUTUBE_REDIRECT_URI,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenRequest(
  body: URLSearchParams
): Promise<Record<string, string | number>> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as Record<string, string | number>;
  if (!res.ok) {
    throw new Error(
      String(json?.error_description ?? json?.error ?? "OAuth failed")
    );
  }
  return json;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<Omit<YoutubeAuth, "channel_id" | "channel_title" | "connected_at">> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: YOUTUBE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const json = await tokenRequest(body);
  return {
    access_token: String(json.access_token ?? ""),
    refresh_token: String(json.refresh_token ?? ""),
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: number }> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const json = await tokenRequest(body);
  return {
    access_token: String(json.access_token ?? ""),
    expires_at: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
}

export async function fetchChannelInfo(
  accessToken: string
): Promise<{
  channel_id: string;
  channel_title: string;
  channel_avatar: string | null;
}> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json();
  const item = json?.items?.[0];
  if (!item) throw new Error("No channel found for this account");
  const thumbs = item.snippet?.thumbnails;
  return {
    channel_id: item.id,
    channel_title: item.snippet?.title ?? "My Channel",
    channel_avatar:
      thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
  };
}

/** Return a valid access token, refreshing + persisting when expired. */
export async function getValidAccessToken(): Promise<{
  auth: YoutubeAuth;
  accessToken: string;
}> {
  let auth = await getYoutubeAuth();
  if (!auth) throw new Error("YouTube not connected");
  if (!auth.refresh_token) throw new Error("Missing refresh token");
  if (Date.now() >= auth.expires_at) {
    const refreshed = await refreshAccessToken(auth.refresh_token);
    auth = {
      ...auth,
      access_token: refreshed.access_token,
      expires_at: refreshed.expires_at,
    };
    await setYoutubeAuth(auth);
  }
  return { auth, accessToken: auth.access_token };
}
