#!/usr/bin/env bash
#
# Starts the live Bitget Demo A/B canary and appends every tick to
# reports/canary.jsonl.
#
# Credentials are read from .env into the environment and never passed as
# arguments, so they cannot appear in shell history or a process listing.
# .env is gitignored; the JSONL log it produces carries no credential fields.
#
# The canary trades Demo (paper) only: BitgetDemoClient hardcodes the
# `paptrading: 1` header and has no live-mode branch.
#
#   ./scripts/run-canary.sh              # 15-minute ticks, runs until stopped
#   ./scripts/run-canary.sh --dry-run    # decide and log, place no orders
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

if [ ! -f .env ]; then
  echo "run-canary: .env not found. See README for the six required variables." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

mkdir -p reports

exec node packages/canary/dist/bin.js run \
  --symbol "${CANARY_SYMBOL:-BTCUSDT}" \
  --interval-ms "${CANARY_INTERVAL_MS:-900000}" \
  --notional "${CANARY_NOTIONAL:-15}" \
  --max-notional "${CANARY_MAX_NOTIONAL:-50}" \
  --log "$ROOT/reports/canary.jsonl" \
  "$@"
