#!/usr/bin/env bash
# Contract tests for start.sh OpenCode orchestration (no live servers required).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SH="${ROOT_DIR}/start.sh"
BUILD_OPENCODE="${ROOT_DIR}/scripts/build-opencode-runtime.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$START_SH" ]] || fail "missing start.sh"
[[ -x "$BUILD_OPENCODE" ]] || fail "controlled OpenCode build script must be executable"

bash -n "$START_SH" || fail "start.sh failed bash -n"

grep -q 'opencode-serve' "$START_SH" || fail "start.sh must manage PM2 app opencode-serve"
grep -q '4096' "$START_SH" || fail "start.sh must mention OpenCode port 4096"
grep -q 'START_OPENCODE' "$START_SH" || fail "start.sh must support START_OPENCODE"
grep -q 'global/health' "$START_SH" || fail "start.sh must health-check OpenCode /global/health"
grep -q -- '"$build_script" --single --skip-install' "$BUILD_OPENCODE" \
  || fail "controlled build must preserve dependencies and lockfile with --skip-install"
grep -q -- 'OPENCODE_CHANNEL=master "$build_script" --single --skip-install' "$BUILD_OPENCODE" \
  || fail "controlled build must always compile the master OpenCode channel"
grep -q 'packages/opencode/test/tool/fixtures/models-api.json' "$BUILD_OPENCODE" \
  || fail "controlled build must provide the repository models snapshot when no override is configured"
if grep -q -- '--skip-embed-web-ui' "$BUILD_OPENCODE"; then
  fail "controlled build must never allow omission of the embedded Web UI"
fi

awk '
  /^    restart\)/ { in_restart=1; next }
  in_restart && /preflight_target/ { preflight=NR }
  in_restart && /stop_target/ { stop=NR }
  in_restart && /^      ;;/ { exit (preflight && stop && preflight < stop) ? 0 : 1 }
  END { if (!in_restart || !(preflight && stop && preflight < stop)) exit 1 }
' "$START_SH" || fail "restart must validate the replacement runtime before stopping services"

awk '
  /^start_opencode\(\)/ { in_fn=1; next }
  in_fn && /pm2 delete opencode-serve/ { deleted=NR }
  in_fn && /kill_port "\$OPENCODE_PORT"/ { released=NR }
  in_fn && /ensure_ports_available/ { checked=NR; exit (deleted && released && deleted < released && released < checked) ? 0 : 1 }
  END { if (!(deleted && released && checked && deleted < released && released < checked)) exit 1 }
' "$START_SH" || fail "OpenCode replacement must release the managed port after deleting the old PM2 process"

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
command -v opencode_binary_integrity_valid >/dev/null || fail "opencode_binary_integrity_valid missing"
command -v opencode_version_is_master >/dev/null || fail "opencode_version_is_master missing"
command -v opencode_html_has_contract >/dev/null || fail "opencode_html_has_contract missing"
command -v opencode_runtime_matches_binary >/dev/null || fail "opencode_runtime_matches_binary missing"
command -v opencode_write_active_runtime >/dev/null || fail "opencode_write_active_runtime missing"

fingerprint_body="$(declare -f opencode_source_fingerprint)"
[[ "$fingerprint_body" == *"perl -0"* ]] \
  || fail "source fingerprinting must batch file reads instead of spawning one process per file"

START_OPENCODE=false
should_start_opencode && fail "START_OPENCODE=false should skip"

START_OPENCODE=true
should_start_opencode || fail "START_OPENCODE=true should start"

opencode_version_is_master "0.0.0-master-202608231556" \
  || fail "master build version should be accepted"
if opencode_version_is_master "0.0.0-dev-202608231344"; then
  fail "dev build version must be rejected"
fi
if opencode_version_is_master "0.0.0-masterpiece-202608231556"; then
  fail "channel matching must require the exact master segment"
fi

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

integrity_workspace="$(mktemp -d)"
mkdir -p "$integrity_workspace/packages/app" "$integrity_workspace/packages/opencode/dist/test/bin"
printf '%s\n' '<meta name="buildingai-web-ui-contract" content="buildingai-embed-shell-v1" />' \
  >"$integrity_workspace/packages/app/index.html"
printf '%s\n' '{"name":"fixture"}' >"$integrity_workspace/package.json"
git -C "$integrity_workspace" init -q
git -C "$integrity_workspace" add package.json packages/app/index.html
integrity_bin="$integrity_workspace/packages/opencode/dist/test/bin/opencode"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'printf "%s\\n" "0.0.0-master-fixture"' \
  'binary without the managed UI contract' >"$integrity_bin"
chmod +x "$integrity_bin"
if OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_write_runtime_attestation "$integrity_bin" >/dev/null 2>&1; then
  rm -rf "$integrity_workspace"
  fail "attestation must reject a binary without the managed Web UI contract"
fi

printf '%s\n' \
  '#!/usr/bin/env bash' \
  '# buildingai-embed-shell-v1' \
  'printf "%s\\n" "0.0.0-master-fixture"' >"$integrity_bin"
chmod +x "$integrity_bin"
OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_write_runtime_attestation "$integrity_bin"
OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_binary_integrity_valid "$integrity_bin" \
  || fail "freshly attested binary should pass integrity validation"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  '# buildingai-embed-shell-v1' \
  'printf "%s\\n" "0.0.0-dev-fixture"' >"$integrity_bin"
OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_write_runtime_attestation "$integrity_bin"
non_master_error="$(
  OPENCODE_WORKSPACE_DIR="$integrity_workspace" \
    opencode_binary_integrity_valid "$integrity_bin" 2>&1 || true
)"
[[ "$non_master_error" == *"master-channel runtime is required"* ]] \
  || fail "non-master binary must fail integrity validation with an actionable diagnostic"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  '# tampered binary buildingai-embed-shell-v1' \
  'printf "%s\\n" "0.0.0-master-fixture"' >"$integrity_bin"
if OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_binary_integrity_valid "$integrity_bin" >/dev/null 2>&1; then
  rm -rf "$integrity_workspace"
  fail "binary fingerprint mismatch must fail integrity validation"
fi

printf '%s\n' \
  '#!/usr/bin/env bash' \
  '# buildingai-embed-shell-v1' \
  'printf "%s\\n" "0.0.0-master-fixture"' >"$integrity_bin"
OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_write_runtime_attestation "$integrity_bin"
printf '%s\n' '<!-- source drift -->' >>"$integrity_workspace/packages/app/index.html"
if OPENCODE_WORKSPACE_DIR="$integrity_workspace" opencode_binary_integrity_valid "$integrity_bin" >/dev/null 2>&1; then
  rm -rf "$integrity_workspace"
  fail "source fingerprint drift must fail integrity validation"
fi

opencode_html_has_contract \
  '<html><head><meta name="buildingai-web-ui-contract" content="buildingai-embed-shell-v1" /></head></html>' \
  || fail "served HTML with the managed contract should pass"
if opencode_html_has_contract '<html><head><title>Upstream OpenCode</title></head></html>'; then
  rm -rf "$integrity_workspace"
  fail "upstream HTML without the managed contract must fail"
fi
rm -rf "$integrity_workspace"

runtime_bin="$(mktemp)"
printf '%s\n' '#!/usr/bin/env bash' 'printf "%s\\n" "0.0.0-master-fixture-build-42"' >"$runtime_bin"
chmod +x "$runtime_bin"
runtime_state_dir="$(mktemp -d)"
RUN_DIR="$runtime_state_dir"
opencode_health_ready() { return 0; }
opencode_web_ui_compatible() { return 0; }
opencode_reported_version() { printf '%s\n' '0.0.0-master-fixture-build-42'; }
opencode_write_active_runtime "$runtime_bin"
opencode_runtime_matches_binary "$runtime_bin" \
  || fail "healthy runtime should match the selected binary build version"
printf '%s\n' '# same version, different binary bytes' >>"$runtime_bin"
if opencode_runtime_matches_binary "$runtime_bin"; then
  rm -f "$runtime_bin"
  rm -rf "$runtime_state_dir"
  fail "runtime must not match a replacement binary with the same version"
fi
opencode_write_active_runtime "$runtime_bin"
opencode_reported_version() { printf '%s\n' 'different-build'; }
if opencode_runtime_matches_binary "$runtime_bin"; then
  rm -f "$runtime_bin"
  rm -rf "$runtime_state_dir"
  fail "runtime must not match a different selected binary build version"
fi
opencode_reported_version() { printf '%s\n' '0.0.0-dev-fixture-build-42'; }
if opencode_ready; then
  rm -f "$runtime_bin"
  rm -rf "$runtime_state_dir"
  fail "readiness must reject a live non-master runtime"
fi
rm -f "$runtime_bin"
rm -rf "$runtime_state_dir"

# Configurable API/client ports must flow into the managed dev port list and health helpers.
SERVER_PORT=4190
CLIENT_DEV_PORT=4191
refresh_dev_ports
[[ "${DEV_PORTS[*]}" == "4190 4191" ]] || fail "refresh_dev_ports should use SERVER_PORT and CLIENT_DEV_PORT"
[[ "$(api_url)" == "http://127.0.0.1:4190" ]] || fail "api_url should use SERVER_PORT"
configured_web_port="$(CLIENT_DEV_PORT=4191 node -e 'console.log(require("./ecosystem.config").apps.find((app) => app.name === "buildingai-web").env.CLIENT_DEV_PORT)')"
[[ "$configured_web_port" == "4191" ]] || fail "PM2 web config should inherit CLIENT_DEV_PORT"

echo "OK: start.sh OpenCode contract tests passed"
