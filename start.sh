#!/usr/bin/env bash
# Bowi AI local dev orchestrator: API :4090, web :4091, OpenCode :4096,
# SAP ADT MCP :8100, SAP PyRFC MCP :8200, optional Docker infra
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_DIR="${ROOT_DIR}/.run"
SAP_DIR="${ROOT_DIR}/integrations/sap-abap-adt-mcp"
SAP_ENV="${SAP_DIR}/.env"
SAP_PYRFC_DIR="${ROOT_DIR}/integrations/sap-pyrfc-mcp"
SAP_PYRFC_ENV="${SAP_PYRFC_DIR}/.env"
DORIS_WORKSPACE_DIR="${DORIS_WORKSPACE_DIR:-${ROOT_DIR}/../doris}"
DORIS_COMPOSE_FILE="${DORIS_COMPOSE_FILE:-${DORIS_WORKSPACE_DIR}/docker-compose.yml}"
DORIS_MCP_SCRIPT="${DORIS_MCP_SCRIPT:-${DORIS_WORKSPACE_DIR}/db/start-doris-mcp.sh}"
DORIS_PYTHON="${DORIS_PYTHON:-${DORIS_WORKSPACE_DIR}/db/.venv/bin/python}"
DORIS_WEB_PORT="${DORIS_WEB_PORT:-8300}"
DORIS_FE_PORT="${DORIS_FE_PORT:-8030}"
DORIS_BE_PORT="${DORIS_BE_PORT:-8040}"
DORIS_MCP_PORT="${DORIS_MCP_PORT:-3000}"

SERVER_PORT="${SERVER_PORT:-4090}"
CLIENT_DEV_PORT="${CLIENT_DEV_PORT:-4091}"
DEV_PORTS=()
OPENCODE_PORT="${OPENCODE_PORT:-4096}"
OPENCODE_WORKSPACE_DIR="${OPENCODE_WORKSPACE_DIR:-${ROOT_DIR}/../opencode}"
OPENCODE_WEB_UI_CONTRACT="buildingai-embed-shell-v1"
SAP_PORT="${MCP_PORT:-8100}"
SAP_PYRFC_PORT="${SAP_PYRFC_MCP_PORT:-8200}"
ERPNEXT_PORT=8000
INFRA_SERVICES=(redis postgres)
# Overridable in tests; default Homebrew data dirs on Apple Silicon / Intel Mac.
HOMEBREW_PG_DATA_DIRS=(
  "/opt/homebrew/var/postgresql@17"
  "/opt/homebrew/var/postgresql@16"
  "/opt/homebrew/var/postgresql@15"
  "/opt/homebrew/var/postgres"
  "/usr/local/var/postgresql@17"
  "/usr/local/var/postgresql@16"
  "/usr/local/var/postgresql@15"
  "/usr/local/var/postgres"
)

export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="$NO_PROXY"

# Drop broken local HTTP proxies (e.g. 127.0.0.1:31181) for git/npm in child scripts.
clear_broken_proxy() {
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
  export NO_PROXY="localhost,127.0.0.1,::1"
  export no_proxy="$NO_PROXY"
}

COMMAND="start"
FORCE=0
TARGET="all"
DETACH=0

usage() {
  cat <<'EOF'
Usage: ./start.sh [command] [target] [options]

Commands:
  (default)     Start dev stack + OpenCode (+ SAP MCP if configured)
  restart       Stop all managed services, then start again (no port prompt)
  stop          Stop dev ports, OpenCode, SAP MCP, and infra started by this script
  status        Show listeners and PID files
  logs          Tail logs (default: dev; use "opencode", "sap", or "all")

Targets (optional, for start/restart/stop):
  all           Dev + OpenCode + SAP MCPs + infra when enabled (default)
  dev           Bowi AI API + web + OpenCode (pnpm dev:core — no extension Vite)
  opencode      OpenCode serve only (:4096)
  sap           SAP ABAP ADT MCP only (:8100)
  sap-pyrfc     SAP PyRFC MCP only (:8200)
  infra         Docker redis + postgres only
  doris         Doris FE/BE + knowledge hub + Doris MCP

Options:
  -f, --force   Kill processes on busy ports without prompting
  -d, --detach  Run API + web in background (logs: .run/dev.log)

Environment (root .env or shell):
  START_OPENCODE=auto|true|false        Default auto (start if opencode binary exists)
  START_SAP_MCP=auto|true|false         Default auto (start if integrations/sap-abap-adt-mcp/.env exists)
  START_SAP_PYRFC_MCP=auto|true|false   Default auto (start if integrations/sap-pyrfc-mcp/.env exists)
  START_DOCKER_INFRA=true|false         Default false — docker compose up redis postgres
  START_DORIS=true|false                Default false — include sibling Doris stack in all
  DORIS_WORKSPACE_DIR                   Doris workspace (default: ../doris)
  DORIS_COMPOSE_FILE                    Doris FE/BE Compose file
  DORIS_PYTHON                          Python interpreter for the Doris static server
  DORIS_WEB_PORT=8300                   Doris knowledge-hub static frontend port
  DORIS_FE_PORT=8030                    Doris FE HTTP port
  DORIS_BE_PORT=8040                    Doris BE HTTP port
  DORIS_MCP_PORT=3000                   Doris MCP HTTP port
  SERVER_PORT=4090                      API server HTTP port
  CLIENT_DEV_PORT=4091                  Web development server HTTP port
  OPENCODE_PORT=4096                    OpenCode serve HTTP port
  OPENCODE_BIN                          Optional path to an attested master-channel opencode binary
  OPENCODE_WORKSPACE_DIR                OpenCode source workspace (default: ../opencode)
  OPENCODE_RUNTIME_ATTESTATION          Optional attestation path (default: <binary>.buildingai-attestation)
  BUILDINGAI_API_URL                    Internal API base used by OpenCode credential injection (default: API :4090)
  BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY Key for audience-bound 60-second OpenCode service tokens
  BUILDINGAI_OPENCODE_INTERNAL_KEY      Development-only compatibility key (never accepted in production)
  BOWI_MCP_INVOCATION_SECRET            HMAC secret for short-lived first-party Bowi assertions (falls back to JWT_SECRET)
  MCP_PORT=8100                         SAP ADT MCP HTTP port
  SAP_PYRFC_MCP_PORT=8200               SAP PyRFC MCP HTTP port

  Before API/web start, start.sh checks Postgres (:DB_PORT) and Redis (:REDIS_PORT).
  It clears a stale Homebrew postmaster.pid when the recorded PID is dead or not postgres,
  then tries brew services restart for postgresql@* / redis when needed.

Examples:
  ./start.sh                      # first start (foreground dev + OpenCode)
  ./start.sh restart              # restart everything managed
  ./start.sh stop                 # stop everything
  ./start.sh status
  ./start.sh logs opencode
  ./start.sh restart sap          # SAP ADT MCP only
  ./start.sh restart sap-pyrfc    # SAP PyRFC MCP only
  ./start.sh restart opencode     # OpenCode serve only
  ./start.sh restart doris        # Doris FE/BE + knowledge hub + Doris MCP
  ./start.sh infra start          # postgres + redis via Docker
  ./start.sh -f restart           # force-free ports, then start

MCP endpoints (register in console when running):
  SAP ADT:    http://127.0.0.1:8100/mcp
  SAP PyRFC:  http://127.0.0.1:8200/mcp
  ERPNext:    http://127.0.0.1:8000/... (external; not started by this script)

EOF
}

# Read one KEY=VALUE from .env without sourcing the whole file (avoids breaking on
# unquoted values such as PM2_LOG_DATE_FORMAT=YYYY-MM-DD HH:mm:ss Z).
read_env_var() {
  local key="$1" file="$2" line value
  line="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [[ -z "$line" ]] && return 1
  value="${line#*=}"
  # Trim leading/trailing whitespace and matching surrounding quotes
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ "${value#\"}" != "$value" && "${value%\"}" != "$value" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

load_root_env() {
  local env_file="${ROOT_DIR}/.env"
  local key value
  if [[ -f "$env_file" ]]; then
    for key in START_OPENCODE START_SAP_MCP START_SAP_PYRFC_MCP START_DOCKER_INFRA START_DORIS DORIS_WORKSPACE_DIR DORIS_COMPOSE_FILE DORIS_MCP_SCRIPT DORIS_PYTHON DORIS_WEB_PORT DORIS_FE_PORT DORIS_BE_PORT DORIS_MCP_PORT OPENCODE_PORT OPENCODE_BIN OPENCODE_WORKSPACE_DIR OPENCODE_RUNTIME_ATTESTATION BUILDINGAI_API_URL BUILDINGAI_OPENCODE_INTERNAL_KEY BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY BUILDINGAI_CREDENTIAL_KMS_KEY BUILDINGAI_TOKEN_HASH_KEY BOWI_MCP_INVOCATION_SECRET BOWI_MCP_OPENCODE_CAPABILITIES BOWI_SAP_ADT_MCP_URL BOWI_SAP_PYRFC_MCP_URL BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED BOWI_SAP_SERVICE_PROFILE_ENABLED BOWI_SAP_MCP_TIMEOUT_MS BOWI_SAP_CONNECTION_IDLE_TTL_MS SAP_RFC_ALLOWLIST CLIENT_DEV_PORT MCP_PORT MCP_HOST MCP_PATH SAP_PYRFC_MCP_PORT SERVER_PORT APP_DOMAIN DB_HOST DB_PORT REDIS_HOST REDIS_PORT; do
      if value="$(read_env_var "$key" "$env_file")"; then
        export "${key}=${value}"
      fi
    done
  fi
  SERVER_PORT="${SERVER_PORT:-4090}"
  CLIENT_DEV_PORT="${CLIENT_DEV_PORT:-4091}"
  OPENCODE_PORT="${OPENCODE_PORT:-4096}"
  OPENCODE_WORKSPACE_DIR="${OPENCODE_WORKSPACE_DIR:-${ROOT_DIR}/../opencode}"
  SAP_PORT="${MCP_PORT:-8100}"
  SAP_PYRFC_PORT="${SAP_PYRFC_MCP_PORT:-8200}"
  DORIS_WORKSPACE_DIR="${DORIS_WORKSPACE_DIR:-${ROOT_DIR}/../doris}"
  DORIS_COMPOSE_FILE="${DORIS_COMPOSE_FILE:-${DORIS_WORKSPACE_DIR}/docker-compose.yml}"
  DORIS_MCP_SCRIPT="${DORIS_MCP_SCRIPT:-${DORIS_WORKSPACE_DIR}/db/start-doris-mcp.sh}"
  DORIS_PYTHON="${DORIS_PYTHON:-${DORIS_WORKSPACE_DIR}/db/.venv/bin/python}"
  DORIS_WEB_PORT="${DORIS_WEB_PORT:-8300}"
  DORIS_FE_PORT="${DORIS_FE_PORT:-8030}"
  DORIS_BE_PORT="${DORIS_BE_PORT:-8040}"
  DORIS_MCP_PORT="${DORIS_MCP_PORT:-3000}"
  START_OPENCODE="${START_OPENCODE:-auto}"
  START_SAP_MCP="${START_SAP_MCP:-auto}"
  START_SAP_PYRFC_MCP="${START_SAP_PYRFC_MCP:-auto}"
  START_DOCKER_INFRA="${START_DOCKER_INFRA:-false}"
  START_DORIS="${START_DORIS:-false}"
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  BUILDINGAI_API_URL="${BUILDINGAI_API_URL:-$(api_url)}"
  BUILDINGAI_OPENCODE_INTERNAL_KEY="${BUILDINGAI_OPENCODE_INTERNAL_KEY:-}"
  BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY="${BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY:-}"
  if [[ "${NODE_ENV:-development}" == "production" && -z "${BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY}" ]]; then
    echo "BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY must be set in production" >&2
    return 1
  fi
  export BUILDINGAI_API_URL BUILDINGAI_OPENCODE_INTERNAL_KEY BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY
  refresh_dev_ports
}

refresh_dev_ports() {
  DEV_PORTS=("${SERVER_PORT:-4090}" "${CLIENT_DEV_PORT:-4091}")
}

load_nvm() {
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm use 22 >/dev/null 2>&1 || nvm use 22
  fi
}

check_node() {
  local version major minor
  version="$(node -v 2>/dev/null | sed 's/^v//')"
  major="${version%%.*}"
  minor="$(echo "$version" | cut -d. -f2)"
  if [[ "$major" != "22" ]] || [[ "${minor:-0}" -lt 20 ]]; then
    echo "Error: Node.js 22.20+ is required (current: v${version:-unknown})."
    echo "  nvm install 22 && nvm use 22"
    exit 1
  fi
}

check_env_file() {
  if [[ ! -f "${ROOT_DIR}/.env" ]]; then
    echo "Error: .env not found. Run: cp .env.example .env && pnpm sync-env"
    exit 1
  fi
}

ensure_run_dir() {
  mkdir -p "$RUN_DIR"
}

port_pids() {
  local port="$1"
  lsof -ti:"$port" 2>/dev/null || true
}

port_in_use() {
  local port="$1"
  [[ -n "$(port_pids "$port")" ]]
}

kill_port() {
  local port="$1"
  local pids
  pids="$(port_pids "$port")"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

# Cursor IDE auto-forwards dev ports and breaks localhost:4091 (ERR_EMPTY_RESPONSE).
kill_cursor_listeners() {
  local port="$1"
  local line pid comm
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    pid="${line%% *}"
    comm="${line#* }"
    if [[ "$comm" == Cursor ]]; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done < <(lsof -i ":${port}" -P -n 2>/dev/null | awk 'NR>1 {print $2,$1}' | sort -u)
}

free_ports() {
  local ports=("$@") port
  local found=0
  for port in "${ports[@]}"; do
    kill_cursor_listeners "$port"
    if port_in_use "$port"; then
      found=1
      kill_port "$port"
    fi
  done
  # Clean up legacy client port if we moved away temporarily.
  if port_in_use 4092; then
    kill_port 4092
  fi
  if [[ "$found" == 1 ]]; then
    sleep 0.4
  fi
}

api_url() {
  printf 'http://127.0.0.1:%s' "${SERVER_PORT:-4090}"
}

api_ready() {
  curl -sf --noproxy '*' --max-time 2 "$(api_url)/consoleapi/health" >/dev/null 2>&1
}

web_ready() {
  local port="${CLIENT_DEV_PORT:-4091}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

vite_client_ready() {
  local port="${CLIENT_DEV_PORT:-4091}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/@vite/client" >/dev/null 2>&1
}

web_proxy_ready() {
  local port="${CLIENT_DEV_PORT:-4091}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/api/config" >/dev/null 2>&1
}

opencode_health_ready() {
  local port="${OPENCODE_PORT:-4096}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/global/health" >/dev/null 2>&1
}

opencode_version_is_master() {
  local version="${1:-}"
  [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-master($|-) ]]
}

opencode_html_has_contract() {
  local html="${1:-}"
  [[ "$html" == *'name="buildingai-web-ui-contract"'* \
    && "$html" == *"content=\"${OPENCODE_WEB_UI_CONTRACT}\""* ]]
}

opencode_web_ui_compatible() {
  local port="${OPENCODE_PORT:-4096}" html
  html="$(curl -sf --noproxy '*' --max-time 5 "http://127.0.0.1:${port}/" 2>/dev/null || true)"
  opencode_html_has_contract "$html"
}

opencode_ready() {
  local version
  opencode_health_ready || return 1
  version="$(opencode_reported_version || true)"
  opencode_version_is_master "$version" && opencode_web_ui_compatible
}

opencode_source_fingerprint() {
  local workspace="${OPENCODE_WORKSPACE_DIR:-${ROOT_DIR}/../opencode}"
  [[ -d "${workspace}/.git" ]] || {
    echo "OpenCode source fingerprint failed: ${workspace} is not a Git workspace." >&2
    return 1
  }

  (
    cd "$workspace"
    git ls-files -z --cached --others --exclude-standard -- \
      package.json bun.lock \
      packages/app \
      packages/opencode/package.json packages/opencode/script packages/opencode/src \
      packages/script/package.json packages/script/src \
      packages/session-ui/package.json packages/session-ui/src \
      packages/ui/package.json packages/ui/src \
      | perl -0 -ne '
          chomp;
          print $_, "\0";
          open my $file_handle, "<", $_ or die "Cannot read $_: $!\n";
          binmode $file_handle;
          local $/;
          print <$file_handle>;
        '
  ) | shasum -a 256 | awk '{print $1}'
}

opencode_attestation_path() {
  local bin="$1"
  printf '%s' "${OPENCODE_RUNTIME_ATTESTATION:-${bin}.buildingai-attestation}"
}

opencode_attestation_value() {
  local file="$1" key="$2"
  sed -nE "s/^${key}=(.*)$/\\1/p" "$file" | head -n 1
}

opencode_binary_contains_contract() {
  local bin="$1"
  [[ -f "$bin" ]] && LC_ALL=C grep -aFq "$OPENCODE_WEB_UI_CONTRACT" "$bin"
}

opencode_write_runtime_attestation() {
  local bin="$1" attestation binary_sha source_sha
  if ! opencode_binary_contains_contract "$bin"; then
    echo "OpenCode build is missing the embedded Bowi AI Web UI contract: ${OPENCODE_WEB_UI_CONTRACT}" >&2
    return 1
  fi

  attestation="$(opencode_attestation_path "$bin")"
  binary_sha="$(shasum -a 256 "$bin" | awk '{print $1}')"
  source_sha="$(opencode_source_fingerprint)"
  {
    printf 'contract=%s\n' "$OPENCODE_WEB_UI_CONTRACT"
    printf 'binary_sha256=%s\n' "$binary_sha"
    printf 'source_sha256=%s\n' "$source_sha"
  } >"$attestation"
  echo "OpenCode runtime attested: ${attestation}"
}

opencode_binary_integrity_valid() {
  local bin="$1" attestation expected actual version
  version="$(opencode_binary_version "$bin" || true)"
  if ! opencode_version_is_master "$version"; then
    echo "OpenCode master-channel runtime is required; selected version: ${version:-unknown}." >&2
    return 1
  fi

  if ! opencode_binary_contains_contract "$bin"; then
    echo "OpenCode binary is missing the embedded Bowi AI Web UI contract." >&2
    return 1
  fi

  attestation="$(opencode_attestation_path "$bin")"
  if [[ ! -f "$attestation" ]]; then
    echo "OpenCode runtime attestation is missing: ${attestation}" >&2
    return 1
  fi

  expected="$(opencode_attestation_value "$attestation" contract)"
  if [[ "$expected" != "$OPENCODE_WEB_UI_CONTRACT" ]]; then
    echo "OpenCode runtime attestation has an incompatible Web UI contract." >&2
    return 1
  fi

  expected="$(opencode_attestation_value "$attestation" binary_sha256)"
  actual="$(shasum -a 256 "$bin" | awk '{print $1}')"
  if [[ -z "$expected" || "$actual" != "$expected" ]]; then
    echo "OpenCode binary fingerprint does not match its attestation." >&2
    return 1
  fi

  expected="$(opencode_attestation_value "$attestation" source_sha256)"
  actual="$(opencode_source_fingerprint)"
  if [[ -z "$expected" || "$actual" != "$expected" ]]; then
    echo "OpenCode runtime source changed after the binary was built." >&2
    return 1
  fi
}

opencode_rebuild_hint() {
  echo "  Rebuild with: ./scripts/build-opencode-runtime.sh" >&2
}

opencode_binary_version() {
  local bin="$1"
  [[ -x "$bin" ]] || return 1
  "$bin" --version 2>/dev/null | head -n 1
}

opencode_reported_version() {
  local port="${OPENCODE_PORT:-4096}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/global/health" \
    | sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p'
}

opencode_active_runtime_path() {
  printf '%s' "${RUN_DIR}/opencode-runtime.state"
}

opencode_write_active_runtime() {
  local bin="$1" state tmp version binary_sha
  ensure_run_dir
  state="$(opencode_active_runtime_path)"
  tmp="${state}.tmp.$$"
  version="$(opencode_binary_version "$bin")"
  binary_sha="$(shasum -a 256 "$bin" | awk '{print $1}')"
  printf 'version=%s\nbinary_sha256=%s\n' "$version" "$binary_sha" >"$tmp"
  mv "$tmp" "$state"
}

opencode_runtime_matches_binary() {
  local bin="$1" state expected_version actual_version expected_sha actual_sha
  opencode_ready || return 1
  state="$(opencode_active_runtime_path)"
  [[ -f "$state" ]] || return 1
  expected_version="$(opencode_binary_version "$bin" || true)"
  actual_version="$(opencode_reported_version || true)"
  [[ -n "$expected_version" && "$actual_version" == "$expected_version" ]] || return 1
  expected_sha="$(opencode_attestation_value "$state" binary_sha256)"
  actual_sha="$(shasum -a 256 "$bin" | awk '{print $1}')"
  [[ -n "$expected_sha" && "$actual_sha" == "$expected_sha" ]]
}

resolve_opencode_bin() {
  local candidate workspace="${OPENCODE_WORKSPACE_DIR:-${ROOT_DIR}/../opencode}"
  if [[ -n "${OPENCODE_BIN:-}" ]]; then
    if [[ -x "${OPENCODE_BIN}" ]]; then
      printf '%s' "${OPENCODE_BIN}"
      return 0
    fi
  fi
  for candidate in \
    "${workspace}/packages/opencode/dist/opencode-darwin-arm64/bin/opencode" \
    "${workspace}/packages/opencode/dist/opencode-darwin-x64/bin/opencode" \
    "${workspace}/packages/opencode/dist/opencode-linux-arm64/bin/opencode" \
    "${workspace}/packages/opencode/dist/opencode-linux-x64/bin/opencode" \
    "${workspace}/packages/opencode/dist/opencode-windows-arm64/bin/opencode.exe" \
    "${workspace}/packages/opencode/dist/opencode-windows-x64/bin/opencode.exe"; do
    if [[ -x "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  if command -v opencode >/dev/null 2>&1; then
    command -v opencode
    return 0
  fi
  candidate="${HOME}/.opencode/bin/opencode"
  if [[ -x "$candidate" ]]; then
    printf '%s' "$candidate"
    return 0
  fi
  return 1
}

should_start_opencode() {
  case "${START_OPENCODE:-auto}" in
    true|1|yes|YES) return 0 ;;
    false|0|no|NO) return 1 ;;
    auto|*)
      resolve_opencode_bin >/dev/null 2>&1
      ;;
  esac
}

warn_if_web_empty() {
  local port="${CLIENT_DEV_PORT:-4091}"
  local max_wait="${WEB_READY_MAX_WAIT:-10}"
  local i
  kill_cursor_listeners "$port"
  for i in $(seq 1 "$max_wait"); do
    # IPv4 is enough for dev; do not block on [::1] (Cursor port-forward often breaks IPv6 only).
    if web_ready && vite_client_ready && web_proxy_ready; then
      return 0
    fi
    if [[ "$i" == 3 || "$i" == 6 ]]; then
      kill_cursor_listeners "$port"
    fi
    sleep 1
  done
  echo ""
  echo "WARNING: http://127.0.0.1:${port}/ returned no response (ERR_EMPTY_RESPONSE in browser)."
  if curl -sf --noproxy '*' --max-time 2 "http://[::1]:${port}/" >/dev/null 2>&1; then
    : # ipv6 ok
  elif lsof -i ":${port}" -P -n 2>/dev/null | grep -qi Cursor; then
    echo "  Cursor is forwarding port ${port} (often on IPv6 [::1]). In Cursor: Ports → stop ${port}, then:"
    echo "    ./start.sh -f restart dev"
  else
    echo "  Try http://127.0.0.1:${port}/ or disable system HTTP proxy for localhost."
    echo "  Check .run/dev.log or run: ./start.sh logs"
  fi
  if ! curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1 \
    && curl -sf --noproxy '*' --max-time 2 "http://[::1]:${port}/" >/dev/null 2>&1; then
    echo "  IPv4 works but IPv6 fails — use http://127.0.0.1:${port}/ in the browser."
  fi
  return 1
}

wait_for_api_ready() {
  local max_wait="${API_READY_MAX_WAIT:-90}"
  local i
  for i in $(seq 1 "$max_wait"); do
    if api_ready; then
      return 0
    fi
    if [[ "$i" == "$max_wait" ]]; then
      break
    fi
    sleep 1
  done
  echo ""
  echo "WARNING: API :${SERVER_PORT:-4090} did not become ready within ${max_wait}s."
  echo "  Common causes: Postgres/Redis down, stale nodemon, DB schema sync stuck, or extension bootstrap hang."
  echo "  Check: ./start.sh status  (Postgres/Redis lines) and ./start.sh logs"
  echo "  Try: ./start.sh stop && ./start.sh -f restart dev -d"
  return 1
}

wait_for_dev_ready() {
  local max_wait="${DEV_READY_MAX_WAIT:-120}"
  local i
  local want_opencode=0
  if should_start_opencode; then
    want_opencode=1
  fi
  for i in $(seq 1 "$max_wait"); do
    if api_ready && web_ready && vite_client_ready && web_proxy_ready; then
      if [[ "$want_opencode" != 1 ]] || opencode_ready; then
        if [[ "$want_opencode" == 1 ]]; then
          echo "  Dev stack ready (api + web + proxy + OpenCode)."
        else
          echo "  Dev stack ready (api + web + proxy)."
        fi
        return 0
      fi
    fi
    sleep 1
  done
  echo ""
  echo "WARNING: Dev stack not fully ready within ${max_wait}s."
  api_ready && echo "  API :${SERVER_PORT:-4090} — ok" || echo "  API :${SERVER_PORT:-4090} — down"
  web_ready && echo "  Web :${CLIENT_DEV_PORT:-4091} — ok" || echo "  Web :${CLIENT_DEV_PORT:-4091} — down"
  vite_client_ready && echo "  Vite client — ok" || echo "  Vite client — down (stale or broken Vite dependency path)"
  web_proxy_ready && echo "  Proxy /api/config — ok" || echo "  Proxy /api/config — down"
  if [[ "$want_opencode" == 1 ]]; then
    opencode_ready && echo "  OpenCode :${OPENCODE_PORT:-4096} — ok" || echo "  OpenCode :${OPENCODE_PORT:-4096} — down"
  fi
  echo "  Logs: ./start.sh logs"
  return 1
}

nvm_bash_prelude() {
  cat <<'EOF'
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use 22
fi
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="$NO_PROXY"
EOF
}

busy_ports_list() {
  local ports=("$@") busy=() port
  for port in "${ports[@]}"; do
    if port_in_use "$port"; then
      busy+=("$port")
    fi
  done
  if [[ ${#busy[@]} -gt 0 ]]; then
    local IFS=,
    echo "${busy[*]}"
  fi
}

ensure_ports_available() {
  local force="${1:-0}"
  shift
  local ports=("$@")

  if [[ ${#ports[@]} -eq 0 ]]; then
    return 0
  fi

  local busy=""
  busy="$(busy_ports_list "${ports[@]}")"
  [[ -z "$busy" ]] && return 0

  if [[ "$force" == 1 ]]; then
    echo "Freeing port(s): ${busy}"
    free_ports "${ports[@]}"
    return 0
  fi

  if [[ ! -t 0 ]]; then
    echo "Error: port(s) in use (${busy})."
    echo "  Run './start.sh -f restart' to force-free ports, or stop the process manually."
    exit 1
  fi

  echo "Warning: port(s) in use: ${busy}"
  echo "  A previous dev/MCP server is probably still running."
  read -r -p "Kill process(es) on these ports and continue? [Y/n] " answer
  case "$answer" in
    n|N|no|NO|No)
      echo "Aborted. Run: ./start.sh restart -f"
      exit 1
      ;;
    *)
      free_ports "${ports[@]}"
      ;;
  esac
}

read_pid() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

pid_alive() {
  local pid="${1:-}"
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] && kill -0 "$pid" 2>/dev/null
}

is_postgres_process() {
  local pid="${1:-}"
  local cmd
  [[ -n "$pid" ]] || return 1
  pid_alive "$pid" || return 1
  cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$cmd" == *[Pp]ostgres* ]] || [[ "$cmd" == */bin/postgres* ]]
}

postgres_ready() {
  local host="${DB_HOST:-localhost}"
  local port="${DB_PORT:-5432}"
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$host" -p "$port" >/dev/null 2>&1
  else
    port_in_use "$port"
  fi
}

redis_ready() {
  local host="${REDIS_HOST:-localhost}"
  local port="${REDIS_PORT:-6379}"
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -h "$host" -p "$port" ping 2>/dev/null | grep -q PONG
  else
    port_in_use "$port"
  fi
}

# Homebrew often leaves postmaster.pid after an unclean stop. If the recorded PID is
# dead — or reused by a non-postgres process — Postgres refuses to start.
recover_stale_postgres_pid() {
  local dir pidfile pid
  for dir in "${HOMEBREW_PG_DATA_DIRS[@]}"; do
    pidfile="${dir}/postmaster.pid"
    [[ -f "$pidfile" ]] || continue
    pid="$(head -n 1 "$pidfile" 2>/dev/null | tr -d '[:space:]')"
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if ! pid_alive "$pid"; then
      echo "Removing stale Postgres lock: ${pidfile} (PID ${pid} not running)"
      rm -f "$pidfile"
      continue
    fi
    if ! is_postgres_process "$pid"; then
      echo "Removing stale Postgres lock: ${pidfile} (PID ${pid} is not postgres)"
      rm -f "$pidfile"
    fi
  done
}

try_start_homebrew_service() {
  local formula="$1"
  command -v brew >/dev/null 2>&1 || return 1
  brew services list 2>/dev/null | awk '{print $1}' | grep -qx "$formula" || return 1
  echo "Starting Homebrew service: ${formula}..."
  brew services restart "$formula" >/dev/null 2>&1 || brew services start "$formula" >/dev/null 2>&1 || return 1
  return 0
}

try_recover_local_postgres() {
  local formula waited=0
  recover_stale_postgres_pid
  for formula in postgresql@17 postgresql@16 postgresql@15 postgresql; do
    if try_start_homebrew_service "$formula"; then
      break
    fi
  done
  while [[ "$waited" -lt 15 ]]; do
    if postgres_ready; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

try_recover_local_redis() {
  local waited=0
  try_start_homebrew_service redis || true
  while [[ "$waited" -lt 10 ]]; do
    if redis_ready; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

ensure_local_infra() {
  local ok=1
  local waited=0

  if ! postgres_ready; then
    if [[ "${START_DOCKER_INFRA}" == "true" || "${START_DOCKER_INFRA}" == "1" ]]; then
      echo "Postgres ${DB_HOST}:${DB_PORT} is not ready — waiting for Docker infra..."
      waited=0
      while [[ "$waited" -lt 30 ]]; do
        postgres_ready && break
        sleep 1
        waited=$((waited + 1))
      done
    else
      echo "Postgres ${DB_HOST}:${DB_PORT} is not ready — attempting recovery..."
      try_recover_local_postgres || true
    fi
  fi
  if ! redis_ready; then
    if [[ "${START_DOCKER_INFRA}" == "true" || "${START_DOCKER_INFRA}" == "1" ]]; then
      echo "Redis ${REDIS_HOST}:${REDIS_PORT} is not ready — waiting for Docker infra..."
      waited=0
      while [[ "$waited" -lt 20 ]]; do
        redis_ready && break
        sleep 1
        waited=$((waited + 1))
      done
    else
      echo "Redis ${REDIS_HOST}:${REDIS_PORT} is not ready — attempting recovery..."
      try_recover_local_redis || true
    fi
  fi

  if postgres_ready; then
    echo "  Postgres ${DB_HOST}:${DB_PORT} — ok"
  else
    echo "Error: PostgreSQL is not accepting connections on ${DB_HOST}:${DB_PORT}."
    echo "  Fix stale lock: rm -f /opt/homebrew/var/postgresql@*/postmaster.pid"
    echo "  Then: brew services restart postgresql@17"
    echo "  Or Docker: START_DOCKER_INFRA=true ./start.sh infra start"
    ok=0
  fi

  if redis_ready; then
    echo "  Redis ${REDIS_HOST}:${REDIS_PORT} — ok"
  else
    echo "Error: Redis is not accepting connections on ${REDIS_HOST}:${REDIS_PORT}."
    echo "  Try: brew services restart redis"
    echo "  Or Docker: START_DOCKER_INFRA=true ./start.sh infra start"
    ok=0
  fi

  if [[ -z "${APP_DOMAIN:-}" ]]; then
    echo "Warning: APP_DOMAIN is empty in .env — set APP_DOMAIN=$(api_url) for OpenCode image URL rewriting."
  fi

  [[ "$ok" == 1 ]]
}

stop_pid_file() {
  local name="$1"
  local file="${RUN_DIR}/${name}.pid"
  local pid
  pid="$(read_pid "$file")"
  if pid_alive "$pid"; then
    echo "Stopping ${name} (pid ${pid})..."
    kill "$pid" 2>/dev/null || true
    sleep 0.3
    if pid_alive "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$file"
}

should_start_sap() {
  case "$START_SAP_MCP" in
    true|1|yes|YES) return 0 ;;
    false|0|no|NO) return 1 ;;
    auto|*)
      [[ -f "$SAP_ENV" ]]
      ;;
  esac
}

should_start_sap_pyrfc() {
  case "$START_SAP_PYRFC_MCP" in
    true|1|yes|YES) return 0 ;;
    false|0|no|NO) return 1 ;;
    auto|*)
      [[ -f "$SAP_PYRFC_ENV" ]]
      ;;
  esac
}

docker_available() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

ensure_docker_available() {
  docker_available && return 0

  # When the active Docker context is Colima, a stopped VM is a common cause of
  # failed Doris/infra starts. Wake that profile automatically; never launch
  # Colima when the user selected Docker Desktop or another context.
  local context
  context="$(docker context show 2>/dev/null || true)"
  if [[ "$context" == "colima" ]] && command -v colima >/dev/null 2>&1; then
    echo "Docker context 'colima' is unavailable; starting Colima..."
    if colima start; then
      docker_available && return 0
    else
      echo "Warning: failed to start Colima; Docker remains unavailable." >&2
    fi
  fi
  return 1
}

start_infra() {
  if [[ "$START_DOCKER_INFRA" != "true" && "$START_DOCKER_INFRA" != "1" ]]; then
    return 0
  fi
  if ! ensure_docker_available; then
    echo "Warning: START_DOCKER_INFRA=true but Docker is not running. Skipping redis/postgres."
    return 0
  fi
  echo "Starting Docker infra (redis, postgres)..."
  docker compose up -d "${INFRA_SERVICES[@]}"
  touch "${RUN_DIR}/docker-infra.started"
}

stop_infra() {
  if [[ ! -f "${RUN_DIR}/docker-infra.started" ]]; then
    return 0
  fi
  if ! docker_available; then
    rm -f "${RUN_DIR}/docker-infra.started"
    return 0
  fi
  echo "Stopping Docker infra (redis, postgres)..."
  docker compose stop "${INFRA_SERVICES[@]}" 2>/dev/null || true
  rm -f "${RUN_DIR}/docker-infra.started"
}

should_start_doris() {
  case "${START_DORIS:-false}" in
    true|1|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

doris_paths_valid() {
  [[ -d "${DORIS_WORKSPACE_DIR}" ]] || {
    echo "Error: Doris workspace not found: ${DORIS_WORKSPACE_DIR}" >&2
    echo "  Set DORIS_WORKSPACE_DIR=/path/to/doris or clone the sibling Doris workspace." >&2
    return 1
  }
  [[ -f "${DORIS_COMPOSE_FILE}" ]] || {
    echo "Error: Doris Compose file not found: ${DORIS_COMPOSE_FILE}" >&2
    return 1
  }
  [[ -x "${DORIS_MCP_SCRIPT}" ]] || {
    echo "Error: Doris MCP launcher not found or not executable: ${DORIS_MCP_SCRIPT}" >&2
    return 1
  }
  [[ -x "${DORIS_PYTHON}" ]] || {
    echo "Error: Doris Python interpreter not found: ${DORIS_PYTHON}" >&2
    echo "  Run: uv venv --python 3.12 ${DORIS_WORKSPACE_DIR}/db/.venv" >&2
    return 1
  }
}

doris_fe_ready() {
  curl -sf --noproxy '*' --max-time 3 "http://127.0.0.1:${DORIS_FE_PORT}/" >/dev/null 2>&1
}

doris_mcp_ready() {
  curl -sf --noproxy '*' --max-time 3 "http://127.0.0.1:${DORIS_MCP_PORT}/live" >/dev/null 2>&1
}

doris_web_ready() {
  curl -sf --noproxy '*' --max-time 3 "http://127.0.0.1:${DORIS_WEB_PORT}/" >/dev/null 2>&1
}

doris_pm2_service_healthy() {
  local name="$1" probe="$2" pm2_pid
  # A previous invocation may already own the port through PM2. Treat that
  # managed, healthy process as reusable instead of reporting a false port
  # collision on a normal (non-force) start.
  pm2_pid="$(pnpm exec pm2 pid "$name" 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[1-9][0-9]*$ ]] || return 1
  pid_alive "$pm2_pid" || return 1
  "$probe"
}

pm2_service_port_healthy() {
  local name="$1" port="$2" pm2_pid
  pm2_pid="$(pnpm exec pm2 pid "$name" 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[1-9][0-9]*$ ]] || return 1
  pid_alive "$pm2_pid" && port_in_use "$port"
}

wait_for_doris_component() {
  local label="$1" probe="$2" max_wait="${3:-60}" i
  for i in $(seq 1 "$max_wait"); do
    if "$probe"; then
      return 0
    fi
    sleep 1
  done
  echo "Error: Doris ${label} did not become ready within ${max_wait}s." >&2
  return 1
}

start_doris_docker() {
  local started=() service
  if ! ensure_docker_available; then
    echo "Error: Docker is not running; cannot start Doris FE/BE." >&2
    echo "  Start Docker Desktop or Colima, then run: ./start.sh -f restart doris" >&2
    return 1
  fi

  for service in fe be; do
    if ! docker compose -f "$DORIS_COMPOSE_FILE" ps --status running -q "$service" 2>/dev/null | grep -q .; then
      started+=("$service")
    fi
  done

  echo "Starting Doris FE/BE via Docker Compose..."
  docker compose -f "$DORIS_COMPOSE_FILE" up -d fe be
  if [[ ${#started[@]} -gt 0 ]]; then
    printf '%s\n' "${started[@]}" >"${RUN_DIR}/doris-docker.started"
  fi
  wait_for_doris_component "FE" doris_fe_ready "${DORIS_READY_MAX_WAIT:-90}"
  if ! port_in_use "$DORIS_BE_PORT"; then
    echo "Error: Doris BE port ${DORIS_BE_PORT} is not listening." >&2
    return 1
  fi
  echo "  Doris FE : http://127.0.0.1:${DORIS_FE_PORT}/"
  echo "  Doris BE : port ${DORIS_BE_PORT} listening"
}

start_doris_web() {
  local force="${1:-0}" pm2_pid launcher
  load_nvm
  if [[ "$force" != 1 ]] && doris_pm2_service_healthy doris-web doris_web_ready; then
    pm2_pid="$(pnpm exec pm2 pid doris-web 2>/dev/null | head -n 1 | tr -d '[:space:]')"
    [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/doris-web.pid"
    echo "  Doris knowledge hub: already healthy at http://127.0.0.1:${DORIS_WEB_PORT}/"
    return 0
  fi
  ensure_ports_available "$force" "$DORIS_WEB_PORT"
  pnpm exec pm2 delete doris-web 2>/dev/null || true
  stop_pid_file "doris-web"
  ensure_run_dir
  launcher="${RUN_DIR}/start-doris-web.sh"
  cat >"$launcher" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
  exec "${DORIS_PYTHON:?DORIS_PYTHON is required}" -m http.server "${DORIS_WEB_PORT:?DORIS_WEB_PORT is required}" --bind 127.0.0.1
EOF
  chmod +x "$launcher"
  : >>"${RUN_DIR}/doris-web.log"
  echo "Starting Doris knowledge hub on port ${DORIS_WEB_PORT}..."
  DORIS_WEB_PORT="$DORIS_WEB_PORT" DORIS_PYTHON="$DORIS_PYTHON" pnpm exec pm2 start "$launcher" --name doris-web --time \
    --output "${RUN_DIR}/doris-web.log" --error "${RUN_DIR}/doris-web.log" \
    --merge-logs --interpreter bash --cwd "$DORIS_WORKSPACE_DIR"
  pm2_pid="$(pnpm exec pm2 pid doris-web 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/doris-web.pid"
  pnpm exec pm2 save 2>/dev/null || true
  wait_for_doris_component "knowledge hub" doris_web_ready "${DORIS_READY_MAX_WAIT:-90}"
  echo "  Doris knowledge hub: http://127.0.0.1:${DORIS_WEB_PORT}/"
}

start_doris_mcp() {
  local force="${1:-0}" pm2_pid launcher
  load_nvm
  if [[ "$force" != 1 ]] && doris_pm2_service_healthy doris-mcp doris_mcp_ready; then
    pm2_pid="$(pnpm exec pm2 pid doris-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
    [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/doris-mcp.pid"
    echo "  Doris MCP: already healthy at http://127.0.0.1:${DORIS_MCP_PORT}/mcp"
    return 0
  fi
  ensure_ports_available "$force" "$DORIS_MCP_PORT"
  pnpm exec pm2 delete doris-mcp 2>/dev/null || true
  stop_pid_file "doris-mcp"
  ensure_run_dir
  launcher="${RUN_DIR}/start-doris-mcp.sh"
  cat >"$launcher" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
export SERVER_PORT="${DORIS_MCP_PORT:?DORIS_MCP_PORT is required}"
exec "${DORIS_MCP_SCRIPT:?DORIS_MCP_SCRIPT is required}"
EOF
  chmod +x "$launcher"
  : >>"${RUN_DIR}/doris-mcp.log"
  echo "Starting Doris MCP on port ${DORIS_MCP_PORT}..."
  DORIS_MCP_PORT="$DORIS_MCP_PORT" DORIS_MCP_SCRIPT="$DORIS_MCP_SCRIPT" \
    pnpm exec pm2 start "$launcher" --name doris-mcp --time \
      --output "${RUN_DIR}/doris-mcp.log" --error "${RUN_DIR}/doris-mcp.log" \
      --merge-logs --interpreter bash
  pm2_pid="$(pnpm exec pm2 pid doris-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/doris-mcp.pid"
  pnpm exec pm2 save 2>/dev/null || true
  wait_for_doris_component "MCP" doris_mcp_ready "${DORIS_READY_MAX_WAIT:-90}"
  echo "  Doris MCP: http://127.0.0.1:${DORIS_MCP_PORT}/mcp"
}

start_doris_stack() {
  local force="${1:-0}"
  doris_paths_valid
  start_doris_docker
  start_doris_web "$force"
  start_doris_mcp "$force"
}

stop_doris_web() {
  if cd "${ROOT_DIR}" 2>/dev/null; then
    load_nvm
    pnpm exec pm2 delete doris-web 2>/dev/null || true
  fi
  stop_pid_file "doris-web"
  kill_port "${DORIS_WEB_PORT:-8300}"
}

stop_doris_mcp() {
  if cd "${ROOT_DIR}" 2>/dev/null; then
    load_nvm
    pnpm exec pm2 delete doris-mcp 2>/dev/null || true
  fi
  stop_pid_file "doris-mcp"
  kill_port "${DORIS_MCP_PORT:-3000}"
}

stop_doris_docker() {
  local marker="${RUN_DIR}/doris-docker.started" line
  local services=()
  [[ -f "$marker" ]] || return 0
  if ! docker_available; then
    echo "Warning: Docker is unavailable; leaving Doris containers untouched." >&2
    return 0
  fi
  while IFS= read -r line; do
    [[ -n "$line" ]] && services+=("$line")
  done <"$marker"
  if [[ ${#services[@]} -gt 0 ]]; then
    echo "Stopping Doris Docker services started by start.sh: ${services[*]}..."
    docker compose -f "$DORIS_COMPOSE_FILE" stop "${services[@]}" 2>/dev/null || true
  fi
  rm -f "$marker"
}

stop_doris() {
  stop_doris_web
  stop_doris_mcp
  stop_doris_docker
}

start_sap_mcp() {
  local force="${1:-0}"
  local skip_build="${2:-0}"
  local strict="${3:-0}"

  if ! should_start_sap; then
    echo "SAP MCP: skipped (set START_SAP_MCP=true or add ${SAP_ENV})"
    return 0
  fi

  if [[ ! -x "${SAP_DIR}/start.sh" ]]; then
    echo "Error: ${SAP_DIR}/start.sh not found or not executable."
    exit 1
  fi

  load_nvm
  cd "${ROOT_DIR}"
  if [[ "$force" != 1 ]] && pm2_service_port_healthy sap-adt-mcp "$SAP_PORT"; then
    local existing_pid
    existing_pid="$(pnpm exec pm2 pid sap-adt-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
    [[ "$existing_pid" =~ ^[0-9]+$ ]] && echo "$existing_pid" >"${RUN_DIR}/sap-mcp.pid"
    echo "  SAP MCP: already healthy at http://127.0.0.1:${SAP_PORT}/mcp"
    return 0
  fi
  pnpm exec pm2 delete sap-adt-mcp 2>/dev/null || true
  stop_pid_file "sap-mcp"
  ensure_ports_available "$force" "$SAP_PORT"

  echo "Starting SAP ABAP ADT MCP on port ${SAP_PORT}..."
  clear_broken_proxy
  : >>"${RUN_DIR}/sap-mcp.log"
  SAP_MCP_SKIP_BUILD="$skip_build" \
    MCP_PORT="$SAP_PORT" \
    pnpm exec pm2 start "${SAP_DIR}/start.sh" --name sap-adt-mcp --time \
      --output "${RUN_DIR}/sap-mcp.log" \
      --error "${RUN_DIR}/sap-mcp.log" \
      --merge-logs --interpreter bash
  local pm2_pid
  pm2_pid="$(pnpm exec pm2 pid sap-adt-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/sap-mcp.pid"
  pnpm exec pm2 save 2>/dev/null || true

  local i=0
  while [[ $i -lt 120 ]]; do
    if port_in_use "$SAP_PORT"; then
      echo "  SAP MCP: http://127.0.0.1:${SAP_PORT}/mcp (log: .run/sap-mcp.log)"
      return 0
    fi
    if ! pid_alive "$(read_pid "${RUN_DIR}/sap-mcp.pid")"; then
      echo "Warning: SAP MCP exited early. See .run/sap-mcp.log"
      tail -15 "${RUN_DIR}/sap-mcp.log" 2>/dev/null || true
      echo "  Hint: fix git proxy (git config --global --unset http.proxy) or clone vendor manually."
      rm -f "${RUN_DIR}/sap-mcp.pid"
      [[ "$strict" == 1 ]] && return 1
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Warning: SAP MCP still starting (clone/build may take several minutes). Log: .run/sap-mcp.log"
}

stop_sap_mcp() {
  if cd "${ROOT_DIR}" 2>/dev/null; then
    load_nvm
    pnpm exec pm2 delete sap-adt-mcp 2>/dev/null || true
  fi
  stop_pid_file "sap-mcp"
  kill_port "${SAP_PORT:-8100}"
}

start_sap_pyrfc_mcp() {
  local force="${1:-0}"
  local strict="${2:-0}"

  if ! should_start_sap_pyrfc; then
    echo "SAP PyRFC MCP: skipped (set START_SAP_PYRFC_MCP=true or add ${SAP_PYRFC_ENV})"
    return 0
  fi

  if [[ ! -x "${SAP_PYRFC_DIR}/start.sh" ]]; then
    echo "Error: ${SAP_PYRFC_DIR}/start.sh not found or not executable."
    exit 1
  fi

  load_nvm
  cd "${ROOT_DIR}"
  if [[ "$force" != 1 ]] && pm2_service_port_healthy sap-pyrfc-mcp "$SAP_PYRFC_PORT"; then
    local existing_pid
    existing_pid="$(pnpm exec pm2 pid sap-pyrfc-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
    [[ "$existing_pid" =~ ^[0-9]+$ ]] && echo "$existing_pid" >"${RUN_DIR}/sap-pyrfc-mcp.pid"
    echo "  SAP PyRFC MCP: already healthy at http://127.0.0.1:${SAP_PYRFC_PORT}/mcp"
    return 0
  fi
  pnpm exec pm2 delete sap-pyrfc-mcp 2>/dev/null || true
  stop_pid_file "sap-pyrfc-mcp"
  ensure_ports_available "$force" "$SAP_PYRFC_PORT"

  echo "Starting SAP PyRFC MCP on port ${SAP_PYRFC_PORT}..."
  clear_broken_proxy
  : >>"${RUN_DIR}/sap-pyrfc-mcp.log"
  SAP_PYRFC_SKIP_INSTALL="${SAP_PYRFC_SKIP_INSTALL:-1}" \
    MCP_PORT="$SAP_PYRFC_PORT" \
    pnpm exec pm2 start "${SAP_PYRFC_DIR}/start.sh" --name sap-pyrfc-mcp --time \
      --output "${RUN_DIR}/sap-pyrfc-mcp.log" \
      --error "${RUN_DIR}/sap-pyrfc-mcp.log" \
      --merge-logs --interpreter bash
  local pm2_pid
  pm2_pid="$(pnpm exec pm2 pid sap-pyrfc-mcp 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$pm2_pid" =~ ^[0-9]+$ ]] && echo "$pm2_pid" >"${RUN_DIR}/sap-pyrfc-mcp.pid"
  pnpm exec pm2 save 2>/dev/null || true

  local i=0
  while [[ $i -lt 90 ]]; do
    if port_in_use "$SAP_PYRFC_PORT"; then
      echo "  SAP PyRFC MCP: http://127.0.0.1:${SAP_PYRFC_PORT}/mcp (log: .run/sap-pyrfc-mcp.log)"
      return 0
    fi
    if ! pid_alive "$(read_pid "${RUN_DIR}/sap-pyrfc-mcp.pid")"; then
      echo "Warning: SAP PyRFC MCP exited early. See .run/sap-pyrfc-mcp.log"
      tail -15 "${RUN_DIR}/sap-pyrfc-mcp.log" 2>/dev/null || true
      rm -f "${RUN_DIR}/sap-pyrfc-mcp.pid"
      [[ "$strict" == 1 ]] && return 1
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Warning: SAP PyRFC MCP still starting. Log: .run/sap-pyrfc-mcp.log"
}

stop_sap_pyrfc_mcp() {
  if cd "${ROOT_DIR}" 2>/dev/null; then
    load_nvm
    pnpm exec pm2 delete sap-pyrfc-mcp 2>/dev/null || true
  fi
  stop_pid_file "sap-pyrfc-mcp"
  kill_port "${SAP_PYRFC_PORT:-8200}"
}

start_opencode() {
  local force="${1:-0}"

  if ! should_start_opencode; then
    echo "OpenCode: skipped (set START_OPENCODE=true or install the opencode binary)"
    return 0
  fi

  local bin=""
  bin="$(resolve_opencode_bin || true)"
  if [[ -z "$bin" ]]; then
    echo "Error: START_OPENCODE=${START_OPENCODE:-true} but opencode binary not found."
    echo "  Install opencode, or set OPENCODE_BIN=/path/to/opencode"
    echo "  Expected: ${HOME}/.opencode/bin/opencode"
    return 1
  fi

  if ! opencode_binary_integrity_valid "$bin"; then
    echo "Error: refusing to start an unverified OpenCode runtime: ${bin}" >&2
    opencode_rebuild_hint
    return 1
  fi

  if opencode_runtime_matches_binary "$bin"; then
    echo "  OpenCode: already healthy at http://127.0.0.1:${OPENCODE_PORT}/"
    return 0
  fi

  if opencode_health_ready; then
    echo "  OpenCode: running version $(opencode_reported_version || echo unknown), restarting for selected build $(opencode_binary_version "$bin" || echo unknown)..."
  fi

  load_nvm
  cd "${ROOT_DIR}"
  pnpm exec pm2 delete opencode-serve 2>/dev/null || true
  # PM2 can report deletion before the child has released its listening socket.
  # This only targets the managed OpenCode port and prevents a half-finished restart.
  kill_port "$OPENCODE_PORT"
  ensure_ports_available "$force" "$OPENCODE_PORT"

  echo "Starting OpenCode serve on port ${OPENCODE_PORT}..."
  ensure_run_dir
  : >>"${RUN_DIR}/opencode-serve.log"
  pnpm exec pm2 start "$bin" --name opencode-serve --time \
    --output "${RUN_DIR}/opencode-serve.log" \
    --error "${RUN_DIR}/opencode-serve.log" \
    --merge-logs -- \
    serve --port "${OPENCODE_PORT}" --hostname 127.0.0.1 --print-logs
  pnpm exec pm2 save 2>/dev/null || true

  local i=0
  while [[ $i -lt 30 ]]; do
    if opencode_ready; then
      opencode_write_active_runtime "$bin"
      echo "  OpenCode: http://127.0.0.1:${OPENCODE_PORT}/  (log: .run/opencode-serve.log)"
      return 0
    fi
    if opencode_health_ready; then
      local reported_version
      reported_version="$(opencode_reported_version || true)"
      if ! opencode_version_is_master "$reported_version"; then
        echo "Error: OpenCode started with non-master version: ${reported_version:-unknown}." >&2
        echo "  Bowi AI requires a master-channel runtime on port ${OPENCODE_PORT}." >&2
        return 1
      fi
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Warning: OpenCode :${OPENCODE_PORT} did not become healthy. See .run/opencode-serve.log"
  if opencode_health_ready && ! opencode_web_ui_compatible; then
    echo "  OpenCode health is green, but the served Web UI lacks ${OPENCODE_WEB_UI_CONTRACT}." >&2
    opencode_rebuild_hint
  fi
  tail -20 "${RUN_DIR}/opencode-serve.log" 2>/dev/null || true
  return 1
}

stop_opencode() {
  if cd "${ROOT_DIR}" 2>/dev/null; then
    load_nvm
    pnpm exec pm2 delete opencode-serve 2>/dev/null || true
  fi
  kill_port "${OPENCODE_PORT:-4096}"
}

check_deps() {
  if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    pnpm install
  fi
}

types_need_prebuild() {
  local types_pkg="${ROOT_DIR}/packages/@buildingai/types"
  local dist_mjs="${types_pkg}/dist/index.mjs"
  local dist_dts="${types_pkg}/dist/index.d.ts"

  [[ ! -f "$dist_mjs" || ! -f "$dist_dts" ]] && return 0

  if find "${types_pkg}/src" "${types_pkg}/tsup.config.ts" "${types_pkg}/package.json" -type f \
    \( -newer "$dist_mjs" -o -newer "$dist_dts" \) 2>/dev/null | grep -q .; then
    return 0
  fi

  return 1
}

prebuild_types() {
  if types_need_prebuild; then
    echo "Prebuilding @buildingai/types (avoids API waiting on DTS watch)..."
    pnpm --filter @buildingai/types build >/dev/null 2>&1 || pnpm --filter @buildingai/types build
  else
    echo "Skipping @buildingai/types prebuild (dist is up to date)."
  fi
}

db_need_prebuild() {
  local db_pkg="${ROOT_DIR}/packages/@buildingai/db"
  local marker="${db_pkg}/dist/utils/file-url.service.js"
  [[ ! -f "$marker" ]] && return 0
  if find "${db_pkg}/src" -type f -newer "$marker" 2>/dev/null | grep -q .; then
    return 0
  fi
  return 1
}

prebuild_db() {
  if db_need_prebuild; then
    echo "Prebuilding @buildingai/db (API loads compiled dist)..."
    pnpm --filter @buildingai/db build >/dev/null 2>&1 || pnpm --filter @buildingai/db build
  fi
}

ai_sdk_need_prebuild() {
  local ai_sdk_pkg="${ROOT_DIR}/packages/@buildingai/ai-sdk"
  local marker="${ai_sdk_pkg}/dist/utils/mcp/client.js"
  local modern_marker="${ai_sdk_pkg}/dist/utils/mcp/modern-http.js"
  [[ ! -f "$marker" || ! -f "$modern_marker" ]] && return 0
  if find "${ai_sdk_pkg}/src" "${ai_sdk_pkg}/tsconfig.build.json" "${ai_sdk_pkg}/package.json" -type f \
    -newer "$marker" 2>/dev/null | grep -q .; then
    return 0
  fi
  return 1
}

prebuild_ai_sdk() {
  if ai_sdk_need_prebuild; then
    echo "Prebuilding @buildingai/ai-sdk (API loads compiled MCP client)..."
    pnpm --filter @buildingai/ai-sdk build >/dev/null 2>&1 || pnpm --filter @buildingai/ai-sdk build
  else
    echo "Skipping @buildingai/ai-sdk prebuild (dist is up to date)."
  fi
}

ensure_dev_launchers() {
  cat >"${RUN_DIR}/start-api.js" <<'EOF'
#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const cwd = path.resolve(__dirname, "../packages/api");
const env = { ...process.env };
for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"]) {
  delete env[key];
}
env.NO_PROXY = "localhost,127.0.0.1,::1";
env.no_proxy = env.NO_PROXY;
env.NODE_ENV = "development";
env.SERVER_LISTEN_HOST = "127.0.0.1";
const child = spawn("pnpm", ["exec", "nest", "start", "-b", "swc"], {
  cwd,
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
EOF

  cat >"${RUN_DIR}/start-web.js" <<'EOF'
#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const cwd = path.resolve(__dirname, "../packages/client");
const env = { ...process.env };
for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"]) {
  delete env[key];
}
env.NO_PROXY = "localhost,127.0.0.1,::1";
env.no_proxy = env.NO_PROXY;
env.CLIENT_DEV_PORT = env.CLIENT_DEV_PORT || "4091";
const packageManager = process.env.BUILDINGAI_PNPM_BIN || "pnpm";
const child = spawn(packageManager, ["--dir", cwd, "exec", "vite", "--host", "127.0.0.1"], {
  cwd,
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
EOF
  chmod +x "${RUN_DIR}/start-api.js" "${RUN_DIR}/start-web.js"
}

print_info() {
  cat <<EOF

Bowi AI dev server
  Web:  http://127.0.0.1:${CLIENT_DEV_PORT}/
  API:  $(api_url)/
  Install wizard (first run): $(api_url)/install
$(should_start_opencode && echo "  OpenCode: http://127.0.0.1:${OPENCODE_PORT}/")

$(should_start_sap && echo "  SAP ADT MCP: http://127.0.0.1:${SAP_PORT}/mcp")
$(should_start_sap_pyrfc && echo "  SAP PyRFC MCP: http://127.0.0.1:${SAP_PYRFC_PORT}/mcp")
$(port_in_use "$ERPNEXT_PORT" && echo "  ERPNext MCP: http://127.0.0.1:${ERPNEXT_PORT}/ (detected)" || echo "  ERPNext MCP: port ${ERPNEXT_PORT} not listening (start ERPNext separately)")

Commands: ./start.sh restart | stop | status | logs [dev|opencode|sap|sap-pyrfc]

EOF
}

run_as_daemon() {
  # Spawn a command that survives the parent shell exit (SIGHUP).
  # Uses a Python helper for cross-platform double-fork daemon behavior.
  local name="$1"
  shift
  local envfile="${RUN_DIR}/${name}.env"
  local pidfile="${RUN_DIR}/${name}.pid"
  local logfile="${RUN_DIR}/dev.log"
  local node_dir pnpm_bin
  node_dir="$(dirname "$(command -v node)")"
  pnpm_bin="$(command -v pnpm)"

  # Persist environment the child needs; avoids quoting hell.
  {
    echo "export PATH='${node_dir}:${PATH}'"
    echo "export NO_PROXY='${NO_PROXY}'"
    echo "export no_proxy='${no_proxy}'"
  } >"$envfile"

  local daemon_py="${RUN_DIR}/daemon.py"
  cat >"$daemon_py" <<'PY'
import os, sys, subprocess, signal, time, atexit

def daemonize(cmd, cwd, pidfile, envfile, logfile):
    env = os.environ.copy()
    env.pop('http_proxy', None)
    env.pop('https_proxy', None)
    env.pop('HTTP_PROXY', None)
    env.pop('HTTPS_PROXY', None)
    env.pop('ALL_PROXY', None)
    env.pop('all_proxy', None)
    env['NO_PROXY'] = 'localhost,127.0.0.1,::1'
    env['no_proxy'] = 'localhost,127.0.0.1,::1'

    # First fork.
    pid1 = os.fork()
    if pid1 > 0:
        sys.exit(0)

    os.chdir(cwd)
    os.setsid()
    os.umask(0)

    # Second fork.
    pid2 = os.fork()
    if pid2 > 0:
        sys.exit(0)

    # Write child PID immediately.
    with open(pidfile, 'w') as f:
        f.write(str(os.getpid()))

    # Clean up streams.
    devnull = open('/dev/null', 'r')
    os.dup2(devnull.fileno(), sys.stdin.fileno())
    devnull.close()

    log = open(logfile, 'a')
    os.dup2(log.fileno(), sys.stdout.fileno())
    os.dup2(log.fileno(), sys.stderr.fileno())
    log.close()

    # Run the shell wrapper that sources env file and execs the command.
    subprocess.Popen(
        ['/bin/bash', '-lc', f"source '{envfile}' && cd '{cwd}' && exec {cmd}"],
        env=env,
        cwd=cwd,
        close_fds=True,
    )
    sys.exit(0)

if __name__ == '__main__':
    daemonize(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
PY

  python3 "$daemon_py" "$*" "$PWD" "$pidfile" "$envfile" "$logfile" >/dev/null 2>&1
  # Give the daemon a moment to write the child PID.
  sleep 0.5
}

start_dev_detached() {
  stop_pid_file "dev"
  stop_pid_file "dev-web"
  stop_pid_file "dev-api"

  echo "Starting dev stack in background via PM2 (API + web)..."
  : >>"${RUN_DIR}/dev.log"
  ensure_dev_launchers

  cd "${ROOT_DIR}"
  clear_broken_proxy
  # PM2 runs as a daemon. We record the PM2 God daemon PID so stop can shut it down.
  CLIENT_DEV_PORT="${CLIENT_DEV_PORT}" \
    APP_DOMAIN="${APP_DOMAIN:-}" \
    SERVER_PORT="${SERVER_PORT:-4090}" \
    NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" \
    pnpm exec pm2 start ecosystem.config.js 2>&1 | tee -a "${RUN_DIR}/dev.log" >/dev/null
  local pm2_home="${PM2_HOME:-$HOME/.pm2}"
  if [[ -f "${pm2_home}/pm2.pid" ]]; then
    cp "${pm2_home}/pm2.pid" "${RUN_DIR}/dev.pid"
  fi
  pnpm exec pm2 save 2>/dev/null || true
}

clear_dev_pid_metadata() {
  # Foreground mode has no single managed PID. Remove metadata left by a
  # previous detached run without signaling a possibly reused PID.
  rm -f "${RUN_DIR}/dev.pid" "${RUN_DIR}/dev-web.pid" "${RUN_DIR}/dev-api.pid"
}

start_dev() {
  local force="${1:-0}"
  local detach="${2:-0}"

  load_nvm
  check_node
  check_env_file
  ensure_local_infra || exit 1
  if [[ "$force" != 1 ]] && [[ "$detach" == 1 ]] && dev_pm2_stack_healthy; then
    print_info
    echo "  Dev stack: already healthy (PM2 API + web)."
    return 0
  fi
  cleanup_stale_dev_listeners
  ensure_ports_available "$force" "${DEV_PORTS[@]}"
  kill_cursor_listeners "${CLIENT_DEV_PORT:-4091}"
  check_deps
  prebuild_types
  prebuild_db
  prebuild_ai_sdk

  if [[ "$detach" == 1 ]]; then
    start_dev_detached
    print_info
    echo "Dev log: .run/dev.log"
    wait_for_dev_ready || true
    return 0
  fi

  clear_dev_pid_metadata
  print_info
  clear_broken_proxy
  exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    CLIENT_DEV_PORT="${CLIENT_DEV_PORT}" \
    SERVER_LISTEN_HOST=127.0.0.1 \
    NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" pnpm dev:core
}

dev_pm2_stack_healthy() {
  local api_pid web_pid
  api_pid="$(pnpm exec pm2 pid buildingai-api 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  web_pid="$(pnpm exec pm2 pid buildingai-web 2>/dev/null | head -n 1 | tr -d '[:space:]')"
  [[ "$api_pid" =~ ^[1-9][0-9]*$ ]] && pid_alive "$api_pid" || return 1
  [[ "$web_pid" =~ ^[1-9][0-9]*$ ]] && pid_alive "$web_pid" || return 1
  api_ready && web_proxy_ready
}

cleanup_stale_dev_listeners() {
  local port pid command probe
  for port in "${DEV_PORTS[@]}"; do
    if [[ "$port" == "${SERVER_PORT}" ]]; then
      probe=api_ready
    else
      probe=web_proxy_ready
    fi
    "$probe" && continue
    while IFS= read -r pid; do
      [[ "$pid" =~ ^[1-9][0-9]*$ ]] || continue
      command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      # Clean up only known BuildingAI dev commands left outside PM2 (for
      # example, a previous foreground run). Unrelated listeners remain
      # protected by ensure_ports_available and its normal force/prompt flow.
      if [[ "$command" == *"${ROOT_DIR}/packages/api/dist/main"* ]] \
        || [[ "$command" == *"${ROOT_DIR}/packages/client"*vite* ]]; then
        echo "Cleaning stale BuildingAI dev process ${pid} on port ${port}..."
        kill "$pid" 2>/dev/null || true
      fi
    done < <(port_pids "$port")
  done
}

stop_dev() {
  stop_pid_file "dev"
  stop_pid_file "dev-web"
  stop_pid_file "dev-api"
  if cd "${ROOT_DIR}" 2>/dev/null && [[ -f ecosystem.config.js ]]; then
    load_nvm
    # Delete only API/web apps. Do not tear down the PM2 daemon —
    # that would drop a managed `opencode-serve` process.
    pnpm exec pm2 delete ecosystem.config.js 2>/dev/null || true
  fi
  pkill -f "turbo run dev" 2>/dev/null || true
  pkill -f "nodemon -q" 2>/dev/null || true
  pkill -f "${ROOT_DIR}/packages/client.*vite" 2>/dev/null || true
  pkill -f "${ROOT_DIR}/packages/api/dist/main" 2>/dev/null || true
  pkill -f "${ROOT_DIR}/packages/api/node_modules/.bin/../@nestjs/cli/bin/nest.js start" 2>/dev/null || true
  free_ports "${DEV_PORTS[@]}"
}

cmd_status() {
  load_root_env
  ensure_run_dir

  echo "=== Bowi AI local stack ==="
  refresh_dev_ports
  for port in "${DEV_PORTS[@]}"; do
    if port_in_use "$port"; then
      echo "  :${port}  listening  (pids: $(port_pids "$port" | tr '\n' ' '))"
    else
      echo "  :${port}  down"
    fi
  done

  if postgres_ready; then
    echo "  :${DB_PORT}  Postgres         ok (${DB_HOST})"
  else
    echo "  :${DB_PORT}  Postgres         down (${DB_HOST})"
  fi
  if redis_ready; then
    echo "  :${REDIS_PORT}  Redis            ok (${REDIS_HOST})"
  else
    echo "  :${REDIS_PORT}  Redis            down (${REDIS_HOST})"
  fi

  if port_in_use "$SAP_PORT"; then
    echo "  :${SAP_PORT}  SAP ADT MCP     listening"
  else
    echo "  :${SAP_PORT}  SAP ADT MCP     down"
  fi

  if port_in_use "$SAP_PYRFC_PORT"; then
    echo "  :${SAP_PYRFC_PORT}  SAP PyRFC MCP   listening"
  else
    echo "  :${SAP_PYRFC_PORT}  SAP PyRFC MCP   down"
  fi

  if port_in_use "${OPENCODE_PORT:-4096}"; then
    echo "  :${OPENCODE_PORT}  OpenCode        listening"
  else
    echo "  :${OPENCODE_PORT}  OpenCode        down"
  fi

  if port_in_use "$ERPNEXT_PORT"; then
    echo "  :${ERPNEXT_PORT}  ERPNext   listening (external)"
  else
    echo "  :${ERPNEXT_PORT}  ERPNext   down (external)"
  fi

  if port_in_use "$DORIS_FE_PORT"; then
    echo "  :${DORIS_FE_PORT}  Doris FE     listening"
  else
    echo "  :${DORIS_FE_PORT}  Doris FE     down"
  fi
  if port_in_use "$DORIS_BE_PORT"; then
    echo "  :${DORIS_BE_PORT}  Doris BE     listening"
  else
    echo "  :${DORIS_BE_PORT}  Doris BE     down"
  fi
  if port_in_use "$DORIS_WEB_PORT"; then
    echo "  :${DORIS_WEB_PORT}  Doris Web    listening"
  else
    echo "  :${DORIS_WEB_PORT}  Doris Web    down"
  fi
  if port_in_use "$DORIS_MCP_PORT"; then
    echo "  :${DORIS_MCP_PORT}  Doris MCP    listening"
  else
    echo "  :${DORIS_MCP_PORT}  Doris MCP    down"
  fi

  for name in dev dev-web dev-api sap-mcp sap-pyrfc-mcp doris-web doris-mcp; do
    local pid file="${RUN_DIR}/${name}.pid"
    pid="$(read_pid "$file")"
    if [[ -n "$pid" ]]; then
      if pid_alive "$pid"; then
        echo "  PID ${name}: ${pid} (running)"
      else
        echo "  PID ${name}: ${pid} (stale)"
      fi
    fi
  done

  if [[ -f "${RUN_DIR}/docker-infra.started" ]]; then
    echo "  Docker infra: started by start.sh"
    docker compose ps "${INFRA_SERVICES[@]}" 2>/dev/null || true
  fi
}

cmd_logs() {
  local which="${1:-dev}"
  ensure_run_dir
  case "$which" in
    dev) tail -f "${RUN_DIR}/dev.log" ;;
    opencode) tail -f "${RUN_DIR}/opencode-serve.log" ;;
    sap) tail -f "${RUN_DIR}/sap-mcp.log" ;;
    sap-pyrfc) tail -f "${RUN_DIR}/sap-pyrfc-mcp.log" ;;
    doris) tail -f "${RUN_DIR}/doris-mcp.log" "${RUN_DIR}/doris-web.log" ;;
    all)
      tail -f "${RUN_DIR}/dev.log" "${RUN_DIR}/opencode-serve.log" "${RUN_DIR}/sap-mcp.log" "${RUN_DIR}/sap-pyrfc-mcp.log" "${RUN_DIR}/doris-mcp.log" "${RUN_DIR}/doris-web.log" 2>/dev/null
      ;;
    *)
      echo "Unknown log target: $which (use dev, opencode, sap, sap-pyrfc, doris, or all)"
      exit 1
      ;;
  esac
}

stop_target() {
  local target="${1:-all}"
  case "$target" in
    all)
      stop_dev
      stop_opencode
      stop_sap_mcp
      stop_sap_pyrfc_mcp
      stop_doris
      stop_infra
      ;;
    dev)
      stop_dev
      stop_opencode
      ;;
    opencode) stop_opencode ;;
    sap) stop_sap_mcp ;;
    sap-pyrfc) stop_sap_pyrfc_mcp ;;
    infra) stop_infra ;;
    doris) stop_doris ;;
    *)
      echo "Unknown target: $target"
      exit 1
      ;;
  esac
}

preflight_target() {
  local target="${1:-all}" bin
  case "$target" in
    all | dev | opencode)
      should_start_opencode || return 0
      bin="$(resolve_opencode_bin || true)"
      if [[ -z "$bin" ]]; then
        echo "Error: OpenCode binary not found for ${target} restart preflight." >&2
        return 1
      fi
      if ! opencode_binary_integrity_valid "$bin"; then
        echo "Error: refusing to stop services for an unverified OpenCode replacement: ${bin}" >&2
        opencode_rebuild_hint
        return 1
      fi
      ;;
    doris)
      doris_paths_valid
      ;;
  esac
}

start_target() {
  local target="${1:-all}"
  local force="${2:-0}"
  local detach="${3:-0}"
  local skip_sap_build="${4:-0}"

  load_root_env
  clear_broken_proxy
  ensure_run_dir

  case "$target" in
    all)
      start_infra
      start_sap_mcp "$force" "$skip_sap_build" 0 || true
      start_sap_pyrfc_mcp "$force" 0 || true
      start_opencode "$force"
      if should_start_doris; then
        start_doris_stack "$force" || echo "Warning: Doris stack failed to start; see ./start.sh logs doris" >&2
      fi
      if [[ "$detach" == 1 ]]; then
        start_dev "$force" 1
      else
        start_dev "$force" 0
      fi
      ;;
    dev)
      start_opencode "$force"
      if [[ "$detach" == 1 ]]; then
        start_dev "$force" 1
      else
        start_dev "$force" 0
      fi
      ;;
    opencode)
      start_opencode "$force"
      ;;
    sap)
      start_sap_mcp "$force" "$skip_sap_build" 1
      ;;
    sap-pyrfc)
      start_sap_pyrfc_mcp "$force" 1
      ;;
    infra)
      start_infra
      ;;
    doris)
      start_doris_stack "$force"
      ;;
    *)
      echo "Unknown target: $target"
      exit 1
      ;;
  esac
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      start) shift ;;
      restart | -r | --restart)
        COMMAND="restart"
        FORCE=1
        shift
        ;;
      stop | stop-dev)
        COMMAND="stop"
        shift
        ;;
      status) COMMAND="status"; shift ;;
      logs) COMMAND="logs"; shift; LOG_TARGET="${1:-dev}"; shift || true ;;
      dev | sap | sap-pyrfc | opencode | infra | doris | all)
        TARGET="$1"
        shift
        ;;
      -f | --force) FORCE=1; shift ;;
      -d | --detach) DETACH=1; shift ;;
      -h | --help | help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done
}

main() {
  parse_args "$@"

  case "$COMMAND" in
    stop)
      load_root_env
      ensure_run_dir
      echo "Stopping target: ${TARGET}..."
      stop_target "$TARGET"
      echo "Done."
      ;;
    status)
      cmd_status
      ;;
    logs)
      cmd_logs "${LOG_TARGET:-dev}"
      ;;
    restart)
      load_root_env
      ensure_run_dir
      echo "Restarting target: ${TARGET}..."
      preflight_target "$TARGET"
      stop_target "$TARGET"
      start_target "$TARGET" 1 "$DETACH" 1
      ;;
    start)
      start_target "$TARGET" "$FORCE" "$DETACH" 0
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
