#!/usr/bin/env bash
# Validate and install an operator-supplied SAP NW RFC SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/runtime-env.sh
source "${ROOT}/scripts/runtime-env.sh"

SDK_DIR="${SAP_NWRFC_SDK_DIR:-${ROOT}/lib/nwrfcsdk}"
GITHUB_REPO="${NWRFCSDK_GITHUB_REPO:-https://github.com/juanmoura/nwrfcsdk.git}"
DEV_SIDECAR_HTTP_PROXY="${DEV_SIDECAR_HTTP_PROXY:-${DS_HTTP_PROXY:-http://127.0.0.1:31180}}"
DEV_SIDECAR_HTTPS_PROXY="${DEV_SIDECAR_HTTPS_PROXY:-${DS_HTTPS_PROXY:-http://127.0.0.1:31181}}"
PROBE_PYTHON="${ROOT}/.venv/bin/python"
if [[ ! -x "$PROBE_PYTHON" ]]; then
  PROBE_PYTHON="/usr/bin/python3"
fi

usage() {
  cat <<EOF
Usage:
  ./install-nwrfcsdk.sh <official-nwrfcsdk-archive-or-directory>
  ./install-nwrfcsdk.sh --from-github   # Linux development only

The SDK is licensed SAP software and is never downloaded implicitly. Obtain the
archive matching this host OS from SAP Software Center. On Apple Silicon, an
ARM64 SDK selects the native runtime and an Intel SDK selects an isolated Rosetta
x86_64 runtime. Linux continues to use its native SDK-backed source-build path.
Supported inputs: directory with lib/ and include/, .zip, .tar, .tar.gz, .tgz,
or .sar when SAPCAR is installed.

The community GitHub mirror contains Linux libraries only and is rejected on macOS.
EOF
}

sidecar_proxy_reachable() {
  curl -sS --max-time 2 -x "$DEV_SIDECAR_HTTPS_PROXY" -o /dev/null https://github.com 2>/dev/null
}

git_with_proxy() {
  if sidecar_proxy_reachable; then
    echo "Using DevSidecar proxy: ${DEV_SIDECAR_HTTPS_PROXY}" >&2
    git -c http.proxy="$DEV_SIDECAR_HTTP_PROXY" -c https.proxy="$DEV_SIDECAR_HTTPS_PROXY" "$@"
  else
    git -c http.proxy= -c https.proxy= "$@"
  fi
}

find_sdk_root() {
  local base="$1" candidate
  if [[ -d "${base}/lib" && -d "${base}/include" ]]; then
    printf '%s\n' "$base"
    return 0
  fi
  while IFS= read -r candidate; do
    if [[ -d "${candidate}/lib" && -d "${candidate}/include" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(find "$base" -mindepth 1 -maxdepth 4 -type d 2>/dev/null)
  return 1
}

probe_candidate() {
  local candidate="$1" profile runtime_arch execution_mode python_version pyrfc_version python_bin
  if ! profile="$(PYTHONPATH="$ROOT" "$PROBE_PYTHON" -m sap_pyrfc_mcp.sdk_probe \
    --home "$candidate" --select-runtime --require-supported)"; then
    printf '%s\n' "$profile" >&2
    return 1
  fi
  runtime_arch="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["runtime_architecture"])')"
  execution_mode="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["execution_mode"])')"
  python_version="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["python_version"])')"
  pyrfc_version="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["pyrfc_version"])')"
  [[ -n "$runtime_arch" && "$runtime_arch" != None && -n "$execution_mode" && "$execution_mode" != None ]] || {
    echo "Could not select a supported SAP PyRFC runtime for this SDK." >&2
    return 1
  }

  export SAP_PYRFC_RUNTIME_ARCH="$runtime_arch"
  export SAP_PYRFC_EXECUTION_MODE="$execution_mode"
  export SAP_PYRFC_PYTHON_VERSION="$python_version"
  export SAP_PYRFC_VERSION="$pyrfc_version"
  ensure_sap_pyrfc_arch_available
  python_bin="$(pick_sap_pyrfc_python)"
  PYTHONPATH="$ROOT" run_sap_pyrfc_arch "$python_bin" -m sap_pyrfc_mcp.sdk_probe \
    --home "$candidate" --require-ready >/dev/null
  printf '%s\n' "$profile"
}

install_sdk_root() {
  local src="$1" sdk_root parent stage backup env_stage profile
  sdk_root="$(find_sdk_root "$src")" || {
    echo "Could not locate an SDK root with lib/ and include/ directories." >&2
    exit 1
  }

  echo "Validating SDK before installation ..."
  profile="$(probe_candidate "$sdk_root")"
  export SAP_PYRFC_RUNTIME_ARCH
  SAP_PYRFC_RUNTIME_ARCH="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["runtime_architecture"])')"
  export SAP_PYRFC_EXECUTION_MODE
  SAP_PYRFC_EXECUTION_MODE="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["execution_mode"])')"
  export SAP_PYRFC_PYTHON_VERSION
  SAP_PYRFC_PYTHON_VERSION="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["python_version"])')"
  export SAP_PYRFC_VERSION
  SAP_PYRFC_VERSION="$(printf '%s' "$profile" | "$PROBE_PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["pyrfc_version"])')"

  [[ -n "$SDK_DIR" && "$SDK_DIR" != "/" && "$SDK_DIR" != "$HOME" ]] || {
    echo "Refusing unsafe SDK target: ${SDK_DIR}" >&2
    exit 1
  }
  parent="$(dirname "$SDK_DIR")"
  mkdir -p "$parent"
  stage="$(mktemp -d "${parent}/.nwrfcsdk-stage.XXXXXX")"
  cp -a "${sdk_root}/." "$stage/"

  env_stage="$(mktemp "${ROOT}/.env.local-sdk.XXXXXX")"
  printf '%s\n' \
    '# Generated by install-nwrfcsdk.sh' \
    "SAPNWRFC_HOME=${SDK_DIR}" \
    "SAP_PYRFC_RUNTIME_ARCH=${SAP_PYRFC_RUNTIME_ARCH}" \
    "SAP_PYRFC_EXECUTION_MODE=${SAP_PYRFC_EXECUTION_MODE}" \
    "SAP_PYRFC_PYTHON_VERSION=${SAP_PYRFC_PYTHON_VERSION}" \
    "SAP_PYRFC_VERSION=${SAP_PYRFC_VERSION}" >"$env_stage"

  backup=""
  if [[ -e "$SDK_DIR" ]]; then
    backup="${SDK_DIR}.backup.$(date +%Y%m%d%H%M%S)"
    mv "$SDK_DIR" "$backup"
  fi
  if ! mv "$stage" "$SDK_DIR"; then
    [[ -z "$backup" ]] || mv "$backup" "$SDK_DIR"
    echo "Could not activate the validated SDK." >&2
    exit 1
  fi
  mv "$env_stage" "${ROOT}/.env.local-sdk"

  echo "Installed SAP NW RFC SDK to: ${SDK_DIR}"
  echo "Selected runtime: ${SAP_PYRFC_EXECUTION_MODE} ${SAP_PYRFC_RUNTIME_ARCH}, Python ${SAP_PYRFC_PYTHON_VERSION}, PyRFC ${SAP_PYRFC_VERSION}"
  [[ -z "$backup" ]] || echo "Previous SDK retained at: ${backup}"
  echo "Next: ./install-pyrfc.sh && ./verify.sh"
}

extract_and_install() {
  local input="$1" workdir input_dir input_name
  if [[ -d "$input" ]]; then
    install_sdk_root "$input"
    return
  fi
  [[ -f "$input" ]] || {
    echo "SDK input does not exist: ${input}" >&2
    exit 1
  }
  input_dir="$(cd "$(dirname "$input")" && pwd -P)"
  input_name="$(basename "$input")"
  input="${input_dir}/${input_name}"
  workdir="$(mktemp -d)"
  echo "Extracting ${input} ..."
  case "$input" in
    *.zip) unzip -q "$input" -d "$workdir" ;;
    *.tar.gz | *.tgz) tar -xzf "$input" -C "$workdir" ;;
    *.tar) tar -xf "$input" -C "$workdir" ;;
    *.sar | *.SAR)
      command -v SAPCAR >/dev/null 2>&1 || {
        echo "SAPCAR is required to extract .sar archives." >&2
        exit 1
      }
      (cd "$workdir" && SAPCAR -xvf "$input")
      ;;
    *)
      echo "Unsupported archive format: ${input}" >&2
      exit 1
      ;;
  esac
  install_sdk_root "$workdir"
}

clone_from_github() {
  local platform_name workdir
  platform_name="$(sap_pyrfc_platform)"
  case "$platform_name" in
    Darwin | darwin | macOS | macos)
      echo "The community SDK mirror contains Linux binaries and cannot run on macOS." >&2
      echo "Download the official macOS SDK matching your Python architecture from SAP." >&2
      exit 1
      ;;
  esac
  workdir="$(mktemp -d)"
  echo "Cloning Linux development SDK from ${GITHUB_REPO} ..."
  git_with_proxy clone --depth 1 "$GITHUB_REPO" "${workdir}/repo"
  install_sdk_root "${workdir}/repo"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

case "$1" in
  -h | --help | help) usage ;;
  --from-github | github) clone_from_github ;;
  *) extract_and_install "$1" ;;
esac
