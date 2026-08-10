#!/usr/bin/env python3
"""
One-run thumbnail pipeline for a deal: upload the rendered thumb to the
public previews bucket (previews/deals/<slug>.png), point the deal's
hero_image at it (deal stream), sync every blog post's cover_image (blog +
its OG share), and generate the 1200x630 Facebook OG image.

Run this ONCE per deal — it replaces the old separate apply-ai-thumbnails,
sync-blog-thumbnails and make-og-thumbnails steps. New JVZoo links flow
through here after auto-publish renders the thumb, so the generated
thumbnail lands everywhere (stream, blog, YouTube video, Facebook share) in
a single API pass.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 publish-thumbnails.py [slug ...]
"""
import importlib.util
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

SPEC = importlib.util.spec_from_file_location(
    "make_og_thumbnails",
    Path(__file__).resolve().parent / "make-og-thumbnails.py",
)
OG = importlib.util.module_from_spec(SPEC)
sys.modules["make_og_thumbnails"] = OG
SPEC.loader.exec_module(OG)


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


def publish(slug):
    thumb = ROOT / slug / "thumb.png"
    if not thumb.exists():
        print(f"  [skip] no rendered thumb for {slug} — nothing to publish")
        return False

    deals = select(f"/products?select=id,hero_image,slug&slug=eq.{urllib.parse.quote(slug)}&limit=1")
    if not deals:
        print(f"  [skip] no deal row for {slug}")
        return False
    pid = deals[0]["id"]

    # 1. Upload the thumb to the stable public path the deal stream serves.
    path = f"deals/{slug}.png"
    try:
        code = upload(path, thumb.read_bytes(), "image/png")
    except urllib.error.HTTPError as e:
        print(f"  [fail] upload {slug} -> HTTP {e.code}: {e.read()[:150]}")
        return False
    if code not in (200, 201):
        print(f"  [fail] upload {slug} -> HTTP {code}")
        return False
    hero_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"

    # 2. Point the deal's hero_image at it (homepage deal stream + deal page).
    old = (deals[0].get("hero_image") or "")[:70]
    code = rest(f"/products?id=eq.{pid}",
                "PATCH", json.dumps({"hero_image": hero_url}).encode())
    if code not in (200, 201, 204):
        print(f"  [fail] patch hero {slug} -> HTTP {code}")
        return False

    # 3. Sync blog cover_image so blog cards + blog OG shares show the thumb.
    blogs = select(f"/blog_posts?select=id&deal_id=eq.{pid}")
    for b in blogs:
        rest(f"/blog_posts?id=eq.{b['id']}",
             "PATCH", json.dumps({"cover_image": hero_url}).encode())

    # 4. Build + upload the 1200x630 Facebook OG image from the same thumb.
    try:
        OG.make_og(slug, src=hero_url)
    except Exception as e:
        print(f"  [warn] og image failed for {slug}: {e}")

    print(f"  ✓ {slug}")
    print(f"    stream:  {hero_url}")
    print(f"    blogs:   {len(blogs)} patched")
    print(f"    hero was: {old}")
    return True


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    slugs = sys.argv[1:]
    if slugs:
        ok = [s for s in slugs if publish(s)]
        sys.exit(0 if ok else 1)
    for d in sorted(ROOT.iterdir()):
        if (d / "thumb.png").exists():
            publish(d.name)
    print("Done.")


if __name__ == "__main__":
    main()
