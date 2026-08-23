#!/usr/bin/env bash
# Contract tests for start.sh development PID metadata handling.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SH="${ROOT_DIR}/start.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[[ -f "$START_SH" ]] || fail "missing start.sh"
bash -n "$START_SH" || fail "start.sh failed bash -n"

grep -q '^clear_dev_pid_metadata()' "$START_SH" \
  || fail "start.sh must define clear_dev_pid_metadata"

awk '
  /^clear_dev_pid_metadata\(\)/ { in_fn=1; next }
  in_fn && /^}/ { exit found ? 0 : 1 }
  in_fn && /rm -f.*dev\.pid/ { found=1 }
  END { if (!in_fn || !found) exit 1 }
' "$START_SH" || fail "clear_dev_pid_metadata must remove dev.pid without signaling its recorded process"

awk '
  /^start_dev\(\)/ { in_fn=1; next }
  in_fn && /^}/ { exit (branch_end && cleanup && foreground_exec && branch_end < cleanup && cleanup < foreground_exec) ? 0 : 1 }
  in_fn && /^  fi$/ && !branch_end { branch_end=NR }
  in_fn && /clear_dev_pid_metadata/ { cleanup=NR }
  in_fn && /exec env -u http_proxy/ { foreground_exec=NR }
  END {
    if (!in_fn || !(branch_end && cleanup && foreground_exec && branch_end < cleanup && cleanup < foreground_exec)) exit 1
  }
' "$START_SH" || fail "foreground start must clear PID metadata after the detached branch and before exec"

echo "OK: start.sh process status contract tests passed"
