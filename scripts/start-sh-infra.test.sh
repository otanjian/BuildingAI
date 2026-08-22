#!/usr/bin/env bash
# Contract tests for start.sh local Postgres/Redis readiness helpers.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SH="${ROOT_DIR}/start.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }

[[ -f "$START_SH" ]] || fail "missing start.sh"
bash -n "$START_SH" || fail "start.sh failed bash -n"

grep -q 'ensure_local_infra' "$START_SH" || fail "start.sh must define ensure_local_infra"
grep -q 'recover_stale_postgres_pid' "$START_SH" || fail "start.sh must recover stale Homebrew postmaster.pid"
grep -q 'postgres_ready' "$START_SH" || fail "start.sh must define postgres_ready"
grep -q 'redis_ready' "$START_SH" || fail "start.sh must define redis_ready"

# load_root_env must export DB/Redis/APP_DOMAIN for checks and diagnostics.
grep -E 'for key in .*APP_DOMAIN' "$START_SH" >/dev/null \
  || grep -E 'APP_DOMAIN.*DB_HOST.*DB_PORT|DB_PORT.*REDIS_PORT|APP_DOMAIN DB_HOST' "$START_SH" >/dev/null \
  || fail "load_root_env must load APP_DOMAIN / DB_* / REDIS_*"

# start_dev must gate on local infra before launching API/web.
awk '
  /^start_dev\(\)/ { in_fn=1; next }
  in_fn && /^[a-zA-Z_][a-zA-Z0-9_]*\(\)/ { exit }
  in_fn && /ensure_local_infra/ { found=1 }
  END { exit found ? 0 : 1 }
' "$START_SH" || fail "start_dev must call ensure_local_infra"

# shellcheck source=/dev/null
source "$START_SH"

command -v postgres_ready >/dev/null || fail "postgres_ready missing after source"
command -v redis_ready >/dev/null || fail "redis_ready missing after source"
command -v recover_stale_postgres_pid >/dev/null || fail "recover_stale_postgres_pid missing after source"
command -v is_postgres_process >/dev/null || fail "is_postgres_process missing after source"

# Dead PID in postmaster.pid should be treated as stale and removed.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "${tmp}/pgdata"
printf '999999991\n%s\n' "$tmp/pgdata" >"${tmp}/pgdata/postmaster.pid"
HOMEBREW_PG_DATA_DIRS=("${tmp}/pgdata")
recover_stale_postgres_pid
[[ ! -f "${tmp}/pgdata/postmaster.pid" ]] || fail "recover_stale_postgres_pid should remove dead-PID lock"

# Live non-postgres PID should also be removed (the failure mode we hit locally).
printf '%s\n%s\n' "$$" "$tmp/pgdata" >"${tmp}/pgdata/postmaster.pid"
HOMEBREW_PG_DATA_DIRS=("${tmp}/pgdata")
recover_stale_postgres_pid
[[ ! -f "${tmp}/pgdata/postmaster.pid" ]] || fail "recover_stale_postgres_pid should remove non-postgres PID lock"

# is_postgres_process: current shell is not postgres.
is_postgres_process "$$" && fail "current shell must not count as postgres"

echo "OK: start.sh infra contract tests passed"
