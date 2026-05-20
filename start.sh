#!/usr/bin/env bash
# BuildingAI local dev orchestrator: API :4090, web :4091, SAP ADT MCP :8100, optional Docker infra
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_DIR="${ROOT_DIR}/.run"
SAP_DIR="${ROOT_DIR}/integrations/sap-abap-adt-mcp"
SAP_ENV="${SAP_DIR}/.env"

DEV_PORTS=(4090 4091)
SAP_PORT="${MCP_PORT:-8100}"
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
  all           Dev + SAP MCP + infra when enabled (default)
  dev           BuildingAI only (pnpm dev)
  sap           SAP ABAP ADT MCP only (:8100)
  infra         Docker redis + postgres only

Options:
  -f, --force   Kill processes on busy ports without prompting
  -d, --detach  Run pnpm dev in background (logs: .run/dev.log)

Environment (root .env or shell):
  START_SAP_MCP=auto|true|false   Default auto (start if integrations/sap-abap-adt-mcp/.env exists)
  START_DOCKER_INFRA=true|false   Default false — docker compose up redis postgres
  MCP_PORT=8100                   SAP MCP HTTP port

Examples:
  ./start.sh                      # first start (foreground dev)
  ./start.sh restart              # restart everything managed
  ./start.sh stop                 # stop everything
  ./start.sh status
  ./start.sh logs sap
  ./start.sh restart sap          # SAP MCP only
  ./start.sh infra start          # postgres + redis via Docker
  ./start.sh -f restart           # force-free ports, then start

MCP endpoints (register in console when running):
  SAP:      http://127.0.0.1:8100/mcp
  ERPNext:  http://127.0.0.1:8000/... (external; not started by this script)

EOF
}

# Read one KEY=VALUE from .env without sourcing the whole file (avoids breaking on
# unquoted values such as PM2_LOG_DATE_FORMAT=YYYY-MM-DD HH:mm:ss Z).
read_env_var() {
  local key="$1" file="$2" line value
  line="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [[ -z "$line" ]] && return 1
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}}"
  value="${value%"${value##*[![:space:]]}"}}"
  if [[ "${value#\"}" != "$value" && "${value%\"}" != "$value" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

load_root_env() {
  local env_file="${ROOT_DIR}/.env"
  local key value
  if [[ -f "$env_file" ]]; then
    for key in START_SAP_MCP START_DOCKER_INFRA MCP_PORT MCP_HOST MCP_PATH SERVER_PORT; do
      if value="$(read_env_var "$key" "$env_file")"; then
        export "${key}=${value}"
      fi
    done
  fi
  SAP_PORT="${MCP_PORT:-8100}"
  START_SAP_MCP="${START_SAP_MCP:-auto}"
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

free_ports() {
  local ports=("$@") port
  local found=0
  for port in "${ports[@]}"; do
    if port_in_use "$port"; then
      found=1
      kill_port "$port"
    fi
  done
  if [[ "$found" == 1 ]]; then
    sleep 0.4
  fi
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
    echo "Port(s) in use (${busy}); killing (non-interactive)."
    free_ports "${ports[@]}"
    return 0
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
  kill_port "$SAP_PORT"
}

check_deps() {
  if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    pnpm install
  fi
}

build_mrp_extension_web_if_stale() {
  local ext_dir="extensions/mrp-governance"
  local out_index="${ext_dir}/.output/public/index.html"
  if [[ ! -f "${ext_dir}/package.json" ]]; then
    return 0
  fi
  if [[ ! -f "$out_index" ]]; then
    echo "Building mrp-governance extension web (first run)..."
    pnpm --filter mrp-governance build:web
    return 0
  fi
  if find "${ext_dir}/src/web" -type f -newer "$out_index" 2>/dev/null | grep -q .; then
    echo "Rebuilding mrp-governance extension web (source changed)..."
    pnpm --filter mrp-governance build:web
  fi
}

print_info() {
  cat <<EOF

BuildingAI dev server
  Web:  http://localhost:4091/
  API:  http://localhost:4090/
  Install wizard (first run): http://localhost:4090/install

$(should_start_sap && echo "  SAP MCP: http://127.0.0.1:${SAP_PORT}/mcp")
$(port_in_use "$ERPNEXT_PORT" && echo "  ERPNext MCP: http://127.0.0.1:${ERPNEXT_PORT}/ (detected)" || echo "  ERPNext MCP: port ${ERPNEXT_PORT} not listening (start ERPNext separately)")

Commands: ./start.sh restart | stop | status | logs [dev|sap]

EOF
}

start_dev() {
  local force="${1:-0}"
  local detach="${2:-0}"

  load_nvm
  check_node
  check_env_file
  ensure_ports_available "$force" "${DEV_PORTS[@]}"
  check_deps
  build_mrp_extension_web_if_stale

  if [[ "$detach" == 1 ]]; then
    stop_pid_file "dev"
    echo "Starting pnpm dev in background..."
    nohup env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
      NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" pnpm dev >>"${RUN_DIR}/dev.log" 2>&1 &
    echo $! >"${RUN_DIR}/dev.pid"
    print_info
    echo "Dev log: .run/dev.log"
    return 0
  fi

  print_info
  clear_broken_proxy
  exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    NO_PROXY="${NO_PROXY}" no_proxy="${no_proxy}" pnpm dev
}

stop_dev() {
  stop_pid_file "dev"
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
    echo "  :${SAP_PORT}  SAP MCP   listening"
  else
    echo "  :${SAP_PORT}  SAP MCP   down"
  fi

  if port_in_use "$ERPNEXT_PORT"; then
    echo "  :${ERPNEXT_PORT}  ERPNext   listening (external)"
  else
    echo "  :${ERPNEXT_PORT}  ERPNext   down (external)"
  fi

  for name in dev sap-mcp; do
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
    all)
      tail -f "${RUN_DIR}/dev.log" "${RUN_DIR}/sap-mcp.log" 2>/dev/null
      ;;
    *)
      echo "Unknown log target: $which (use dev, sap, or all)"
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
      stop_infra
      ;;
    dev) stop_dev ;;
    sap) stop_sap_mcp ;;
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
      dev | sap | infra | all)
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
