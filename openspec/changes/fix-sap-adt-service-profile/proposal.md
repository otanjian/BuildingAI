## Why

The local ADT MCP runtime is reachable and authenticated, but Bowi rejects every ADT tool call with `ADT service profile is disabled` because the local development environment does not enable the explicitly required shared ADT service profile. This makes the verified Mac ADT connection unusable through the intended `sap_*` tools.

### Why now

ADT connectivity has been verified end to end, so the remaining failure is a local configuration gap that should be fixed before users rely on Bowi for SAP operations.

## What Changes

- Enable the ADT service profile in the local development environment used by `start.sh`.
- Add a regression test proving that a configured local ADT profile permits the curated read-only ADT tools while the guard remains fail-closed when disabled.
- Document the distinction between the ADT upstream health check and the Bowi service-profile switch.

## Capabilities

### New Capabilities

- `sap-adt-service-profile`: Allow verified local Bowi sessions to invoke the configured ADT MCP service profile.

### Modified Capabilities

- None.

## Impact

- Root local environment configuration and API startup environment loading.
- Bowi SAP profile/adapter tests and local ADT tool execution.
- No SAP upstream code or credentials are changed.

## Non-goals

- Do not remove subject verification or capability checks.
- Do not expose SAP credentials, MCP session IDs, or ADT lock handles.
- Do not enable the shared service profile implicitly in production deployments.
