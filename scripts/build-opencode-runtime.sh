#!/usr/bin/env bash
# Build and attest the BuildingAI-managed OpenCode runtime with its Web UI embedded.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=/dev/null
source "${ROOT_DIR}/start.sh"

load_root_env
clear_broken_proxy

workspace="${OPENCODE_WORKSPACE_DIR:-${ROOT_DIR}/../opencode}"
build_script="${workspace}/packages/opencode/script/build.ts"
models_snapshot="${workspace}/packages/opencode/test/tool/fixtures/models-api.json"
if [[ ! -x "$build_script" ]]; then
  echo "Error: OpenCode build script is not executable: ${build_script}" >&2
  exit 1
fi
if [[ -z "${MODELS_DEV_API_JSON:-}" ]]; then
  if [[ ! -f "$models_snapshot" ]]; then
    echo "Error: OpenCode models snapshot not found: ${models_snapshot}" >&2
    exit 1
  fi
  MODELS_DEV_API_JSON="$models_snapshot"
  export MODELS_DEV_API_JSON
fi

echo "Building the managed OpenCode runtime with embedded Web UI..."
(
  cd "$workspace"
  OPENCODE_CHANNEL=master "$build_script" --single --skip-install
)

OPENCODE_WORKSPACE_DIR="$workspace"
export OPENCODE_WORKSPACE_DIR
bin="$(resolve_opencode_bin)"
opencode_write_runtime_attestation "$bin"
opencode_binary_integrity_valid "$bin"

echo "OpenCode runtime is ready for a managed restart: ${bin}"
