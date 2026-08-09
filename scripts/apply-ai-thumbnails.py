#!/usr/bin/env python3
"""
Upload the AI gig-photo thumbnails to Supabase storage and point each deal's
hero_image at them, so the public deal stream shows the AI thumbnails.

The AI thumbnail regenerator now always uses the webinar product-UI frame (not
hero_image), so overwriting hero_image is safe for regeneration.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 apply-ai-thumbnails.py
"""
import os
import sys
import urllib.request
import urllib.error
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


def rest(path, method="GET", body=None):
    data = None if body is None else bytes(body)
    url = f"{SUPABASE_URL}/rest/v1{path}"
    req = urllib.request.Request(url, data=data, method=method, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def upload(path, data, ctype):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": ctype,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    for slug in SLUGS:
        thumb = ROOT / slug / "thumb.png"
        if not thumb.exists():
            print(f"  [skip] no thumb for {slug}")
            continue
        # Find the deal id
        rows = _select(f"/products?select=id,hero_image&slug=eq.{slug}")
        if not rows:
            print(f"  [skip] deal not found: {slug}")
            continue
        pid = rows[0]["id"]
        old_hero = (rows[0].get("hero_image") or "")[:70]

        # Upload to a stable path in the public previews bucket
        path = f"deals/{slug}.png"
        code = upload(path, thumb.read_bytes(), "image/png")
        if code not in (200, 201):
            print(f"  [fail] upload {slug} -> HTTP {code}")
            continue
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"

        import json
        body = json.dumps({"hero_image": public_url}).encode()
        code = rest(f"/products?id=eq.{pid}", "PATCH", body)
        if code in (200, 201, 204):
            print(f"  ✓ {slug}  {public_url}")
            print(f"    (hero was: {old_hero})")
        else:
            print(f"  [fail] patch {slug} -> HTTP {code}")


def _select(path):
    import json
    url = f"{SUPABASE_URL}/rest/v1{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


if __name__ == "__main__":
    main()
