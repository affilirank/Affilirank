#!/usr/bin/env python3
"""
Render Facebook-friendly 1200x630 (1.91:1) OG share images from the AI
thumbnails, then upload them to previews/og/<slug>.png.

The AI thumbs are 16:9 (1280x720). Facebook's link-preview crop is 1.91:1,
so sharing a 16:9 image crops the badge/button edges. This composites each
thumb onto a 1200x630 canvas with a blurred, scaled copy filling the extra
side margins — the full artwork stays visible and nothing gets cropped.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 make-og-thumbnails.py [slug ...]
"""
import os
import sys
import urllib.request
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "previews"
W, H = 1200, 630
SRC_PREFIX = f"{SUPABASE_URL}/storage/v1/object/public/previews/deals"

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


def download(url, dest, min_bytes=1000):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except urllib.error.HTTPError:
        return False
    if len(data) < min_bytes:
        return False
    dest.write_bytes(data)
    return True


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


def og_path_for(src, slug):
    """Storage path for the OG variant, mirroring the source thumb's layout.

    Live storage nests tenant-prefixed thumbs (previews/deals/<tenant>/
    <slug>.png), so the OG variant must land at og/<tenant>/<slug>.png — the
    deal page derives its share image by swapping /previews/deals/ for
    /previews/og/ on the hero_image URL.
    """
    try:
        from urllib.parse import urlparse

        p = urlparse(str(src)).path
        if "/previews/deals/" in p:
            return "og/" + p.split("/previews/deals/", 1)[1]
    except Exception:
        pass
    return f"og/{slug}.png"


def make_og(slug, src=None, out_png=None, work=None):
    """Composite a single thumb (previews/deals/<slug>.png by default) onto a
    1200x630 Facebook-friendly canvas and upload it to previews/og/<...>.png
    (same directory structure as the source thumb)."""
    if not (SUPABASE_URL and SERVICE_KEY):
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    try:
        from PIL import Image, ImageFilter
    except ImportError:
        raise RuntimeError("PIL not available — install Pillow")

    work = work or Path("/tmp/affilirank-og")
    work.mkdir(parents=True, exist_ok=True)

    src = src or f"{SRC_PREFIX}/{slug}.png"
    raw = work / f"{slug}.png"
    if not download(src, raw):
        print(f"SKIP {slug}: source {src} not reachable")
        return None
    im = Image.open(raw).convert("RGB")
    iw, ih = im.size

    # Target canvas is wider than the source, so the thumb fills the height
    # and the extra side margins get the blurred fill.
    fit_w = int(ih * (W / H))
    scaled = im.resize((fit_w, ih), Image.LANCZOS)
    fill = im.resize((W, H), Image.LANCZOS)
    fill = fill.filter(ImageFilter.GaussianBlur(40))

    out = Image.new("RGB", (W, H))
    out.paste(fill, (0, 0))
    ox = (W - fit_w) // 2
    out.paste(scaled, (ox, 0))

    png = out_png or work / f"{slug}.png"
    out.save(png, "PNG")
    path = og_path_for(src, slug)
    upload(path, png.read_bytes(), "image/png")
    print(f"OK {slug} {W}x{H} -> {path}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"


def hero_url_for(slug):
    """Fetch the deal's hero_image (the live 16:9 thumb) so backfills work
    with the tenant-prefixed storage layout too."""
    import json as _json
    import urllib.parse

    path = f"/products?select=hero_image&slug=eq.{urllib.parse.quote(slug)}&limit=1"
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1{path}",
        headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        rows = _json.loads(r.read()) or []
    return (rows[0] or {}).get("hero_image") if rows else None


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    slugs = sys.argv[1:] or SLUGS
    for slug in slugs:
        src = hero_url_for(slug)
        if src:
            make_og(slug, src=src)
        else:
            # Fall back to the flat default path (no DB row or no hero yet).
            make_og(slug)


if __name__ == "__main__":
    main()
