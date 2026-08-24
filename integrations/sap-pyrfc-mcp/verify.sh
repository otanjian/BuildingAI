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
load_sap_pyrfc_runtime_profile .env.local-sdk
configure_sdk_runtime "${SAPNWRFC_HOME:-}"
ensure_sap_pyrfc_arch_available
VENV="$(sap_pyrfc_venv "$ROOT")"
PYTHON="${VENV}/bin/python"
[[ -x "$PYTHON" ]] || PYTHON="$(pick_sap_pyrfc_python)"
export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
  exec /usr/bin/arch -x86_64 "$PYTHON" -m sap_pyrfc_mcp.verify "$@"
fi
exec "$PYTHON" -m sap_pyrfc_mcp.verify "$@"
