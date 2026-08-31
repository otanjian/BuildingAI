## Purpose

Keep BuildingAI-managed OpenCode sessions on one predictable persistence channel across rebuilds and
restarts so existing conversation bindings do not silently resolve against another database.

## ADDED Requirements

### Requirement: Managed startup accepts only master-channel OpenCode
The BuildingAI launcher SHALL start and accept only an OpenCode binary whose reported build version
identifies the `master` channel.

#### Scenario: Master binary is selected
- **WHEN** startup resolves an attested OpenCode binary whose version identifies the master channel
- **THEN** startup MAY continue to launch that binary

#### Scenario: Non-master binary is selected
- **WHEN** startup resolves an OpenCode binary whose version identifies any channel other than master
- **THEN** startup MUST fail before stopping or replacing the currently managed services
- **AND** the diagnostic MUST state that a master-channel runtime is required

### Requirement: Managed readiness verifies the served channel
The BuildingAI launcher SHALL verify that the OpenCode health endpoint reports a master-channel
version before declaring the managed runtime ready.

#### Scenario: Started process reports a non-master channel
- **WHEN** the selected binary launches but the health endpoint reports a non-master version
- **THEN** the launcher MUST NOT record or report the runtime as ready

#### Scenario: Existing process reports the master channel
- **WHEN** the existing process is healthy, Web-UI-compatible, binary-matched, and reports a master
  version
- **THEN** the launcher MAY reuse that process without restarting it
