#!/usr/bin/env bash
# Quick-start BuildingAI dev stack (API :4090, web :4091)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DEV_PORTS=(4090 4091)

# Local dev should not go through a broken HTTP proxy
export NO_PROXY="localhost,127.0.0.1,::1"
export no_proxy="$NO_PROXY"

usage() {
  cat <<'EOF'
Usage: ./start.sh [command] [options]

Commands:
  (default)   Start dev stack (prompts if ports are busy)
  restart     Stop listeners on 4090/4091, then start (no prompt)
  stop        Free dev ports only

Options:
  -f, --force   Kill processes on dev ports without prompting

Examples:
  ./start.sh            # first start
  ./start.sh restart    # quick restart (recommended)
  ./start.sh stop       # stop only
  ./start.sh -f         # start, auto-kill if ports busy

EOF
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
  if [[ ! -f .env ]]; then
    echo "Error: .env not found. Run: cp .env.example .env && pnpm sync-env"
    exit 1
  fi
}

ports_in_use() {
  local port
  for port in "${DEV_PORTS[@]}"; do
    if lsof -ti:"$port" >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

busy_ports_list() {
  local busy=() port
  for port in "${DEV_PORTS[@]}"; do
    if lsof -ti:"$port" >/dev/null 2>&1; then
      busy+=("$port")
    fi
  done
  (IFS=,; echo "${busy[*]}")
}

free_dev_ports() {
  local port pids found=0
  for port in "${DEV_PORTS[@]}"; do
    pids="$(lsof -ti:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      found=1
      # shellcheck disable=SC2086
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  done
  if [[ "$found" == 1 ]]; then
    # Brief wait for listeners to release (macOS bash 3.2 compatible)
    sleep 0.4
  fi
}

ensure_ports_available() {
  local force="${1:-0}"

  if ! ports_in_use; then
    return 0
  fi

  local busy
  busy="$(busy_ports_list)"

  if [[ "$force" == 1 ]]; then
    echo "Freeing port(s): ${busy}"
    free_dev_ports
    return 0
  fi

  if [[ ! -t 0 ]]; then
    echo "Port(s) in use (${busy}); killing (non-interactive)."
    free_dev_ports
    return 0
  fi

  echo "Warning: port(s) in use: ${busy}"
  echo "  A previous BuildingAI dev server is probably still running."
  read -r -p "Kill process(es) on these ports and continue? [Y/n] " answer
  case "$answer" in
    n|N|no|NO|No)
      echo "Aborted. Run: ./start.sh restart"
      exit 1
      ;;
    *)
      free_dev_ports
      ;;
  esac
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

Press Ctrl+C to stop. Quick restart: ./start.sh restart

EOF
}

start_dev() {
  local force="${1:-0}"
  load_nvm
  check_node
  check_env_file
  ensure_ports_available "$force"
  check_deps
  build_mrp_extension_web_if_stale
  print_info
  exec pnpm dev
}

parse_args() {
  COMMAND="start"
  FORCE=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      start)
        shift
        ;;
      restart | -r | --restart)
        COMMAND="restart"
        FORCE=1
        shift
        ;;
      stop | stop-dev)
        COMMAND="stop"
        shift
        ;;
      -f | --force)
        FORCE=1
        shift
        ;;
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
      if ports_in_use; then
        echo "Stopping dev listeners on port(s): $(busy_ports_list)"
        free_dev_ports
      else
        echo "No process listening on ${DEV_PORTS[*]}."
      fi
      exit 0
      ;;
    restart)
      echo "Restarting BuildingAI dev stack..."
      free_dev_ports
      start_dev 1
      ;;
    start)
      start_dev "$FORCE"
      ;;
  esac
}

main "$@"
