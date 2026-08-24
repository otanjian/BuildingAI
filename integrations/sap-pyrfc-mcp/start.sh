#!/usr/bin/env bash
# Single-process Streamable HTTP MCP with shared multi-user Connection Registry.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/runtime-env.sh
source "${ROOT}/scripts/runtime-env.sh"

load_dotenv() {
  local file="$1" line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    case "$line" in
      SAP_*=*|SAPNWRFC_HOME=*|SAP_BACKEND=*|MCP_HOST=*|MCP_PORT=*|MCP_PATH=*|MCP_TRANSPORT=*|\
MAX_CONNECTIONS=*|IDLE_TTL_MS=*)
        key="${line%%=*}"
        val="${line#*=}"
        key="${key#"${key%%[![:space:]]*}"}"
        val="${val#"${val%%[![:space:]]*}"}"
        export "${key}=${val}"
        ;;
    esac
  done <"$file"
}

if [[ -f .env ]]; then
  load_dotenv .env
fi
if [[ -f .env.local-sdk ]]; then
  load_dotenv .env.local-sdk
  load_sap_pyrfc_runtime_profile .env.local-sdk
fi

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
export NO_PROXY="${NO_PROXY:-localhost,127.0.0.1,::1}"
export no_proxy="$NO_PROXY"

configure_sdk_runtime "${SAPNWRFC_HOME:-}"
ensure_sap_pyrfc_arch_available
PYTHON_BIN="$(pick_sap_pyrfc_python)"

VENV="$(sap_pyrfc_venv "$ROOT")"
if [[ ! -d "$VENV" ]]; then
  echo "Creating Python venv for $(sap_pyrfc_runtime_arch) with ${PYTHON_BIN} ..."
  run_sap_pyrfc_arch "$PYTHON_BIN" -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "${VENV}/bin/activate"

run_python() {
  run_sap_pyrfc_arch "${VENV}/bin/python" "$@"
}

if [[ -z "${SAP_PYRFC_SKIP_INSTALL:-}" || "${SAP_PYRFC_SKIP_INSTALL}" == "0" ]]; then
  echo "Installing Python dependencies ..."
  run_python -m pip install -q -U pip
  run_python -m pip install -q -r requirements.txt
  if ! run_python -c "from pyrfc import Connection" 2>/dev/null; then
    echo "PyRFC is not ready — run ./install-nwrfcsdk.sh <official-sdk> && ./install-pyrfc.sh."
    echo "  Diagnose local prerequisites with ./verify.sh."
    echo "  ADT fallback works if sap_connect includes url=https://host:44300."
  fi
else
  echo "Skipping pip install (SAP_PYRFC_SKIP_INSTALL=${SAP_PYRFC_SKIP_INSTALL})"
fi

# uvicorn comes with mcp[cli] / streamable-http path
run_python -c "import uvicorn" 2>/dev/null || run_python -m pip install -q uvicorn

export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

MCP_HOST="${MCP_HOST:-127.0.0.1}"
MCP_PORT="${MCP_PORT:-8200}"
MCP_PATH="${MCP_PATH:-/mcp}"
MCP_TRANSPORT="${MCP_TRANSPORT:-streamable-http}"
MAX_CONNECTIONS="${MAX_CONNECTIONS:-20}"
IDLE_TTL_MS="${IDLE_TTL_MS:-1800000}"
export MCP_HOST MCP_PORT MCP_PATH MCP_TRANSPORT MAX_CONNECTIONS IDLE_TTL_MS

if command -v lsof >/dev/null 2>&1; then
  busy="$(lsof -ti:"$MCP_PORT" 2>/dev/null || true)"
  if [[ -n "$busy" ]]; then
    echo "Port ${MCP_PORT} in use (pids: ${busy}). Free it or set MCP_PORT." >&2
    exit 1
  fi
fi

echo "Starting sap-pyrfc multi-user HTTP gateway"
echo "  runtime: ${SAP_PYRFC_EXECUTION_MODE:-native} $(sap_pyrfc_runtime_arch), venv=$(basename "$VENV")"
echo "  URL:    http://${MCP_HOST}:${MCP_PORT}${MCP_PATH}"
echo "  limits: MAX_CONNECTIONS=${MAX_CONNECTIONS} IDLE_TTL_MS=${IDLE_TTL_MS}"
echo "  flow:   sap_connect → connection_id → call_rfc/read_table/…"
echo "Register in BuildingAI: type=streamable-http, url=http://127.0.0.1:${MCP_PORT}${MCP_PATH}"

if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
  exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    /usr/bin/arch -x86_64 "${VENV}/bin/python" -m sap_pyrfc_mcp
else
  exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
    "${VENV}/bin/python" -m sap_pyrfc_mcp
fi
