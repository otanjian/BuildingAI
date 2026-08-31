# doris-local-stack Specification

## Purpose
Provide one predictable local lifecycle for the Doris database, its knowledge-hub frontend, and its read-only MCP endpoint so developers can start, inspect, and stop the complete Doris stack from the Bowi AI launcher.
## Requirements
### Requirement: Doris stack is an explicit launcher target

The launcher MUST expose a `doris` target for start, restart, stop, status, and logs operations. The existing default target MUST remain unchanged unless Doris startup is explicitly enabled.

#### Scenario: Start Doris target

- **WHEN** a developer runs `./start.sh start doris` with Doris enabled and its sibling workspace available
- **THEN** the launcher starts the Doris FE/BE services, knowledge-hub frontend, and Doris MCP server

#### Scenario: Existing default startup remains compatible

- **WHEN** a developer runs `./start.sh start` without Doris enablement
- **THEN** the launcher does not start Doris services or require the sibling Doris workspace

### Requirement: Doris components have independent lifecycle ownership

The launcher MUST record and stop only Doris components started by the launcher, including the Docker Compose services, frontend process, and MCP process. Stopping Doris MUST NOT stop Bowi AI, OpenCode, SAP MCP, or externally managed containers.

#### Scenario: Stop Doris target

- **WHEN** a developer runs `./start.sh stop doris`
- **THEN** only launcher-managed Doris processes and the Doris FE/BE Compose services are stopped

#### Scenario: Restart Doris target

- **WHEN** a developer runs `./start.sh restart doris`
- **THEN** the old launcher-managed Doris components are stopped before the new Doris components start

### Requirement: Doris readiness is observable

The launcher MUST wait for Doris FE/BE readiness before declaring the database ready, MUST wait for the MCP `/live` endpoint before declaring MCP ready, and MUST report the knowledge-hub frontend URL and its listening state.

#### Scenario: Healthy Doris startup

- **WHEN** all Doris services become ready within the configured timeout
- **THEN** the launcher reports the FE/BE, frontend, and MCP endpoints as ready

#### Scenario: Doris startup failure

- **WHEN** a required Doris component does not become ready within its timeout
- **THEN** the launcher reports which component failed and points to its log without claiming the Doris stack is ready

### Requirement: Doris settings are configurable

The launcher MUST support environment overrides for the sibling Doris workspace, Docker Compose file, knowledge-hub frontend port, Doris MCP port, and whether the Doris target participates in the `all` target.

#### Scenario: Custom local ports

- **WHEN** a developer sets the Doris frontend and MCP port overrides
- **THEN** the launcher uses those ports for process startup, readiness checks, status output, and stop cleanup
