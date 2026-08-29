#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_WEB="${ROOT_DIR}/.run/start-web.js"

grep -q 'exec", "vite"' "${START_WEB}" || {
  echo "start-web.js must resolve Vite through the active package manager" >&2
  exit 1
}
grep -q 'BUILDINGAI_PNPM_BIN' "${START_WEB}" || {
  echo "start-web.js must allow an explicit package-manager path" >&2
  exit 1
}

echo "start-web launcher resolves the current Vite package"
