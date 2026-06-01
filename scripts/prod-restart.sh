#!/usr/bin/env bash
# Restart the production Fly machine.
# Useful to clear Next.js unstable_cache after a database update.
#
# Usage: ./scripts/prod-restart.sh

set -euo pipefail

APP="hardwarestack"

echo "==> Restarting machines for app '${APP}'..."
flyctl machine restart -a "$APP"
echo "Done."
