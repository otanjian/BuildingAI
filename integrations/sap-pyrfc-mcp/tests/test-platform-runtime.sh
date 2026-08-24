#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local value="$1" expected="$2"
  [[ "$value" == *"$expected"* ]] || fail "Expected '$value' to contain '$expected'"
}

test_darwin_loader_path() {
  local output
  output="$({
    export SAP_PYRFC_PLATFORM=Darwin
    export DYLD_LIBRARY_PATH="/existing/dyld"
    export LD_LIBRARY_PATH="/existing/ld"
    # shellcheck source=/dev/null
    source "${ROOT}/scripts/runtime-env.sh"
    configure_sdk_runtime "/private/sdk"
    printf '%s\n%s\n' "$DYLD_LIBRARY_PATH" "$LD_LIBRARY_PATH"
  })"
  assert_contains "$output" "/private/sdk/lib:/existing/dyld"
  assert_contains "$output" "/existing/ld"
}

test_linux_loader_path() {
  local output
  output="$({
    export SAP_PYRFC_PLATFORM=Linux
    export DYLD_LIBRARY_PATH="/existing/dyld"
    export LD_LIBRARY_PATH="/existing/ld"
    # shellcheck source=/dev/null
    source "${ROOT}/scripts/runtime-env.sh"
    configure_sdk_runtime "/private/sdk"
    printf '%s\n%s\n' "$DYLD_LIBRARY_PATH" "$LD_LIBRARY_PATH"
  })"
  assert_contains "$output" "/existing/dyld"
  assert_contains "$output" "/private/sdk/lib:/existing/ld"
}

test_installer_preserves_existing_sdk_on_platform_mismatch() {
  local temp existing candidate status
  temp="$(mktemp -d)"
  existing="${temp}/existing"
  candidate="${temp}/linux-sdk"
  mkdir -p "${existing}/lib" "${existing}/include" "${candidate}/lib" "${candidate}/include"
  printf 'keep-me' >"${existing}/marker"
  printf 'header' >"${candidate}/include/sapnwrfc.h"
  printf 'linux' >"${candidate}/lib/libsapnwrfc.so"
  printf 'linux' >"${candidate}/lib/libsapucum.so"

  set +e
  SAP_NWRFC_SDK_DIR="$existing" SAP_PYRFC_PLATFORM=Darwin \
    "${ROOT}/install-nwrfcsdk.sh" "$candidate" >"${temp}/output" 2>&1
  status=$?
  set -e

  [[ $status -ne 0 ]] || fail "Installer accepted a Linux SDK for macOS"
  [[ -f "${existing}/marker" ]] || fail "Installer replaced the existing SDK before validation"
  assert_contains "$(<"${temp}/output")" "Linux"
}

test_runtime_profile_paths() {
  local root="/private/integration" output
  output="$({
    export SAP_PYRFC_PLATFORM=Darwin
    export SAP_PYRFC_RUNTIME_ARCH=x86_64
    source "${ROOT}/scripts/runtime-env.sh"
    printf '%s\n' "$(sap_pyrfc_venv "$root")"
    printf '%s\n' "$(sap_pyrfc_version)"
    printf '%s\n' "$(sap_pyrfc_arch_prefix)"
  })"
  assert_contains "$output" "${root}/.venv-x86_64"
  assert_contains "$output" "3.3"
  assert_contains "$output" "/usr/bin/arch -x86_64"

  output="$({
    export SAP_PYRFC_PLATFORM=Darwin
    export SAP_PYRFC_RUNTIME_ARCH=arm64
    source "${ROOT}/scripts/runtime-env.sh"
    printf '%s\n' "$(sap_pyrfc_venv "$root")"
    printf '%s\n' "$(sap_pyrfc_version)"
    printf '<%s>\n' "$(sap_pyrfc_arch_prefix)"
  })"
  assert_contains "$output" "${root}/.venv"
  assert_contains "$output" "3.3.1"
  assert_contains "$output" "<>"

  output="$({
    export SAP_PYRFC_PLATFORM=Linux
    export SAP_PYRFC_RUNTIME_ARCH=x86_64
    source "${ROOT}/scripts/runtime-env.sh"
    printf '%s\n' "$(sap_pyrfc_venv "$root")"
    printf '%s\n' "$(sap_pyrfc_install_mode)"
  })"
  assert_contains "$output" "${root}/.venv"
  assert_contains "$output" "source"
}

test_macos_sdk_dependency_target() {
  local output temp lib_dir
  temp="$(mktemp -d)"
  lib_dir="${temp}/lib"
  mkdir -p "$lib_dir"
  printf 'icu' >"${lib_dir}/libicudata57.dylib"
  printf 'icu' >"${lib_dir}/libicuuc57.dylib"
  output="$({
    source "${ROOT}/scripts/runtime-env.sh"
    macos_sdk_dependency_target "libicudata57.dylib" "$lib_dir"
    macos_sdk_dependency_target "@loader_path/libicuuc57.dylib" "$lib_dir"
    macos_sdk_dependency_target "/usr/lib/libSystem.B.dylib" "$lib_dir"
  })"
  assert_contains "$output" "@rpath/libicudata57.dylib"
  assert_contains "$output" "@rpath/libicuuc57.dylib"
  [[ "$output" != *"libSystem"* ]] || fail "System libraries must not be rewritten"
}

test_darwin_loader_path
test_linux_loader_path
test_installer_preserves_existing_sdk_on_platform_mismatch
test_runtime_profile_paths
test_macos_sdk_dependency_target
echo "platform runtime tests passed"
