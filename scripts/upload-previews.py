#!/usr/bin/env python3
"""
Upload rendered review videos + thumbnails to the Supabase `previews` bucket
for QC review.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 upload-previews.py [slug ...]
"""
import os
import sys
import urllib.request
import uuid
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "previews"
ROOT = Path("/tmp/affilirank-review")

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


def upload(bucket, path, data, ctype):
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": ctype,
        },
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.status


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    slugs = sys.argv[1:] or SLUGS
    for slug in slugs:
        d = ROOT / slug
        video = d / "video.mp4"
        thumb = d / "thumb.png"
        stamp = uuid.uuid4().hex[:8]
        if video.exists():
            upload(BUCKET, f"{slug}-{stamp}/video.mp4", video.read_bytes(), "video/mp4")
            print(f"✓ {slug} video")
        if thumb.exists():
            upload(BUCKET, f"{slug}-{stamp}/thumb.png", thumb.read_bytes(), "image/png")
            print(f"✓ {slug} thumb")
    print("Done.")


if __name__ == "__main__":
    main()
