#!/bin/bash
# Builds the release zips for Phases 3 and 4.
#
#   scripts/package.sh            builds backend + frontend
#   scripts/package.sh backend    backend only
#   scripts/package.sh frontend   frontend only
#   scripts/package.sh lambda     alert Lambda only
#
# Output: release/backend/current.zip, release/frontend/current.zip, release/lambda/send-alerts.zip.
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

package_lambda() {
  local stage
  stage="$(mktemp -d)"
  cp "$ROOT/lambda/send-alerts/index.js" "$ROOT/lambda/send-alerts/sendAlert.js" "$ROOT/lambda/send-alerts/package.json" "$stage/"
  if [ -f "$ROOT/lambda/send-alerts/package-lock.json" ]; then
    cp "$ROOT/lambda/send-alerts/package-lock.json" "$stage/"
  fi
  if [ -f "$ROOT/lambda/send-alerts/rds-ca.pem" ]; then
    cp "$ROOT/lambda/send-alerts/rds-ca.pem" "$stage/rds-ca.pem"
  elif [ -f "$ROOT/backend/deploy/rds-ca-bundle.pem" ]; then
    cp "$ROOT/backend/deploy/rds-ca-bundle.pem" "$stage/rds-ca.pem"
  else
    echo "Missing rds-ca.pem." >&2
    rm -rf "$stage"
    exit 1
  fi
  (cd "$stage" && npm install --omit=dev --no-audit --no-fund)

  mkdir -p "$OUT/lambda"
  rm -f "$OUT/lambda/send-alerts.zip"
  (cd "$stage" && zip -qr "$OUT/lambda/send-alerts.zip" .)
  rm -rf "$stage"
  echo "Built $OUT/lambda/send-alerts.zip"
}

case "$TARGET" in
  backend) package_backend ;;
  frontend) package_frontend ;;
  lambda) package_lambda ;;
  all) package_backend; package_frontend ;;
  *) echo "Usage: $0 [backend|frontend|lambda|all]" >&2; exit 1 ;;
esac

