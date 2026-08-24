## Context

See `proposal.md` for motivation. OpenCode derives its SQLite filename from the build-time installation
channel. `dev` and `master` builds therefore persist sessions in different files even when they use
the same executable path, data directory, port, and workspace. `start.sh` currently attests binary
bytes and embedded-UI compatibility but treats the version as an opaque matching string.

## Goals / Non-Goals

**Goals:**

- Make the required channel an explicit launcher invariant.
- Enforce the invariant before destructive restart steps and again against the live health response.
- Keep the check testable without starting a real OpenCode server.

**Non-Goals:**

- Merge `opencode-dev.db` into `opencode-master.db`.
- Recover or rewrite BuildingAI conversation bindings.
- Change OpenCode's channel-based database naming.

## Decisions

### Validate the canonical version string

Add a small shell predicate for the version format emitted by managed builds and require the channel
segment to be `master`. Apply it to both `opencode --version` and `/global/health` output. This uses
the same externally observable identity already stored in the runtime state and avoids inferring the
channel from filenames or source branches.

Alternative: set `OPENCODE_DISABLE_CHANNEL_DB=1`. Rejected because it changes the selected database
without proving which build is executing and risks mixing existing channel data implicitly.

### Include the channel check in integrity preflight and readiness

Binary integrity validation runs during restart preflight, before services are stopped, so it is the
safest rejection point. Readiness independently checks the live reported version so a mismatched or
unexpected process cannot be accepted merely because the selected file passed preflight.

Alternative: check only in `resolve_opencode_bin`. Rejected because resolution should locate
candidates, while validation already owns whether a candidate is safe to run.

### Pin the controlled build channel

The BuildingAI build wrapper passes `OPENCODE_CHANNEL=master` explicitly instead of inheriting the
sibling repository's current branch name. This makes the documented rebuild action reliably produce
an acceptable binary; the launcher checks remain necessary for externally supplied binaries.

## Risks / Trade-offs

- [Risk] A future master version changes its version format → Keep the predicate isolated and covered
  by fixture tests so the accepted format can be deliberately updated.
- [Risk] Developers intentionally using a dev build can no longer use the managed launcher → They can
  run standalone OpenCode on another port; BuildingAI-managed port 4096 remains stable.

## Migration Plan

Build and attest a master runtime, then restart the managed OpenCode target. Existing master-channel
data remains untouched. Rollback is the prior `start.sh`, but doing so re-enables channel drift.
