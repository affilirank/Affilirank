#!/usr/bin/env python3
"""
Push enriched deal assets (price, original_price, bundle_url, funnel_links,
hero_image, coupon_code) discovered from JVZoo affiliate-info pages and vendor
sales pages into the Supabase products table.

Run from scripts/ with .env.autopublish loaded:
  set -a && . ./.env.autopublish && set +a
  python3 push-deal-assets.py
"""
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
REST = f"{SUPABASE_URL}/rest/v1"
AFF = os.environ.get("JVZOO_AFFILIATE_ID", "3582897")


def headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def rest(path, method="GET", body=None):
    url = f"{REST}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {e.read()[:300]}")


def jvz(pid):
    return f"https://jvz5.com/c/{AFF}/{pid}/"


# slug -> {columns to PATCH}
PATCHES = {
    "superaffiliatesai-bundle": {
        "price": 67.0,
        "original_price": 317.0,
        "coupon_code": "Super",
        "funnel_links": [
            {"label": "SuperAffiliatesAI xBundle — the deal", "url": jvz(440485)},
        ],
    },
    "onemanarmy-deploy-your-ai-army-in-5-minutes": {
        "price": 287.0,
        "original_price": 397.0,
        "bundle_url": jvz(439183),
        "bundle_price": 397.0,
        "funnel_links": [
            {"label": "OneManArmy Commercial (FE, $47)", "url": jvz(436743)},
            {"label": "OneManArmy AI Bundle — the deal", "url": jvz(439183)},
        ],
        "hero_image": (
            "https://i.vimeocdn.com/video/2163305134-248ccc010fb7f9ea7e432cb6117c9028a12d46732c7d51d37a81985436181dec-d_1280x720.jpg"
        ),
    },
    "writix-all-inclusive": {
        "price": 347.0,
        "funnel_links": [
            {"label": "Writix All-Inclusive — the deal", "url": jvz(416134)},
        ],
    },
    "viralrevenueai": {
        "price": 57.0,
        "funnel_links": [
            {"label": "ViralRevenueAI — Commercial Rights", "url": jvz(442785)},
        ],
        "hero_image": "https://viralrevenueai.com/images/main_ssvv1.png",
    },
    "signal-droid": {
        "price": 37.0,
        "funnel_links": [
            {"label": "Signal Droid Membership — the deal", "url": jvz(439463)},
        ],
        "hero_image": "https://img.youtube.com/vi/CP34ygcYzi4/maxresdefault.jpg",
    },
    "contentclaw-bundle": {
        "price": 39.95,
        "bundle_url": jvz(446607),
        "bundle_price": 317.0,
        "funnel_links": [
            {"label": "ContentClaw Premium (FE) — $39.95", "url": jvz(446603)},
            {"label": "ContentClaw xBundle — the deal, $317", "url": jvz(446607)},
            {"label": "FastPass — all upgrades for $230", "url": jvz(446609)},
            {"label": "OTO1: DFY Income Empire — $197", "url": jvz(446689)},
            {"label": "OTO2: Affiliate Profit Engine — $67", "url": jvz(446693)},
            {"label": "OTO3: Agency Unlimited — $197", "url": jvz(446695)},
            {"label": "OTO4: TurboGrowth + AI Coach — $97/yr", "url": jvz(446697)},
            {"label": "MegaBundle — adds DFY, $77", "url": jvz(447023)},
        ],
    },
    "callfluent-2-0-bundle-callfluent-ai": {
        "price": 697.0,
        "funnel_links": [
            {"label": "CallFluent AI 2.0 Bundle — the deal", "url": jvz(442775)},
        ],
        "hero_image": "https://callfluent.com/wp-content/uploads/2025/08/frame-img.png",
    },
    "virofeed-ai-live": {
        "price": 38.33,
        "funnel_links": [
            {"label": "ViroFeed AI — Premium", "url": jvz(442941)},
        ],
    },
    "browseragent-bundle": {
        "price": 37.0,
        "coupon_code": "BROWSER",
        "funnel_links": [
            {"label": "BrowserAgent xBundle — the deal", "url": jvz(443553)},
            {"label": "FastPass — all upgrades, best value", "url": jvz(443565)},
            {"label": "MegaBundle — bonus training", "url": jvz(443567)},
        ],
    },
    "viralreelai-bundle": {
        "price": 317.0,
        "coupon_code": "VIRAL",
        "funnel_links": [
            {"label": "ViralReelAI Bundle — the deal", "url": jvz(421149)},
        ],
    },
}


def main():
    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    products = rest("/products?select=id,slug,title&limit=200") or []
    by_slug = {p["slug"]: p for p in products}

    missing = [s for s in PATCHES if s not in by_slug]
    if missing:
        print("WARNING slugs not found in DB:", missing)

    for slug, patch in PATCHES.items():
        row = by_slug.get(slug)
        if not row:
            continue
        rest(f"/products?id=eq.{row['id']}", "PATCH", patch)
        print(f"✓ {slug}: {patch.get('price')} / bundle={patch.get('bundle_url')} / {len(patch.get('funnel_links', []))} funnel links")

    print("Done.")


if __name__ == "__main__":
    main()
