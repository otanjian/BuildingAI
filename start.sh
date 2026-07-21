#!/usr/bin/env bash
# BuildingAI local dev orchestrator: API :4090, web :4091, SAP ADT MCP :8100, SAP PyRFC MCP :8200, optional Docker infra
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_DIR="${ROOT_DIR}/.run"
SAP_DIR="${ROOT_DIR}/integrations/sap-abap-adt-mcp"
SAP_ENV="${SAP_DIR}/.env"
SAP_PYRFC_DIR="${ROOT_DIR}/integrations/sap-pyrfc-mcp"
SAP_PYRFC_ENV="${SAP_PYRFC_DIR}/.env"

DEV_PORTS=(4090 4091)
CLIENT_DEV_PORT="${CLIENT_DEV_PORT:-4091}"
SAP_PORT="${MCP_PORT:-8100}"
SAP_PYRFC_PORT="${SAP_PYRFC_MCP_PORT:-8200}"
ERPNEXT_PORT=8000
INFRA_SERVICES=(redis postgres)

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
  (default)     Start dev stack (+ SAP MCP if configured)
  restart       Stop all managed services, then start again (no port prompt)
  stop          Stop dev ports, SAP MCP, and infra started by this script
  status        Show listeners and PID files
  logs          Tail logs (default: dev; use "sap" or "all")

Targets (optional, for start/restart/stop):
  all           Dev + SAP MCPs + infra when enabled (default)
  dev           BuildingAI only (pnpm dev:core — API + web + deps, no extension Vite)
  sap           SAP ABAP ADT MCP only (:8100)
  sap-pyrfc     SAP PyRFC MCP only (:8200)
  infra         Docker redis + postgres only

Options:
  -f, --force   Kill processes on busy ports without prompting
  -d, --detach  Run API + web in background (logs: .run/dev.log)

Environment (root .env or shell):
  START_SAP_MCP=auto|true|false         Default auto (start if integrations/sap-abap-adt-mcp/.env exists)
  START_SAP_PYRFC_MCP=auto|true|false   Default auto (start if integrations/sap-pyrfc-mcp/.env exists)
  START_DOCKER_INFRA=true|false         Default false — docker compose up redis postgres
  MCP_PORT=8100                         SAP ADT MCP HTTP port
  SAP_PYRFC_MCP_PORT=8200               SAP PyRFC MCP HTTP port

Examples:
  ./start.sh                      # first start (foreground dev)
  ./start.sh restart              # restart everything managed
  ./start.sh stop                 # stop everything
  ./start.sh status
  ./start.sh logs sap
  ./start.sh restart sap          # SAP ADT MCP only
  ./start.sh restart sap-pyrfc    # SAP PyRFC MCP only
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
    for key in START_SAP_MCP START_SAP_PYRFC_MCP START_DOCKER_INFRA MCP_PORT MCP_HOST MCP_PATH SAP_PYRFC_MCP_PORT SERVER_PORT; do
      if value="$(read_env_var "$key" "$env_file")"; then
        export "${key}=${value}"
      fi
    done
  fi
  SAP_PORT="${MCP_PORT:-8100}"
  SAP_PYRFC_PORT="${SAP_PYRFC_MCP_PORT:-8200}"
  START_SAP_MCP="${START_SAP_MCP:-auto}"
  START_SAP_PYRFC_MCP="${START_SAP_PYRFC_MCP:-auto}"
  START_DOCKER_INFRA="${START_DOCKER_INFRA:-false}"
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

api_ready() {
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:4090/consoleapi/health" >/dev/null 2>&1
}

web_ready() {
  local port="${CLIENT_DEV_PORT:-4091}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/" >/dev/null 2>&1
}

web_proxy_ready() {
  local port="${CLIENT_DEV_PORT:-4091}"
  curl -sf --noproxy '*' --max-time 2 "http://127.0.0.1:${port}/api/config" >/dev/null 2>&1
}

warn_if_web_empty() {
  local port="${CLIENT_DEV_PORT:-4091}"
  local max_wait="${WEB_READY_MAX_WAIT:-10}"
  local i
  kill_cursor_listeners "$port"
  for i in $(seq 1 "$max_wait"); do
    # IPv4 is enough for dev; do not block on [::1] (Cursor port-forward often breaks IPv6 only).
    if web_ready && web_proxy_ready; then
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
  echo "WARNING: API :4090 did not become ready within ${max_wait}s."
  echo "  Common causes: stale nodemon, DB schema sync stuck, or extension bootstrap hang."
  echo "  Try: ./start.sh stop && ./start.sh -f restart dev -d"
  echo "  Logs: ./start.sh logs  (look for 'Schema Build' or 'Startup Time')"
  return 1
}

wait_for_dev_ready() {
  local max_wait="${DEV_READY_MAX_WAIT:-120}"
  local i
  for i in $(seq 1 "$max_wait"); do
    if api_ready && web_ready && web_proxy_ready; then
      echo "  Dev stack ready (api + web + proxy)."
      return 0
    fi
    sleep 1
  done
  echo ""
  echo "WARNING: Dev stack not fully ready within ${max_wait}s."
  api_ready && echo "  API :4090 — ok" || echo "  API :4090 — down"
  web_ready && echo "  Web :${CLIENT_DEV_PORT:-4091} — ok" || echo "  Web :${CLIENT_DEV_PORT:-4091} — down"
  web_proxy_ready && echo "  Proxy /api/config — ok" || echo "  Proxy /api/config — down"
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
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
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

start_infra() {
  if [[ "$START_DOCKER_INFRA" != "true" && "$START_DOCKER_INFRA" != "1" ]]; then
    return 0
  fi
  if ! docker_available; then
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

  stop_pid_file "sap-mcp"
  ensure_ports_available "$force" "$SAP_PORT"

  echo "Starting SAP ABAP ADT MCP on port ${SAP_PORT}..."
  clear_broken_proxy
  SAP_MCP_SKIP_BUILD="$skip_build" \
    nohup env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
      "${SAP_DIR}/start.sh" >>"${RUN_DIR}/sap-mcp.log" 2>&1 &
  echo $! >"${RUN_DIR}/sap-mcp.pid"

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
  stop_pid_file "sap-mcp"
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

  stop_pid_file "sap-pyrfc-mcp"
  ensure_ports_available "$force" "$SAP_PYRFC_PORT"

  echo "Starting SAP PyRFC MCP on port ${SAP_PYRFC_PORT}..."
  clear_broken_proxy
  SAP_PYRFC_SKIP_INSTALL="${SAP_PYRFC_SKIP_INSTALL:-1}" \
    MCP_PORT="$SAP_PYRFC_PORT" \
    nohup env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
      "${SAP_PYRFC_DIR}/start.sh" >>"${RUN_DIR}/sap-pyrfc-mcp.log" 2>&1 &
  echo $! >"${RUN_DIR}/sap-pyrfc-mcp.pid"

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
  stop_pid_file "sap-pyrfc-mcp"
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
  if find "${db_pkg}/src/utils/file-url.service.ts" "${db_pkg}/src/entities" -type f \
    -newer "$marker" 2>/dev/null | grep -q .; then
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

print_info() {
  cat <<EOF

BuildingAI dev server
  Web:  http://127.0.0.1:${CLIENT_DEV_PORT}/
  API:  http://127.0.0.1:4090/
  Install wizard (first run): http://127.0.0.1:4090/install

$(should_start_sap && echo "  SAP ADT MCP: http://127.0.0.1:${SAP_PORT}/mcp")
$(should_start_sap_pyrfc && echo "  SAP PyRFC MCP: http://127.0.0.1:${SAP_PYRFC_PORT}/mcp")
$(port_in_use "$ERPNEXT_PORT" && echo "  ERPNext MCP: http://127.0.0.1:${ERPNEXT_PORT}/ (detected)" || echo "  ERPNext MCP: port ${ERPNEXT_PORT} not listening (start ERPNext separately)")

Commands: ./start.sh restart | stop | status | logs [dev|sap|sap-pyrfc]

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

  echo "DEBUG start_dev_detached: SERVER_PORT=[${SERVER_PORT:-unset}] APP_DOMAIN=[${APP_DOMAIN:-unset}]"
  echo "Starting dev stack in background via PM2 (API + web)..."
  : >>"${RUN_DIR}/dev.log"

  cd "${ROOT_DIR}"
  clear_broken_proxy
  # PM2 runs as a daemon. We record the PM2 God daemon PID so stop can shut it down.
  CLIENT_DEV_PORT="${CLIENT_DEV_PORT}" \
    NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" \
    pnpm exec pm2 start ecosystem.config.js 2>&1 | tee -a "${RUN_DIR}/dev.log" >/dev/null
  local pm2_home="${PM2_HOME:-$HOME/.pm2}"
  if [[ -f "${pm2_home}/pm2.pid" ]]; then
    cp "${pm2_home}/pm2.pid" "${RUN_DIR}/dev.pid"
  fi
  pnpm exec pm2 save 2>/dev/null || true
}

start_dev() {
  local force="${1:-0}"
  local detach="${2:-0}"

  load_nvm
  check_node
  check_env_file
  ensure_ports_available "$force" "${DEV_PORTS[@]}"
  kill_cursor_listeners "${CLIENT_DEV_PORT:-4091}"
  check_deps
  prebuild_types
  prebuild_db

  if [[ "$detach" == 1 ]]; then
    start_dev_detached
    print_info
    echo "Dev log: .run/dev.log"
    wait_for_dev_ready || true
    return 0
  fi

  print_info
  clear_broken_proxy
  exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    CLIENT_DEV_PORT="${CLIENT_DEV_PORT}" \
    SERVER_LISTEN_HOST=127.0.0.1 \
    NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" pnpm dev:core
}

stop_dev() {
  stop_pid_file "dev"
  stop_pid_file "dev-web"
  stop_pid_file "dev-api"
  if cd "${ROOT_DIR}" 2>/dev/null && [[ -f ecosystem.config.js ]]; then
    load_nvm
    pnpm exec pm2 delete ecosystem.config.js 2>/dev/null || true
    pnpm exec pm2 kill 2>/dev/null || true
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

  echo "=== BuildingAI local stack ==="
  for port in "${DEV_PORTS[@]}"; do
    if port_in_use "$port"; then
      echo "  :${port}  listening  (pids: $(port_pids "$port" | tr '\n' ' '))"
    else
      echo "  :${port}  down"
    fi
  done

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

  if port_in_use "$ERPNEXT_PORT"; then
    echo "  :${ERPNEXT_PORT}  ERPNext   listening (external)"
  else
    echo "  :${ERPNEXT_PORT}  ERPNext   down (external)"
  fi

  for name in dev dev-web dev-api sap-mcp sap-pyrfc-mcp; do
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
    sap) tail -f "${RUN_DIR}/sap-mcp.log" ;;
    sap-pyrfc) tail -f "${RUN_DIR}/sap-pyrfc-mcp.log" ;;
    all)
      tail -f "${RUN_DIR}/dev.log" "${RUN_DIR}/sap-mcp.log" "${RUN_DIR}/sap-pyrfc-mcp.log" 2>/dev/null
      ;;
    *)
      echo "Unknown log target: $which (use dev, sap, sap-pyrfc, or all)"
      exit 1
      ;;
  esac
}

stop_target() {
  local target="${1:-all}"
  case "$target" in
    all)
      stop_dev
      stop_sap_mcp
      stop_sap_pyrfc_mcp
      stop_infra
      ;;
    dev) stop_dev ;;
    sap) stop_sap_mcp ;;
    sap-pyrfc) stop_sap_pyrfc_mcp ;;
    infra) stop_infra ;;
    *)
      echo "Unknown target: $target"
      exit 1
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
      if [[ "$detach" == 1 ]]; then
        start_dev "$force" 1
      else
        start_dev "$force" 0
      fi
      ;;
    dev)
      if [[ "$detach" == 1 ]]; then
        start_dev "$force" 1
      else
        start_dev "$force" 0
      fi
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
      dev | sap | sap-pyrfc | infra | all)
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
      stop_target "$TARGET"
      start_target "$TARGET" 1 "$DETACH" 1
      ;;
    start)
      start_target "$TARGET" "$FORCE" "$DETACH" 0
      ;;
  esac
}

main "$@"
