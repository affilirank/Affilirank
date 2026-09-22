#!/usr/bin/env bash
# Runs the auto-publisher worker with the credentials from
# scripts/.env.autopublish. Silent no-op until that file is filled in —
# safe to call from cron every few minutes.
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

exec python3 scripts/auto-publisher.py
