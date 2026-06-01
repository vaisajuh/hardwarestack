#!/usr/bin/env bash
# Migrate production database from Fly MPG to Neon.
#
# Steps:
#   1. Dump the current production DB via Fly proxy
#   2. Restore the dump into Neon (via direct connection)
#   3. Update Fly secrets (DATABASE_URL + DIRECT_URL)
#   4. Restart the app
#
# Prerequisites:
#   flyctl in PATH  (fish: fish_add_path ~/.fly/bin)
#   pg_dump / psql installed
#
# Required env vars:
#   PROD_DB_PASSWORD   — Fly MPG password: flyctl postgres show -a hardwarestack-db
#   NEON_DIRECT_URL    — Direct (non-pooled) connection string from Neon dashboard
#                        e.g. postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
#
# Optional env vars:
#   NEON_POOL_URL      — Pooled connection string from Neon dashboard (recommended for runtime)
#                        e.g. postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
#                        If omitted, DATABASE_URL will be set to NEON_DIRECT_URL.
#
# Neon dashboard → your project → Connection Details
#   toggle "Pooled connection" off  → NEON_DIRECT_URL  (use for migrations / pg restore)
#   toggle "Pooled connection" on   → NEON_POOL_URL    (use for app runtime)
#
# Usage:
#   PROD_DB_PASSWORD=<pw> NEON_DIRECT_URL="postgresql://..." NEON_POOL_URL="postgresql://..." \
#     ./scripts/migrate-to-neon.sh

set -euo pipefail

# Load .env.local from repo root if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

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

if [[ -z "${NEON_DIRECT_URL:-}" ]]; then
  echo "Error: NEON_DIRECT_URL is not set."
  echo "  In the Neon dashboard: Connection Details → disable 'Pooled connection' → copy string."
  exit 1
fi

# Use pooled URL for app runtime if provided, otherwise fall back to direct.
RUNTIME_URL="${NEON_POOL_URL:-$NEON_DIRECT_URL}"

if [[ -z "${NEON_POOL_URL:-}" ]]; then
  echo "Warning: NEON_POOL_URL not set — using direct URL for runtime (fine for low traffic)."
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

kill "$PROXY_PID" 2>/dev/null || true
unset PROXY_PID

# ── 2. Restore to Neon ────────────────────────────────────────────────────────

echo "==> Restoring dump to Neon (direct connection)..."
psql "$NEON_DIRECT_URL" -f "$DUMP_FILE"
echo "    Restore complete."

# ── 3. Update Fly secrets ─────────────────────────────────────────────────────

echo "==> Updating Fly secrets..."
if [[ -n "${NEON_POOL_URL:-}" ]]; then
  # Set pooled URL for runtime queries, direct URL for Prisma migrate
  flyctl secrets set \
    DATABASE_URL="$NEON_POOL_URL" \
    DIRECT_URL="$NEON_DIRECT_URL" \
    --app "$APP"
  echo "    DATABASE_URL → pooled connection"
  echo "    DIRECT_URL   → direct connection (used by prisma migrate)"
else
  flyctl secrets set DATABASE_URL="$NEON_DIRECT_URL" --app "$APP"
  echo "    DATABASE_URL → direct connection"
fi

# ── 4. Restart ────────────────────────────────────────────────────────────────

echo "==> Restarting app..."
flyctl machine restart -a "$APP"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "Migration complete."
echo ""
echo "Next steps:"
echo "  1. Verify the app works: https://${APP}.fly.dev"
echo "  2. Once confirmed, destroy the Fly MPG cluster (~\$17/month saved):"
echo "     flyctl postgres destroy ${DB_APP}"
echo ""
echo "  If you set DIRECT_URL, also update prisma.config.ts to read it:"
echo "    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL"
