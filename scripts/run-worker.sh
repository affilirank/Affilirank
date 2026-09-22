#!/usr/bin/env bash
# Runs the auto-publisher worker with the credentials from
# scripts/.env.autopublish. Silent no-op until that file is filled in —
# safe to call from cron every few minutes.
#
# Multi-tenant: list tenant ids in TENANTS (space-separated) in the env file
# and the worker runs once per tenant — each tenant gets its own YouTube
# connection and autopublish settings. With TENANTS unset, one legacy run.
set -u
cd "$(dirname "$0")/.."

if [ ! -f scripts/.env.autopublish ]; then
  exit 0
fi

set -a
# shellcheck disable=SC1091
. scripts/.env.autopublish
set +a

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "$(date '+%F %T') worker skipped: fill scripts/.env.autopublish first"
  exit 0
fi

if [ -n "${TENANTS:-}" ]; then
  for tid in $TENANTS; do
    echo "$(date '+%F %T') worker run for tenant $tid"
    TENANT_ID="$tid" python3 -u scripts/auto-publisher.py
  done
else
  exec python3 -u scripts/auto-publisher.py
fi
