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
      SAP_URL=*|SAP_USER=*|SAP_PASSWORD=*|SAP_CLIENT=*|SAP_LANGUAGE=*|SAP_SESSION_TYPE=*|\
NODE_TLS_REJECT_UNAUTHORIZED=*|MCP_HOST=*|MCP_PORT=*|MCP_PATH=*|MCP_ABAP_ADT_REPO=*|MCP_ABAP_ADT_REF=*)
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

unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
export NO_PROXY="${NO_PROXY:-localhost,127.0.0.1,::1}"
export no_proxy="$NO_PROXY"

REPO="${MCP_ABAP_ADT_REPO:-https://github.com/yan252/mcp-abap-abap-adt-api.git}"
REF="${MCP_ABAP_ADT_REF:-main}"
VENDOR="$ROOT/vendor/mcp-abap-abap-adt-api"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: $name (copy .env.example to .env)" >&2
    exit 1
  fi
}

require_env SAP_URL
require_env SAP_USER
require_env SAP_PASSWORD

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (18+). Install from https://nodejs.org/" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (comes with Node.js)" >&2
  exit 1
fi

git_no_proxy() {
  git -c http.proxy= -c https.proxy= "$@"
}

if [[ -d "$VENDOR" && ! -d "$VENDOR/.git" ]]; then
  echo "Removing incomplete vendor directory ..."
  rm -rf "$VENDOR"
fi

if [[ ! -d "$VENDOR/.git" ]]; then
  echo "Cloning $REPO ($REF) ..."
  mkdir -p "$(dirname "$VENDOR")"
  git_no_proxy clone --depth 1 --branch "$REF" "$REPO" "$VENDOR"
elif [[ -n "${MCP_ABAP_ADT_PULL:-}" ]]; then
  echo "Updating vendor ..."
  git_no_proxy -C "$VENDOR" fetch --depth 1 origin "$REF"
  git_no_proxy -C "$VENDOR" checkout "$REF"
  git_no_proxy -C "$VENDOR" pull --ff-only origin "$REF" || true
fi

if [[ -z "${SAP_MCP_SKIP_BUILD:-}" ]] || [[ "${SAP_MCP_SKIP_BUILD}" == "0" ]]; then
  echo "Building ABAP ADT MCP server ..."
  (
    cd "$VENDOR"
    if [[ ! -d node_modules ]]; then
      env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
        npm ci 2>/dev/null || env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY npm install
    fi
    env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY npm run build
  )
else
  echo "Skipping ABAP ADT MCP build (SAP_MCP_SKIP_BUILD=${SAP_MCP_SKIP_BUILD})"
  if [[ ! -f "$VENDOR/dist/index.js" ]]; then
    echo "Error: $VENDOR/dist/index.js missing; run without SAP_MCP_SKIP_BUILD once." >&2
    exit 1
  fi
fi

if [[ -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$VENDOR/.env"
fi

MCP_HOST="${MCP_HOST:-127.0.0.1}"
MCP_PORT="${MCP_PORT:-8100}"
MCP_PATH="${MCP_PATH:-/mcp}"

export SAP_URL SAP_USER SAP_PASSWORD
export SAP_CLIENT="${SAP_CLIENT:-}"
export SAP_LANGUAGE="${SAP_LANGUAGE:-}"
export SAP_SESSION_TYPE="${SAP_SESSION_TYPE:-stateless}"
export NODE_TLS_REJECT_UNAUTHORIZED="${NODE_TLS_REJECT_UNAUTHORIZED:-0}"

STDIO_CMD="node $VENDOR/dist/index.js"

echo "Starting Streamable HTTP gateway on http://${MCP_HOST}:${MCP_PORT}${MCP_PATH}"
echo "Register in BuildingAI console: type=streamable-http, url=http://127.0.0.1:${MCP_PORT}${MCP_PATH}"

exec env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u all_proxy \
  npx -y supergateway@latest \
  --stdio "$STDIO_CMD" \
  --outputTransport streamableHttp \
  --port "$MCP_PORT" \
  --streamableHttpPath "$MCP_PATH" \
  --logLevel info
