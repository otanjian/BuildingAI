#!/usr/bin/env bash
# Contract tests for start.sh Doris orchestration (no live restart required).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SH="${ROOT_DIR}/start.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }

bash -n "$START_SH" || fail "start.sh failed bash -n"
grep -q 'DORIS_WORKSPACE_DIR' "$START_SH" || fail "Doris workspace must be configurable"
grep -q 'start_doris_stack' "$START_SH" || fail "Doris stack start helper is missing"
grep -q 'ensure_docker_available' "$START_SH" || fail "Docker runtime auto-start helper is missing"
grep -q 'context.*colima' "$START_SH" || fail "Colima context recovery is missing"
grep -q 'doris-mcp' "$START_SH" || fail "Doris MCP PM2 process is missing"
grep -q 'doris-web' "$START_SH" || fail "Doris frontend PM2 process is missing"
grep -q 'docker compose -f "\$DORIS_COMPOSE_FILE" up -d fe be' "$START_SH" \
  || fail "Doris FE/BE must use the configured Compose file"
grep -q 'START_DORIS' "$START_SH" || fail "Doris all-target opt-in is missing"
grep -q 'prebuild_ai_sdk' "$START_SH" || fail "API startup must refresh the shared AI SDK build"
grep -q 'ai_sdk_need_prebuild' "$START_SH" || fail "AI SDK freshness check is missing"

# shellcheck source=/dev/null
source "$START_SH"

START_DORIS=false
if should_start_doris; then
  fail "START_DORIS=false should skip Doris"
fi
START_DORIS=true
should_start_doris || fail "START_DORIS=true should enable Doris"

workspace="$(mktemp -d)"
mkdir -p "$workspace/db/.venv/bin"
touch "$workspace/docker-compose.yml" "$workspace/db/start-doris-mcp.sh" "$workspace/db/.venv/bin/python"
chmod +x "$workspace/db/start-doris-mcp.sh" "$workspace/db/.venv/bin/python"
DORIS_WORKSPACE_DIR="$workspace"
DORIS_COMPOSE_FILE="$workspace/docker-compose.yml"
DORIS_MCP_SCRIPT="$workspace/db/start-doris-mcp.sh"
DORIS_PYTHON="$workspace/db/.venv/bin/python"
doris_paths_valid || fail "valid Doris workspace should pass path validation"
rm -rf "$workspace"

echo "OK: start.sh Doris contract tests passed"
