## Context

See `proposal.md` for motivation. Detached development startup stores the PM2 daemon PID in `.run/dev.pid`. Foreground startup executes `pnpm dev:core` directly and has no single durable child PID to record, but it currently leaves any prior PID file in place. The status command then reports stale metadata independently of its accurate port checks.

## Goals / Non-Goals

**Goals:**

- Make PID-file status consistent with the selected startup mode.
- Keep detached PM2 tracking and all existing port readiness behavior intact.
- Verify the mode-specific behavior without starting real services in the test.

**Non-Goals:**

- Introducing foreground process supervision or a new PID ownership scheme.
- Reworking PM2 orchestration for OpenCode or SAP MCP services.
- Changing status output based solely on port ownership heuristics.

## Decisions

### Clear development PID metadata only on the foreground path

Add a small metadata cleanup helper for the development PID files and invoke it after the detached-mode branch, immediately before the foreground `exec`.

This is preferred over calling `stop_pid_file`, because stale PIDs can be reused by unrelated processes and foreground startup has already handled port conflicts explicitly. It is also preferred over removing PID files before the mode branch, because detached startup owns its existing cleanup-and-replacement lifecycle.

### Use a source-level shell contract test

Add a focused executable test under `scripts/` that validates shell syntax and the ordering of detached branching, metadata cleanup, and foreground execution. Existing startup tests use this lightweight style and avoid mutating the developer's live stack.

## Risks / Trade-offs

- [A foreground process is not represented by a PID file] → Status continues to use ports as the authoritative foreground health signal.
- [A source-level contract test does not exercise a real daemon transition] → Perform a live status verification against the already-running foreground stack after applying the fix.

## Migration Plan

No migration is required. The next foreground invocation removes obsolete development PID metadata. Rollback consists of reverting the helper and its invocation.
