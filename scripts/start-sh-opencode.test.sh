#!/usr/bin/env bash
# Contract tests for start.sh OpenCode orchestration (no live servers required).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SH="${ROOT_DIR}/start.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$START_SH" ]] || fail "missing start.sh"

bash -n "$START_SH" || fail "start.sh failed bash -n"

grep -q 'opencode-serve' "$START_SH" || fail "start.sh must manage PM2 app opencode-serve"
grep -q '4096' "$START_SH" || fail "start.sh must mention OpenCode port 4096"
grep -q 'START_OPENCODE' "$START_SH" || fail "start.sh must support START_OPENCODE"
grep -q 'global/health' "$START_SH" || fail "start.sh must health-check OpenCode /global/health"

# stop_dev must not tear down the PM2 daemon (that used to drop opencode-serve).
if awk '
  /^stop_dev\(\)/ { in_fn=1; next }
  in_fn && /^[a-zA-Z_][a-zA-Z0-9_]*\(\)/ { exit }
  in_fn && /pm2 kill/ { found=1 }
  END { exit found ? 0 : 1 }
' "$START_SH"; then
  fail "stop_dev still calls pm2 kill (would drop opencode-serve)"
fi

# Source helpers without running main.
# shellcheck source=/dev/null
source "$START_SH"

command -v should_start_opencode >/dev/null || fail "should_start_opencode missing"
command -v resolve_opencode_bin >/dev/null || fail "resolve_opencode_bin missing"

START_OPENCODE=false
should_start_opencode && fail "START_OPENCODE=false should skip"

START_OPENCODE=true
should_start_opencode || fail "START_OPENCODE=true should start"

tmp="$(mktemp)"
chmod +x "$tmp"
OPENCODE_BIN="$tmp"
START_OPENCODE=auto
if ! should_start_opencode; then
  rm -f "$tmp"
  fail "START_OPENCODE=auto should start when OPENCODE_BIN is executable"
fi
rm -f "$tmp"

tmp="$(mktemp)"
chmod +x "$tmp"
OPENCODE_BIN="$tmp"
[[ "$(resolve_opencode_bin)" == "$tmp" ]] || fail "resolve_opencode_bin should prefer executable OPENCODE_BIN"
rm -f "$tmp"

workspace="$(mktemp -d)"
mkdir -p "$workspace/packages/opencode/dist/opencode-darwin-arm64/bin" "$workspace/empty-bin"
workspace_bin="$workspace/packages/opencode/dist/opencode-darwin-arm64/bin/opencode"
touch "$workspace_bin"
chmod +x "$workspace_bin"
OPENCODE_BIN=""
OPENCODE_WORKSPACE_DIR="$workspace"
PATH="$workspace/empty-bin:$PATH"
[[ "$(resolve_opencode_bin)" == "$workspace_bin" ]] || fail "resolve_opencode_bin should prefer the workspace OpenCode binary"
rm -rf "$workspace"

echo "OK: start.sh OpenCode contract tests passed"
