#!/usr/bin/env bash
# Shared Python selection and native-library setup for SAP PyRFC scripts.

sap_pyrfc_platform() {
  if [[ -n "${SAP_PYRFC_PLATFORM:-}" ]]; then
    printf '%s\n' "$SAP_PYRFC_PLATFORM"
  else
    uname -s
  fi
}

prepend_path_once() {
  local name="$1" value="$2" current
  current="${!name:-}"
  case ":${current}:" in
    *":${value}:"*) return 0 ;;
  esac
  if [[ -n "$current" ]]; then
    export "${name}=${value}:${current}"
  else
    export "${name}=${value}"
  fi
}

configure_sdk_runtime() {
  local home="${1:-${SAPNWRFC_HOME:-}}" platform_name
  [[ -n "$home" ]] || return 0
  export SAPNWRFC_HOME="$home"
  platform_name="$(sap_pyrfc_platform)"
  case "$platform_name" in
    Darwin | darwin | macOS | macos) prepend_path_once DYLD_LIBRARY_PATH "${home}/lib" ;;
    Linux | linux) prepend_path_once LD_LIBRARY_PATH "${home}/lib" ;;
  esac
}

macos_sdk_dependency_target() {
  local dependency="$1" lib_dir="$2" base
  base="$(basename "$dependency")"
  [[ -f "${lib_dir}/${base}" ]] || return 0
  case "$dependency" in
    @rpath/*) return 0 ;;
    @loader_path/* | @executable_path/* | "$base") printf '@rpath/%s\n' "$base" ;;
    *) return 0 ;;
  esac
}

load_sap_pyrfc_runtime_profile() {
  local file="$1" line key value
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      SAPNWRFC_HOME=*|SAP_PYRFC_RUNTIME_ARCH=*|SAP_PYRFC_EXECUTION_MODE=*|SAP_PYRFC_PYTHON_VERSION=*|SAP_PYRFC_VERSION=*)
        key="${line%%=*}"
        value="${line#*=}"
        [[ -n "${!key:-}" ]] || export "${key}=${value}"
        ;;
    esac
  done <"$file"
}

sap_pyrfc_runtime_arch() {
  if [[ -n "${SAP_PYRFC_RUNTIME_ARCH:-}" ]]; then
    printf '%s\n' "$SAP_PYRFC_RUNTIME_ARCH"
  else
    uname -m
  fi
}

sap_pyrfc_venv() {
  local root="$1"
  if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
    printf '%s/.venv-x86_64\n' "$root"
  else
    printf '%s/.venv\n' "$root"
  fi
}

sap_pyrfc_version() {
  if [[ -n "${SAP_PYRFC_VERSION:-}" ]]; then
    printf '%s\n' "$SAP_PYRFC_VERSION"
  elif [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
    printf '3.3\n'
  else
    printf '3.3.1\n'
  fi
}

sap_pyrfc_install_mode() {
  case "$(sap_pyrfc_platform)" in
    Linux | linux) printf 'source\n' ;;
    *) printf 'wheel\n' ;;
  esac
}

sap_pyrfc_arch_prefix() {
  if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
    printf '/usr/bin/arch -x86_64\n'
  fi
}

run_sap_pyrfc_arch() {
  if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
    /usr/bin/arch -x86_64 "$@"
  else
    "$@"
  fi
}

ensure_sap_pyrfc_arch_available() {
  if [[ "$(sap_pyrfc_platform)" == Darwin && "$(sap_pyrfc_runtime_arch)" == x86_64 ]]; then
    /usr/bin/arch -x86_64 /usr/bin/true >/dev/null 2>&1 || {
      echo "Rosetta 2 is required for the selected x86_64 SAP SDK." >&2
      return 1
    }
  fi
}

python_matches_sap_pyrfc_runtime() {
  local candidate="$1" required_version="${SAP_PYRFC_PYTHON_VERSION:-}"
  run_sap_pyrfc_arch "$candidate" - "$required_version" "$(sap_pyrfc_runtime_arch)" <<'PY' 2>/dev/null
import platform
import sys

required_version, required_arch = sys.argv[1:]
if platform.machine().lower() != required_arch.lower():
    raise SystemExit(1)
if sys.version_info < (3, 10):
    raise SystemExit(1)
if required_version == "3.10" and sys.version_info[:2] != (3, 10):
    raise SystemExit(1)
if sys.version_info[:2] > (3, 12):
    raise SystemExit(1)
PY
}

pick_sap_pyrfc_python() {
  if [[ -n "${PYTHON_BIN:-}" && -x "${PYTHON_BIN}" ]]; then
    if python_matches_sap_pyrfc_runtime "$PYTHON_BIN"; then
      printf '%s\n' "$PYTHON_BIN"
      return 0
    fi
    echo "PYTHON_BIN does not match the selected SAP PyRFC runtime: ${PYTHON_BIN}" >&2
    return 1
  fi
  local candidate
  for candidate in \
    /usr/local/bin/python3.10 \
    /usr/local/bin/python3.11 \
    /usr/local/bin/python3.12 \
    "${HOME}/.local/share/uv/python/cpython-3.12-macos-aarch64-none/bin/python3.12" \
    python3.12 \
    python3.11 \
    python3.10 \
    python3
  do
    if command -v "$candidate" >/dev/null 2>&1 || [[ -x "$candidate" ]]; then
      if python_matches_sap_pyrfc_runtime "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  done
  echo "A Python matching SAP PyRFC architecture $(sap_pyrfc_runtime_arch) and version ${SAP_PYRFC_PYTHON_VERSION:-3.10-3.12} is required." >&2
  return 1
}
