## ADDED Requirements

### Requirement: Healthy managed services are reusable

Normal startup MUST reuse a PM2-managed service when its recorded process is alive and its existing readiness endpoint succeeds.

#### Scenario: Doris services are already healthy

- **WHEN** `START_DORIS=true` and `doris-web` or `doris-mcp` is already healthy under PM2
- **THEN** startup MUST continue without reporting that its port is externally busy
- **AND** startup MUST preserve the existing process

#### Scenario: Detached dev services are already healthy

- **WHEN** `./start.sh -d` finds healthy PM2 API and web processes and their API/proxy probes succeed
- **THEN** startup MUST continue without freeing ports or replacing those processes

### Requirement: Force and unhealthy paths retain replacement behavior

Force/restart startup MUST remain able to free managed ports, and an unhealthy or missing managed process MUST fall through to the existing launch path.

#### Scenario: Force restart is requested

- **WHEN** startup is invoked with force/restart semantics
- **THEN** it MUST NOT reuse the managed process solely because it is healthy
