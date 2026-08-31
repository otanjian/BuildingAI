## Purpose

Ensures the BuildingAI-managed OpenCode process serves the locally compatible embedded Web UI and
cannot be accepted as ready when its executable or browser assets have silently drifted.

## ADDED Requirements

### Requirement: Managed runtime proves the BuildingAI Web UI contract

The managed OpenCode runtime SHALL expose an explicit, stable BuildingAI Web UI contract marker in
the HTML it serves, and BuildingAI MUST require that marker in addition to the health response and
version before considering OpenCode ready.

#### Scenario: Compatible embedded Web UI is served

- **GIVEN** the OpenCode health endpoint reports the expected version
- **WHEN** the root Web UI HTML also carries the expected BuildingAI contract marker
- **THEN** the launcher may consider the managed OpenCode runtime ready

#### Scenario: Runtime falls back to the upstream Web UI

- **GIVEN** the OpenCode health endpoint is healthy and reports the expected version
- **WHEN** the root Web UI HTML does not carry the expected BuildingAI contract marker
- **THEN** the launcher MUST NOT report OpenCode as ready
- **AND** it MUST identify the incompatible Web UI as the failure

### Requirement: Managed binary is validated before launch

BuildingAI MUST reject a managed OpenCode executable before launch when it does not contain the
required embedded Web UI contract or when its recorded binary and source fingerprints do not match
the executable and current runtime source.

#### Scenario: Binary was rebuilt without the embedded Web UI

- **WHEN** the selected OpenCode executable does not contain the BuildingAI contract marker
- **THEN** startup MUST stop before replacing a compatible running process
- **AND** the diagnostic MUST provide the controlled rebuild command

#### Scenario: Binary was replaced after validation

- **GIVEN** a controlled build recorded the executable fingerprint
- **WHEN** the selected executable fingerprint differs from that record
- **THEN** startup MUST reject the executable as unverified

#### Scenario: Runtime source changed after the build

- **GIVEN** a controlled build recorded the relevant OpenCode runtime-source fingerprint
- **WHEN** the current source fingerprint differs from that record
- **THEN** startup MUST reject the executable as stale

#### Scenario: Different binary reports the same version

- **GIVEN** a healthy managed process and a selected replacement executable report the same version
- **WHEN** the selected executable fingerprint differs from the fingerprint recorded for the process
- **THEN** startup MUST replace the process with the selected verified executable

#### Scenario: Selected binary is already running

- **GIVEN** health, Web UI compatibility, reported version, and the active binary fingerprint match
- **WHEN** startup is invoked again
- **THEN** the launcher MUST reuse the existing process without changing its PID

### Requirement: Controlled builds embed and attest the current Web UI

The repository SHALL provide a controlled OpenCode build path that cannot request omission of the
embedded Web UI, validates the resulting executable contract, and records the executable and source
fingerprints consumed by startup.

#### Scenario: Controlled build succeeds

- **WHEN** a developer builds the managed OpenCode runtime through the controlled path
- **THEN** the resulting executable MUST contain the BuildingAI Web UI contract marker
- **AND** its attestation MUST identify the executable fingerprint and current source fingerprint

#### Scenario: Build output lacks the contract marker

- **WHEN** a build completes but its executable does not contain the BuildingAI contract marker
- **THEN** the controlled build MUST fail without publishing a valid attestation
