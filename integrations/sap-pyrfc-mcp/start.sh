#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

load_dotenv() {
  local file="$1" line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    case "$line" in
      SAP_*=*|SAPNWRFC_HOME=*|SAP_BACKEND=*|MCP_HOST=*|MCP_PORT=*|MCP_PATH=*)
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
fi

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
export NO_PROXY="${NO_PROXY:-localhost,127.0.0.1,::1}"
export no_proxy="$NO_PROXY"

if [[ -n "${SAPNWRFC_HOME:-}" && -d "${SAPNWRFC_HOME}/lib" ]]; then
  export LD_LIBRARY_PATH="${SAPNWRFC_HOME}/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.10+ is required." >&2
  exit 1
fi

VENV="${ROOT}/.venv"
if [[ ! -d "$VENV" ]]; then
  echo "Creating Python venv ..."
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "${VENV}/bin/activate"

if [[ -z "${SAP_PYRFC_SKIP_INSTALL:-}" || "${SAP_PYRFC_SKIP_INSTALL}" == "0" ]]; then
  echo "Installing Python dependencies ..."
  pip install -q -U pip
  pip install -q -r requirements.txt
  if [[ -n "${SAPNWRFC_HOME:-}" ]] && ! python -c "import pyrfc" 2>/dev/null; then
    echo "PyRFC not found — run ./install-pyrfc.sh to build against NW RFC SDK."
    echo "  ADT fallback will be used if SAP_URL is configured (see sap-abap-adt-mcp/.env)."
  fi
else
  echo "Skipping pip install (SAP_PYRFC_SKIP_INSTALL=${SAP_PYRFC_SKIP_INSTALL})"
fi

export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

MCP_HOST="${MCP_HOST:-127.0.0.1}"
MCP_PORT="${MCP_PORT:-8200}"
MCP_PATH="${MCP_PATH:-/mcp}"

STDIO_CMD="${VENV}/bin/python -m sap_pyrfc_mcp"

if ! command -v node >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then
  echo "Node.js 18+ and npx are required for the HTTP gateway (supergateway)." >&2
  exit 1
fi

echo "Starting SAP PyRFC MCP gateway on http://${MCP_HOST}:${MCP_PORT}${MCP_PATH}"
echo "Register in BuildingAI console: type=streamable-http, url=http://127.0.0.1:${MCP_PORT}${MCP_PATH}"
echo "Without SAP credentials, call the healthcheck tool to verify SDK setup."

exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
  npx -y supergateway@latest \
  --stdio "$STDIO_CMD" \
  --outputTransport streamableHttp \
  --port "$MCP_PORT" \
  --streamableHttpPath "$MCP_PATH" \
  --logLevel info
