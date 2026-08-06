import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  AutopublishSettings,
  getAutopublishSettings,
  setAutopublishSettings,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/admin/youtube/settings
 * Read or update the Auto-Publish settings (enabled, interval, format).
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ settings: await getAutopublishSettings() });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<AutopublishSettings>;
  const current = await getAutopublishSettings();
  const next: AutopublishSettings = {
    enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    interval: body.interval ?? current.interval,
    format: body.format ?? current.format,
    profile_in_thumbnails:
      typeof body.profile_in_thumbnails === "boolean"
        ? body.profile_in_thumbnails
        : current.profile_in_thumbnails,
    thumbnail_tone: body.thumbnail_tone ?? current.thumbnail_tone,
  };
  const saved = await setAutopublishSettings(next);
  return NextResponse.json({ settings: saved });
}
