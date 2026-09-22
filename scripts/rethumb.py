#!/usr/bin/env python3
"""
Re-set YouTube thumbnails for already-posted deals WITHOUT re-uploading
videos (re-queueing in the dashboard would post duplicates).

Why this exists: thumbnails.set returns HTTP 403 for channels that are not
phone-verified, so the auto-publisher uploaded the video but silently skipped
the thumbnail. Run this after verifying at https://www.youtube.com/verify —
note Google's allowlist can lag a few hours behind verification.

Usage:
  python3 scripts/rethumb.py            # all posted deals with a video
  python3 scripts/rethumb.py <slug>     # just one deal

Env: same as auto-publisher.py (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
Reuses the worker's storage helpers, token refresh and set_thumbnail.
"""
import importlib.util
import sys
import urllib.request
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "auto_publisher", Path(__file__).resolve().parent / "auto-publisher.py"
)
ap = importlib.util.module_from_spec(_spec)
sys.modules["auto_publisher"] = ap
_spec.loader.exec_module(ap)


def download_storage(src, out: Path) -> None:
    url = (
        src
        if str(src).startswith("http")
        else f"{ap.SUPABASE_URL}/storage/v1/object/public/previews/{src}"
    )
    req = urllib.request.Request(url, headers={"apikey": ap.SERVICE_KEY})
    with urllib.request.urlopen(req, timeout=120) as r:
        out.write_bytes(r.read())


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    rows = (
        ap.rest(
            "/products?select=id,slug,tenant_id,title,youtube_video_id,hero_image"
            "&auto_post_status=eq.posted&youtube_video_id=not.is.null&limit=50"
        )
        or []
    )
    if only:
        rows = [d for d in rows if d.get("slug") == only]
    if not rows:
        print("No posted deals with a video to re-thumbnail.")
        return

    auth = ap.get_youtube_auth()
    token = ap.get_valid_token(auth)

    ok = 0
    for d in rows:
        slug = d.get("slug") or d["id"]
        name = ap.short_name(d.get("title") or slug)
        print(f"▶ {name}")
        try:
            out = ap.WORK / f"{slug}-rethumb.png"
            src = d.get("hero_image") or f"deals/{d.get('tenant_id')}/{slug}.png"
            try:
                download_storage(src, out)
            except Exception:
                # Older flat layout (no tenant prefix).
                if str(src).startswith("http"):
                    raise
                download_storage(f"deals/{slug}.png", out)
            code = ap.set_thumbnail(token, d["youtube_video_id"], out)
            if code == 200:
                ok += 1
                print("  thumbnail set")
            elif code is None:
                # set_thumbnail already printed the HTTP body. Common codes:
                #   403 channel not (yet) allowlisted for custom thumbnails
                #   401 token expired/revoked -> reconnect in Admin
                #   404 video not found
                print("  thumbnail failed (see HTTP code above)")
        except Exception as e:
            print(f"  [error] {e}")
    print(f"Done. {ok}/{len(rows)} thumbnails set.")


if __name__ == "__main__":
    main()
