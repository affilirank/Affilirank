#!/usr/bin/env python3
"""
Upload the already-rendered 2-4 min review videos (1280x720) to the connected
YouTube channel as public, with their AI thumbnails, then mark the deals posted.

Unlike auto-publisher.py this does NOT regenerate anything — it uses the
rendered videos + AI thumbs in /tmp/affilirank-review/<slug>/.

Stops on uploadLimitExceeded (daily API quota) so the rest can be finished
the next day; marks each successful deal as 'posted' in Supabase.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 post-youtube.py [slug ...]
"""
import importlib.util
import os
import sys
import time
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

_AP = importlib.util.spec_from_file_location("auto_publisher", SCRIPTS / "auto-publisher.py")
_AP_MOD = importlib.util.module_from_spec(_AP)
sys.modules["auto_publisher"] = _AP_MOD
_AP.loader.exec_module(_AP_MOD)
from auto_publisher import (  # noqa: E402
    rest, short_name, build_description, fmt_price,
    get_youtube_auth, get_valid_token, upload_video, set_thumbnail,
    set_deal_status,
)

REVIEW = Path("/tmp/affilirank-review")

SLUGS = [
    "virofeed-ai-live",
    "viralrevenueai",
    "onemanarmy-deploy-your-ai-army-in-5-minutes",
    "writix-all-inclusive",
    "superaffiliatesai-bundle",
    "browseragent-bundle",
    "callfluent-2-0-bundle-callfluent-ai",
    "contentclaw-bundle",
    "signal-droid",
    "viralreelai-bundle",
]


def get_deal(slug):
    rows = rest(f"/products?select=*&slug=eq.{urllib.parse.quote(slug)}&limit=1")
    return rows[0] if rows else None


def main():
    if not (os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY")):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    auth = get_youtube_auth()
    token = get_valid_token(auth)

    slugs = sys.argv[1:] or SLUGS
    for slug in slugs:
        deal = get_deal(slug)
        if not deal:
            print(f"SKIP {slug}: no deal row")
            continue
        video = REVIEW / slug / "video.mp4"
        thumb = REVIEW / slug / "thumb.png"
        if not video.exists():
            print(f"SKIP {slug}: no rendered video at {video}")
            continue
        if not thumb.exists():
            print(f"SKIP {slug}: no thumb at {thumb}")
            continue

        name = short_name(deal["title"])
        title = f"{name} — Lifetime Deal Review ({time.strftime('%Y')})"
        description = build_description(deal)
        size_mb = video.stat().st_size / 1e6
        print(f"▶ {name}  ({video.stat().st_size/1e6:.1f} MB, public)")

        try:
            vid, url = upload_video(token, title, description, video, thumb, privacy="public")
        except RuntimeError as e:
            if "uploadLimitExceeded" in str(e) or "quotaExceeded" in str(e):
                print(f"  STOP: daily upload quota hit — resume tomorrow.\n  {e}")
                sys.exit(2)
            print(f"  [error] {e}")
            continue
        set_thumbnail(token, vid, thumb)
        set_deal_status(deal["id"], "posted", vid, url)
        print(f"  ✓ {url}")
    print("Done.")


if __name__ == "__main__":
    import urllib.parse  # noqa: E402
    main()
