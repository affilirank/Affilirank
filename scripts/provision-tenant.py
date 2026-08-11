#!/usr/bin/env python3
"""
Provision a new white-label tenant in the shared multi-tenant Supabase DB.

Creates (or updates) the `tenants` row keyed by domain, plus that tenant's
empty `settings` row. The admin password is stored as
HMAC-SHA256(ADMIN_SECRET, password) — the same scheme src/lib/auth.ts uses
(hashAdminPassword), so the deployed app can verify it.

Each tenant starts blank: no deals, no blog posts, no settings beyond an
empty license list. Deal streams are isolated by tenant_id everywhere.

Usage:
  SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... \
  ADMIN_SECRET=... \
  python3 scripts/provision-tenant.py \
    --domain example.com --name "Example Brand" \
    --tagline "Your tagline" --brand-tag "software deals" \
    --affiliate-id 3582897 --plan starter \
    --admin-password "changeme" [--show-product-page] [--logo-url ...]

Clone an existing tenant's content instead of starting blank:
  python3 scripts/provision-tenant.py --domain example.com \
    --clone-from <source-tenant-id-or-domain>

This copies the source tenant's products, blog_posts, deal_events and
settings into the new tenant (fresh ids, refs remapped, same slugs).

Env:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET (required)
"""
import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import uuid
import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")

REST = f"{SUPABASE_URL}/rest/v1"


def db_headers(extra=None):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def rest(path, method="GET", body=None, headers=None):
    req = urllib.request.Request(
        f"{REST}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers=db_headers(headers),
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {e.read()[:300]}")


def hash_password(password, secret):
    return hmac.new(secret.encode(), password.encode(), hashlib.sha256).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--domain", required=True)
    ap.add_argument("--name", default="")
    ap.add_argument("--tagline", default="")
    ap.add_argument("--brand-tag", default="")
    ap.add_argument("--logo-url", default="")
    ap.add_argument("--affiliate-id", default="")
    ap.add_argument("--plan", default="starter", choices=["starter", "pro", "unlimited"])
    ap.add_argument("--admin-password", default="")
    ap.add_argument("--show-product-page", action="store_true")
    ap.add_argument("--clone-from", default="", help="source tenant id or domain to clone")
    args = ap.parse_args()

    if not (SUPABASE_URL and SERVICE_KEY):
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)
    if args.admin_password and not ADMIN_SECRET:
        print("Missing ADMIN_SECRET (needed to hash the admin password)", file=sys.stderr)
        sys.exit(1)

    tenant = {
        "domain": args.domain.strip().lower(),
        "name": args.name,
        "tagline": args.tagline,
        "logo_url": args.logo_url,
        "brand_tag": args.brand_tag,
        "affiliate_id": args.affiliate_id,
        "plan": args.plan,
        "status": "active",
        "show_product_page": args.show_product_page,
        "admin_password_hash": (
            hash_password(args.admin_password, ADMIN_SECRET) if args.admin_password else ""
        ),
    }
    # Upsert keyed on the unique domain column.
    row = rest(
        f"/tenants?on_conflict=domain",
        "POST",
        tenant,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    tid = row[0]["id"]
    print(f"tenant: {tid} ({tenant['domain']})")

    # Ensure the tenant's blank settings row exists.
    try:
        rest("/settings", "POST", {"tenant_id": tid, "license_keys": []})
        print("settings row: created")
    except RuntimeError as e:
        if "duplicate" in str(e) or "unique" in str(e):
            print("settings row: already exists")
        else:
            raise

    if args.clone_from:
        clone_into(tid, resolve_tenant(args.clone_from), args.domain)

    print("done — tenant starts blank." if not args.clone_from else "done — tenant cloned.")


def resolve_tenant(domain_or_id):
    rows = rest(f"/tenants?select=id,domain&domain=eq.{domain_or_id}&limit=1")
    if not rows:
        rows = rest(f"/tenants?select=id,domain&id=eq.{domain_or_id}&limit=1")
    if not rows:
        sys.exit(f"source tenant not found: {domain_or_id}")
    return rows[0]


def clone_into(new_tenant_id, source, new_domain):
    src = source["id"]
    print(f"cloning {source['domain']} -> {new_domain} ({new_tenant_id})")

    deal_map = {}
    for table in ("products", "blog_posts", "deal_events"):
        existing = rest(f"/{table}?tenant_id=eq.{new_tenant_id}&select=id&limit=1")
        if existing:
            print(f"  {table}: already present, skipping")
            if table == "products":
                for row in rest(f"/{table}?tenant_id=eq.{new_tenant_id}&select=id,slug&limit=5000"):
                    deal_map[row["slug"]] = row["id"]
            continue
        rows = rest(f"/{table}?tenant_id=eq.{src}&select=*&limit=5000")
        for row in rows:
            body = {k: v for k, v in row.items() if k not in ("id", "tenant_id", "updated_at")}
            if table == "blog_posts" and row.get("deal_id"):
                if row["deal_id"] not in deal_map:
                    sys.exit(f"blog_posts references unknown product {row['deal_id']}")
                body["deal_id"] = deal_map[row["deal_id"]]
            body["tenant_id"] = new_tenant_id
            if table in ("products", "blog_posts"):
                new_id = uuid.uuid4().hex
                body["id"] = new_id
            rest(f"/{table}", "POST", body)
            if table == "products":
                deal_map[row["slug"]] = new_id
        print(f"  {table}: {len(rows)} rows copied")

    src_settings = rest(f"/settings?tenant_id=eq.{new_tenant_id}&select=tenant_id&limit=1")
    if src_settings:
        print("  settings: already present, skipping")
        return
    src_settings = rest(f"/settings?tenant_id=eq.{src}&select=*&limit=1")
    if src_settings:
        s = src_settings[0]
        body = {k: v for k, v in s.items() if k not in ("tenant_id", "updated_at")}
        body["tenant_id"] = new_tenant_id
        rest("/settings", "POST", body)
        print("  settings: copied")
    else:
        print("  settings: none found")


if __name__ == "__main__":
    main()
