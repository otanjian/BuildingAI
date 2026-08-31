## Why

BuildingAI can create OpenCode conversations under one build channel and later restart port 4096
with another channel, which makes the same session IDs resolve against a different channel-specific
database and appear missing.

Why now: a conversation created by a `dev` runtime became unavailable after `start.sh` selected a
`master` build, while both BuildingAI history and the original OpenCode data still existed.

## What Changes

- Require the BuildingAI-managed OpenCode binary to report a `master` channel version before it can
  be started or accepted as the active runtime.
- Pin the controlled BuildingAI OpenCode build wrapper to produce a master-channel binary regardless
  of the sibling source repository's checked-out branch.
- Reject non-master binaries before stopping an already-running stack.
- Verify the served runtime still reports the master channel after startup.
- Add shell regression coverage for accepted and rejected runtime versions.

Non-goals: migrating or merging channel-specific OpenCode databases, modifying persisted sessions,
or changing how standalone OpenCode installations select their database.

## Capabilities

### New Capabilities

- `opencode-master-runtime-channel`: Ensures BuildingAI startup consistently selects and verifies a
  master-channel OpenCode runtime.

### Modified Capabilities

- None.

## Impact

- `start.sh` OpenCode preflight, readiness, and startup diagnostics.
- `scripts/start-sh-opencode.test.sh` regression coverage.
- Local BuildingAI-managed OpenCode runtime selection on port 4096.
- No API, UI, dependency, or database schema changes.
