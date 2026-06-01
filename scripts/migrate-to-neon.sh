#!/usr/bin/env bash
# Migrate production database from Fly MPG to Neon.
#
# Steps this script performs:
#   1. Dump the current production DB via Fly proxy
#   2. Restore the dump into Neon
#   3. Update DATABASE_URL secret on the Fly app
#   4. Restart the app
#
# Prerequisites:
#   flyctl in PATH  (fish: fish_add_path ~/.fly/bin)
#   pg_dump / psql installed
#   PROD_DB_PASSWORD env var  — get with: flyctl postgres show -a hardwarestack-db
#   NEON_URL env var          — copy "Connection string" from neon.tech dashboard
#                               looks like: postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
#
# Usage:
#   PROD_DB_PASSWORD=<pw> NEON_URL=<neon-conn-str> ./scripts/migrate-to-neon.sh

set -euo pipefail

APP="hardwarestack"
DB_APP="hardwarestack-db"
PROXY_PORT=15432
DUMP_FILE="$(mktemp /tmp/hardwarestack-neon-XXXXXX.sql)"

# ── Validate inputs ────────────────────────────────────────────────────────────

if [[ -z "${PROD_DB_PASSWORD:-}" ]]; then
  echo "Error: PROD_DB_PASSWORD is not set."
  echo "  Get it with: flyctl postgres show -a ${DB_APP}"
  exit 1
fi

if [[ -z "${NEON_URL:-}" ]]; then
  echo "Error: NEON_URL is not set."
  echo "  Copy the connection string from your Neon project dashboard."
  exit 1
fi

PROD_URL="postgresql://postgres:${PROD_DB_PASSWORD}@localhost:${PROXY_PORT}/hardwarestack"

# ── Cleanup on exit ────────────────────────────────────────────────────────────

cleanup() {
  rm -f "$DUMP_FILE"
  [[ -n "${PROXY_PID:-}" ]] && kill "$PROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── 1. Dump production ─────────────────────────────────────────────────────────

echo "==> Starting Fly proxy on port ${PROXY_PORT}..."
flyctl proxy "${PROXY_PORT}:5432" -a "$DB_APP" &
PROXY_PID=$!
sleep 3

echo "==> Dumping production database..."
pg_dump --no-owner --no-acl "$PROD_URL" > "$DUMP_FILE"
echo "    $(wc -l < "$DUMP_FILE") lines, $(du -sh "$DUMP_FILE" | cut -f1)"

# Stop proxy — no longer needed
kill "$PROXY_PID" 2>/dev/null || true
unset PROXY_PID

# ── 2. Restore to Neon ────────────────────────────────────────────────────────

echo "==> Restoring dump to Neon..."
# Neon requires SSL; psql picks it up from the connection string (?sslmode=require)
psql "$NEON_URL" -f "$DUMP_FILE"
echo "    Restore complete."

# ── 3. Update Fly secret ──────────────────────────────────────────────────────

echo "==> Updating DATABASE_URL secret on Fly app '${APP}'..."
flyctl secrets set DATABASE_URL="$NEON_URL" --app "$APP"

# ── 4. Restart ────────────────────────────────────────────────────────────────

echo "==> Restarting app..."
flyctl machine restart -a "$APP"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "Migration complete."
echo ""
echo "Next steps:"
echo "  1. Verify the app works: https://${APP}.fly.dev"
echo "  2. Once confirmed, destroy the old Postgres cluster:"
echo "     flyctl postgres destroy ${DB_APP}"
echo ""
echo "  Also update your local .env.local DATABASE_URL if you want to"
echo "  develop against Neon instead of a local Postgres."
