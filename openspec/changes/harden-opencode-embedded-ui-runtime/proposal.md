## Why

The managed OpenCode process can report the expected version while serving an upstream Web UI that
does not contain BuildingAI's embed behavior. This silently reintroduces duplicate session tabs and
the secondary review panel even though the source and tests still contain the intended hiding logic.

Why now: a later binary build replaced the browser-verified artifact, and the current launcher
accepted it because it checks only health and version strings.

## What Changes

- Define a runtime integrity contract for the BuildingAI-managed OpenCode Web UI.
- Validate the Web UI actually served by OpenCode, including the BuildingAI embed marker, before a
  same-version runtime is accepted as ready.
- Fail startup with an actionable diagnostic when the binary falls back to an incompatible upstream
  UI instead of reporting the stack as healthy.
- Provide a controlled build-and-validate path that embeds the current workspace Web UI and rejects
  artifacts that do not carry the required contract.
- Rebuild and safely restart the current managed runtime, then verify the embedded layout in the
  representative BuildingAI conversation.

Non-goals: automatically rewriting dirty OpenCode source, restoring superseded native-panel
experiments, changing normal direct OpenCode routes, or changing conversation/session data.

## Capabilities

### New Capabilities

- `opencode-embedded-ui-runtime-integrity`: Ensures the managed OpenCode runtime serves the
  BuildingAI-compatible embedded Web UI and cannot pass readiness checks with an incompatible UI.

### Modified Capabilities

- None.

## Impact

- BuildingAI launcher and shell regression tests.
- Managed sibling OpenCode build artifact and runtime on port 4096.
- Local development startup diagnostics and deployment verification.
- No API schema, database, dependency, or persisted-session migration.
