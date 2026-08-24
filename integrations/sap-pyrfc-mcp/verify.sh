#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/runtime-env.sh
source "${ROOT}/scripts/runtime-env.sh"

load_sdk_home() {
  local file line
  for file in .env.local-sdk .env; do
    [[ -f "$file" ]] || continue
    line="$(grep -E '^[[:space:]]*SAPNWRFC_HOME=' "$file" 2>/dev/null | tail -1 || true)"
    if [[ -n "$line" ]]; then
      SAPNWRFC_HOME="${SAPNWRFC_HOME:-${line#*=}}"
      break
    fi
  done
}

load_sdk_home
configure_sdk_runtime "${SAPNWRFC_HOME:-}"
PYTHON="${ROOT}/.venv/bin/python"
[[ -x "$PYTHON" ]] || PYTHON="$(pick_sap_pyrfc_python)"
export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
exec "$PYTHON" -m sap_pyrfc_mcp.verify "$@"
