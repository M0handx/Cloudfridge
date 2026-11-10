#!/bin/bash
# Builds the release zips for Phase 3.
#
#   scripts/package.sh            builds both
#   scripts/package.sh backend    backend only
#   scripts/package.sh frontend   frontend only
#
# Output: release/backend/current.zip and release/frontend/current.zip.
# Upload each one to the releases bucket with the same path (see the Phase 3 walkthrough).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/release"
TARGET="${1:-all}"

package_backend() {
  local stage
  stage="$(mktemp -d)"
  # Only what the server needs. Dependencies are installed here, so the server never runs npm.
  cp -R "$ROOT/backend/src" "$ROOT/backend/migrations" "$ROOT/backend/scripts" "$ROOT/backend/deploy" "$stage/"
  cp "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" "$stage/"
  (cd "$stage" && npm ci --omit=dev --no-audit --no-fund)

  if [ ! -f "$stage/deploy/rds-ca-bundle.pem" ]; then
    echo "Missing backend/deploy/rds-ca-bundle.pem. Download it first (Phase 3, step 1)." >&2
    rm -rf "$stage"
    exit 1
  fi

  mkdir -p "$OUT/backend"
  rm -f "$OUT/backend/current.zip"
  (cd "$stage" && zip -qr "$OUT/backend/current.zip" .)
  rm -rf "$stage"
  echo "Built $OUT/backend/current.zip"
}

package_frontend() {
  (cd "$ROOT/frontend" && npm ci --no-audit --no-fund && npm run build)
  mkdir -p "$OUT/frontend"
  rm -f "$OUT/frontend/current.zip"
  # The zip holds the contents of dist/, so index.html sits at the top level.
  (cd "$ROOT/frontend/dist" && zip -qr "$OUT/frontend/current.zip" .)
  echo "Built $OUT/frontend/current.zip"
}

case "$TARGET" in
  backend) package_backend ;;
  frontend) package_frontend ;;
  all) package_backend; package_frontend ;;
  *) echo "Usage: $0 [backend|frontend|all]" >&2; exit 1 ;;
esac

