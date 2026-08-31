# workspace-opencode-runtime Specification

## Purpose
TBD - created by archiving change use-workspace-opencode-runtime. Update Purpose after archive.
## Requirements
### Requirement: Prefer the workspace OpenCode runtime

The development launcher MUST resolve the native OpenCode binary from the configured workspace
before PATH and legacy global locations. An explicit executable `OPENCODE_BIN` override MUST remain
the highest-priority choice.

#### Scenario: Workspace build is available

- **WHEN** the workspace contains a native OpenCode build and no explicit override is provided
- **THEN** the launcher selects that workspace build
- **AND** it does not select a stale PATH or legacy global binary

### Requirement: Preserve OpenCode configuration

Changing the OpenCode runtime MUST NOT delete or rewrite the user's OpenCode configuration,
authentication, or session data directories.

#### Scenario: Runtime is upgraded

- **WHEN** the launcher replaces an older managed OpenCode process
- **THEN** the process starts with the existing user environment and configuration paths
- **AND** the configuration directories remain unchanged

### Requirement: Restart on runtime mismatch

The launcher MUST restart a healthy managed OpenCode server when its reported runtime version does
not match the configured workspace package version.

#### Scenario: Old server is already listening

- **WHEN** `/global/health` reports a version different from the workspace package
- **THEN** the launcher stops the old managed process and starts the resolved workspace binary
- **AND** readiness is verified again before reporting success

