#!/usr/bin/env bash
# Install pinned PyRFC against a validated SAP NW RFC SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
# shellcheck source=scripts/runtime-env.sh
source "${ROOT}/scripts/runtime-env.sh"

PYRFC_VERSION="${PYRFC_VERSION:-3.3.1}"
PYRFC_GIT="${PYRFC_GIT:-https://github.com/SAP/PyRFC.git}"
PYRFC_REF="${PYRFC_REF:-v${PYRFC_VERSION}}"
BUILD_DIR="${ROOT}/.build/pyrfc-src"
DEV_SIDECAR_HTTP_PROXY="${DEV_SIDECAR_HTTP_PROXY:-${DS_HTTP_PROXY:-http://127.0.0.1:31180}}"
DEV_SIDECAR_HTTPS_PROXY="${DEV_SIDECAR_HTTPS_PROXY:-${DS_HTTPS_PROXY:-http://127.0.0.1:31181}}"

load_env_var() {
  local key="$1" file="$2" line
  line="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [[ -z "$line" ]] && return 0
  printf '%s' "${line#*=}"
}

if [[ -f .env.local-sdk ]]; then
  SAPNWRFC_HOME="${SAPNWRFC_HOME:-$(load_env_var SAPNWRFC_HOME .env.local-sdk)}"
fi
if [[ -f .env ]]; then
  SAPNWRFC_HOME="${SAPNWRFC_HOME:-$(load_env_var SAPNWRFC_HOME .env)}"
fi
if [[ -z "${SAPNWRFC_HOME:-}" ]]; then
  echo "SAPNWRFC_HOME is not set. Run ./install-nwrfcsdk.sh first." >&2
  exit 1
fi
configure_sdk_runtime "$SAPNWRFC_HOME"

VENV="${ROOT}/.venv"
if [[ ! -d "$VENV" ]]; then
  "$(pick_sap_pyrfc_python)" -m venv "$VENV"
fi
# shellcheck source=/dev/null
source "${VENV}/bin/activate"
export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

python -m sap_pyrfc_mcp.sdk_probe --home "$SAPNWRFC_HOME" --require-ready >/dev/null || {
  echo "The configured SAP NW RFC SDK is not compatible with this Python runtime." >&2
  python -m sap_pyrfc_mcp.sdk_probe --home "$SAPNWRFC_HOME" >&2
  exit 1
}

git_with_proxy() {
  if curl -sS --max-time 2 -x "$DEV_SIDECAR_HTTPS_PROXY" -o /dev/null https://github.com 2>/dev/null; then
    git -c http.proxy="$DEV_SIDECAR_HTTP_PROXY" -c https.proxy="$DEV_SIDECAR_HTTPS_PROXY" "$@"
  else
    git -c http.proxy= -c https.proxy= "$@"
  fi
}

ensure_macos_rpath() {
  local binary="$1" desired="$2" old has_desired=0 replaced=0
  while IFS= read -r old; do
    [[ -n "$old" ]] || continue
    if [[ "$old" == "$desired" ]]; then
      has_desired=1
    elif [[ $replaced -eq 0 && "$old" == */nwrfcsdk/lib ]]; then
      install_name_tool -rpath "$old" "$desired" "$binary"
      replaced=1
      has_desired=1
    fi
  done < <(otool -l "$binary" | awk '/LC_RPATH/{getline; getline; print $2}')
  if [[ $has_desired -eq 0 ]]; then
    install_name_tool -add_rpath "$desired" "$binary"
  fi
}

fix_macos_sdk_paths() {
  local lib_dir="${SAPNWRFC_HOME}/lib" dylib dependency base binary
  command -v install_name_tool >/dev/null 2>&1 || {
    echo "Xcode command-line tools are required (install_name_tool missing)." >&2
    exit 1
  }
  while IFS= read -r dylib; do
    chmod u+w "$dylib"
    base="$(basename "$dylib")"
    install_name_tool -id "@rpath/${base}" "$dylib"
    ensure_macos_rpath "$dylib" "$lib_dir"
    while IFS= read -r dependency; do
      base="$(basename "$dependency")"
      [[ "$dependency" == @loader_path/* ]] || continue
      [[ -f "${lib_dir}/${base}" ]] || continue
      install_name_tool -change "$dependency" "@rpath/${base}" "$dylib"
    done < <(otool -L "$dylib" | tail -n +2 | awk '{print $1}')
  done < <(find "$lib_dir" -maxdepth 1 -type f -name '*.dylib' -print)

  binary="$(python - <<'PY'
from importlib.metadata import files
from pathlib import Path
for item in files("pyrfc") or []:
    if item.name.endswith("-darwin.so"):
        print(Path(item.locate()).resolve())
        break
PY
)"
  [[ -n "$binary" && -f "$binary" ]] || {
    echo "Could not locate the installed PyRFC native extension." >&2
    exit 1
  }
  chmod u+w "$binary"
  ensure_macos_rpath "$binary" "$lib_dir"
}

install_macos_wheel() {
  echo "Installing official PyRFC ${PYRFC_VERSION} macOS wheel ..."
  echo "Note: this pinned release is yanked because upstream maintenance ended."
  python -m pip install --only-binary=:all: --force-reinstall "pyrfc==${PYRFC_VERSION}"
  fix_macos_sdk_paths
}

install_linux_source() {
  local sdk_tier
  sdk_tier="$(python - <<'PY'
from sap_pyrfc_mcp.sdk_probe import probe_sdk
print(probe_sdk()["tier"])
PY
)"
  python -m pip install -q -U pip setuptools wheel cython
  if [[ -e "$BUILD_DIR" ]]; then
    echo "Removing previous PyRFC build directory: ${BUILD_DIR}"
    find "$BUILD_DIR" -depth -delete
  fi
  mkdir -p "$(dirname "$BUILD_DIR")"
  echo "Cloning PyRFC ${PYRFC_REF} ..."
  git_with_proxy clone --depth 1 --branch "$PYRFC_REF" "$PYRFC_GIT" "$BUILD_DIR"
  if [[ "$sdk_tier" == "legacy" ]]; then
    echo "Applying legacy Linux SDK compatibility patch ..."
    python "${ROOT}/scripts/patch-pyrfc-legacy-sdk.py" "$BUILD_DIR"
  fi
  python -m pip install "$BUILD_DIR"
}

case "$(sap_pyrfc_platform)" in
  Darwin | darwin | macOS | macos) install_macos_wheel ;;
  Linux | linux) install_linux_source ;;
  *)
    echo "PyRFC installer currently supports macOS and Linux." >&2
    exit 1
    ;;
esac

./verify.sh
