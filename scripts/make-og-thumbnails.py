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
        },
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.status


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    import importlib.util
    from subprocess import run

    try:
        from PIL import Image, ImageFilter
    except ImportError:
        print("PIL not available — install Pillow")
        sys.exit(1)

    work = Path("/tmp/affilirank-og")
    work.mkdir(parents=True, exist_ok=True)

    slugs = sys.argv[1:] or SLUGS
    for slug in slugs:
        src = f"{SRC_PREFIX}/{slug}.png"
        raw = work / f"{slug}.png"
        if not download(src, raw):
            print(f"SKIP {slug}: source {src} not reachable")
            continue
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

        png = work / f"{slug}.png"
        out.save(png, "PNG")
        upload(f"og/{slug}.png", png.read_bytes(), "image/png")
        print(f"OK {slug} {W}x{H}")


if __name__ == "__main__":
    main()
