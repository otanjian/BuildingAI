## Why

The SAP PyRFC integration can start on macOS but its installation, SDK discovery, and health checks assume Linux library names and environment variables, leaving RFC/BAPI tools unavailable on Mac. This blocks local BuildingAI users from using the same SAP business path that works on supported Linux deployments.

### Why now

BuildingAI now routes normal SAP work through Bowi MCP, so a Mac development workstation must be able to provision and verify its private PyRFC upstream instead of silently falling back to the more limited ADT backend.

## What Changes

- Add a cross-platform SAP NW RFC SDK installer that accepts an official SDK archive or directory for the current operating system and architecture.
- Install the official prebuilt PyRFC wheel on macOS while retaining source-build support on Linux and legacy-SDK compatibility where applicable.
- Detect both macOS `.dylib` and Linux `.so` SDK layouts and report actionable platform/architecture diagnostics.
- Configure the correct runtime library search path on macOS and Linux before importing or starting PyRFC.
- Add a repeatable verification command that checks the SDK, PyRFC import, native library architecture, and optional live `RFC_PING`.
- Document supported macOS setup, including the requirement to obtain SAP's licensed NW RFC SDK separately.

### Non-goals

- Redistributing SAP NW RFC SDK binaries or credentials.
- Expanding the RFC allowlist or changing SAP authorization policy.
- Replacing the ADT fallback or combining the ADT and PyRFC processes.
- Promising compatibility for an SDK whose native architecture does not match the selected Python runtime.

## Capabilities

### New Capabilities

- `sap-pyrfc-cross-platform-runtime`: Provision, diagnose, and run the SAP PyRFC upstream on supported macOS and Linux hosts.

### Modified Capabilities

None.

## Impact

This affects the scripts, Python SDK probe, tests, dependency declaration, and operator documentation under `integrations/sap-pyrfc-mcp`. The Bowi MCP API and model-visible SAP tool contracts remain unchanged. Operators must still supply a licensed SAP NW RFC SDK build matching their host operating system and architecture.
