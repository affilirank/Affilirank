import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import {
  AutopublishSettings,
  getAutopublishSettings,
  setAutopublishSettings,
  GoogleAuth,
  getGoogleAuth,
  setGoogleAuth,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/admin/youtube/settings
 * Read or update the current tenant's Auto-Publish settings (enabled,
 * interval, format) and the Google OAuth client credentials stored in the
 * settings row (client ID/secret the admin pastes in — no Vercel env var +
 * redeploy required).
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const googleAuth = await getGoogleAuth(tenant.id);
  return NextResponse.json({
    settings: await getAutopublishSettings(tenant.id),
    google_auth: googleAuth
      ? {
          client_id: googleAuth.client_id,
          client_secret_set: Boolean(googleAuth.client_secret),
        }
      : null,
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const body = (await req.json().catch(() => ({}))) as Partial<AutopublishSettings> & {
    google_auth?: GoogleAuth | null;
  };

  if (body.google_auth !== undefined) {
    if (body.google_auth === null) {
      await setGoogleAuth(tenant.id, null);
    } else {
      const client_id = String(body.google_auth.client_id ?? "").trim();
      const client_secret = String(body.google_auth.client_secret ?? "").trim();
      if (!client_id || !client_secret) {
        return NextResponse.json(
          { error: "Both client ID and client secret are required" },
          { status: 400 }
        );
      }
      await setGoogleAuth(tenant.id, { client_id, client_secret });
    }
  }

  const current = await getAutopublishSettings(tenant.id);
  const next: AutopublishSettings = {
    enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    interval: body.interval ?? current.interval,
    format: body.format ?? current.format,
    profile_in_thumbnails:
      typeof body.profile_in_thumbnails === "boolean"
        ? body.profile_in_thumbnails
        : current.profile_in_thumbnails,
    thumbnail_tone: body.thumbnail_tone ?? current.thumbnail_tone,
    gemini_api_key:
      typeof body.gemini_api_key === "string"
        ? body.gemini_api_key.trim()
        : current.gemini_api_key,
  };
  const saved = await setAutopublishSettings(tenant.id, next);
  return NextResponse.json({ settings: saved });
}
