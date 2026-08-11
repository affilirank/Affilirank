#!/usr/bin/env python3
"""
Backfill missing AI thumbnails for deals that only have raw product
screenshots, then propagate them to every surface on BOTH the live DB
(which affilirank.com + lifetimedealsbundle.com currently serve) and the
new multi-tenant DB (so the cutover carries them too).

Works by reusing the same Gemini pipeline the app uses (make-ai-thumbnails
+ auto_publisher.propagate_thumbnail): composites the deal's real UI
screenshot + channel avatar into the 16:9 high-CTR card, uploads to the
`previews` bucket, and repoints hero_image / blog cover_image.

Usage (from scripts/):
  set -a && . ./.env.autopublish && set +a
  python3 backfill-thumbnails.py [slug ...]

Env: SUPABASE_URL (old project), SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
  (or pulled from settings), plus NEW_DB_HOST, NEW_DB_USER, NEW_DB_PASSWORD
  (psycopg2 direct connection to the new multi-tenant DB).
"""
import base64
import importlib.util
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))


def load_env():
    envf = SCRIPTS / ".env.autopublish"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


load_env()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
AVATAR_URL = os.environ.get("CHANNEL_AVATAR_URL", "")

# Targets with no AI thumbnail yet (raw screenshots only).
DEFAULT_SLUGS = [
    "onemanarmy-deploy-your-ai-army-in-5-minutes",
    "callfluent-2-0-bundle-callfluent-ai",
    "viralrevenueai",
    "signal-droid",
    "dont-close-sora-ai-unlimited",
]


def rest(path, method="GET", body=None):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {e.read()[:300]}")


def patch_new_db(hero_url, cover_map):
    """Update the new multi-tenant DB rows (same ids as the old DB)."""
    import psycopg2

    conn = psycopg2.connect(
        host=os.environ.get("NEW_DB_HOST", ""),
        port=int(os.environ.get("NEW_DB_PORT", "5432")),
        user=os.environ.get("NEW_DB_USER", ""),
        password=os.environ.get("NEW_DB_PASSWORD", ""),
        dbname=os.environ.get("NEW_DB_NAME", "postgres"),
        sslmode="require",
    )
    cur = conn.cursor()
    n = 0
    for deal_id in cover_map:
        cur.execute(
            "update public.products set hero_image = %s where id = %s",
            (hero_url, deal_id),
        )
        n += cur.rowcount
        cur.execute(
            "update public.blog_posts set cover_image = %s where deal_id = %s",
            (hero_url, deal_id),
        )
        n += cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    print(f"  new DB: {n} rows updated")


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    spec = importlib.util.spec_from_file_location("make_ai_thumbnails", SCRIPTS / "make-ai-thumbnails.py")
    mat = importlib.util.module_from_spec(spec)
    sys.modules["make_ai_thumbnails"] = mat
    spec.loader.exec_module(mat)

    ap_spec = importlib.util.spec_from_file_location("auto_publisher", SCRIPTS / "auto-publisher.py")
    ap = importlib.util.module_from_spec(ap_spec)
    sys.modules["auto_publisher"] = ap
    ap_spec.loader.exec_module(ap)

    if not mat.KEY:
        print("No Gemini key available (env or settings)", file=sys.stderr)
        sys.exit(1)

    try:
        settings = rest("/settings?select=youtube_auth,autopublish&id=eq.1&limit=1")
        auth = (settings[0] or {}).get("youtube_auth") or {}
        avatar_url = (auth.get("channel_avatar") or "").strip() or AVATAR_URL or mat.AVATAR_URL
    except Exception:
        avatar_url = AVATAR_URL or mat.AVATAR_URL

    av = mat.WORK / "avatar.png"
    if not ap.download_image(avatar_url, av, min_bytes=2000):
        print(f"Avatar download failed: {avatar_url}", file=sys.stderr)
        sys.exit(1)

    slugs = sys.argv[1:] or DEFAULT_SLUGS
    for slug in slugs:
        rows = rest(f"/products?select=*&slug=eq.{urllib.parse.quote(slug)}&limit=1")
        if not rows:
            print(f"SKIP {slug}: not found in live DB")
            continue
        deal = rows[0]
        deal_id = deal["id"]
        try:
            out = mat.make_one(deal, av, slug)
            ap.propagate_thumbnail(deal, out)
            print(f"OK {slug} (ai) -> {deal_id}")
            blogs = rest(f"/blog_posts?select=id&deal_id=eq.{urllib.parse.quote(deal_id)}") or []
            # propagate_thumbnail already patched live blog covers; now sync new DB.
            new_url = rest(
                f"/products?select=hero_image&id=eq.{urllib.parse.quote(deal_id)}&limit=1"
            )[0]["hero_image"]
            patch_new_db(new_url, {deal_id: new_url})
            print(f"  cover targets: {len(blogs)} live blogs, new DB synced")
        except Exception as e:
            import traceback

            traceback.print_exc()
            print(f"FAIL {slug}: {e}")


if __name__ == "__main__":
    main()
