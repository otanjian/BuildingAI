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

test_darwin_loader_path
test_linux_loader_path
test_installer_preserves_existing_sdk_on_platform_mismatch
echo "platform runtime tests passed"
