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

pick_sap_pyrfc_python() {
  if [[ -n "${PYTHON_BIN:-}" && -x "${PYTHON_BIN}" ]]; then
    printf '%s\n' "$PYTHON_BIN"
    return 0
  fi
  local candidate
  for candidate in \
    "${HOME}/.local/share/uv/python/cpython-3.12-macos-aarch64-none/bin/python3.12" \
    python3.12 \
    python3.11 \
    python3.10 \
    python3
  do
    if command -v "$candidate" >/dev/null 2>&1 || [[ -x "$candidate" ]]; then
      if "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
        printf '%s\n' "$candidate"
        return 0
      fi
    fi
  done
  echo "Python 3.10+ is required." >&2
  return 1
}
