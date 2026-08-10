#!/usr/bin/env python3
"""
Upload the freshly rendered review thumbnails to the public `previews` bucket
(stable path previews/deals/<slug>.png), then sync every blog post's
cover_image to the deal's hero_image so blogs show the new thumbnails.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 sync-blog-thumbnails.py [slug ...]
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
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


def upload(path, data, ctype):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": ctype,
            "x-upsert": "true",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.status


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


def select(path):
    url = f"{SUPABASE_URL}/rest/v1{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    slugs = sys.argv[1:] or SLUGS
    for slug in slugs:
        thumb = ROOT / slug / "thumb.png"
        if not thumb.exists():
            print(f"  [skip] no thumb for {slug}")
            continue
        path = f"deals/{slug}.png"
        try:
            code = upload(path, thumb.read_bytes(), "image/png")
        except urllib.error.HTTPError as e:
            print(f"  [fail] upload {slug} -> HTTP {e.code}: {e.read()[:150]}")
            continue
        if code not in (200, 201):
            print(f"  [fail] upload {slug} -> HTTP {code}")
            continue
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"

        deals = select(f"/products?select=id&slug=eq.{urllib.parse.quote(slug)}&limit=1")
        if not deals:
            print(f"  [skip] no deal row for {slug}")
            continue
        pid = deals[0]["id"]
        blogs = select(f"/blog_posts?select=id&deal_id=eq.{pid}")
        if not blogs:
            print(f"  [skip] no blog for {slug}")
            continue
        bid = blogs[0]["id"]
        code = rest(f"/blog_posts?id=eq.{bid}",
                    "PATCH", json.dumps({"cover_image": public_url}).encode())
        if code in (200, 201, 204):
            print(f"  ✓ {slug}  {public_url}")
        else:
            print(f"  [fail] patch blog {slug} -> HTTP {code}")


if __name__ == "__main__":
    main()
