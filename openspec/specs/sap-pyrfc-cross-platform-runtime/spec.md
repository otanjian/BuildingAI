# sap-pyrfc-cross-platform-runtime Specification

## Purpose
Enable operators to provision and verify the private SAP PyRFC upstream on supported macOS and Linux hosts without weakening SDK licensing, native architecture, or connection checks.
## Requirements
### Requirement: Host-compatible SDK provisioning
The SAP PyRFC integration SHALL accept an operator-supplied SAP NW RFC SDK archive or directory only when it contains the required header and runtime libraries for the host operating system. It MUST reject an SDK with missing runtime libraries or a native architecture incompatible with the selected Python runtime, and it MUST NOT download or redistribute licensed SAP binaries implicitly.

#### Scenario: Provision a compatible macOS SDK
- **GIVEN** an operator has an official macOS SAP NW RFC SDK containing the required `.dylib` libraries and header
- **WHEN** the operator provisions the SDK on a matching macOS host
- **THEN** the integration records the local SDK home and reports the SDK as present and compatible

#### Scenario: Reject a Linux SDK on macOS
- **GIVEN** an SDK directory contains Linux `.so` libraries
- **WHEN** the operator attempts to provision it on macOS
- **THEN** provisioning fails with an actionable operating-system mismatch message before changing the active SDK installation

#### Scenario: Reject an architecture mismatch
- **GIVEN** the SDK libraries do not contain the Python runtime's native architecture
- **WHEN** the operator verifies or provisions the SDK
- **THEN** the integration reports both detected architectures and instructs the operator to obtain a matching SDK or select a matching Python runtime

#### Scenario: Select an Intel SDK on Apple Silicon
- **GIVEN** an Apple Silicon host, Rosetta, a compatible x86_64 Python, and an Intel macOS SAP NW RFC SDK
- **WHEN** the operator provisions the SDK
- **THEN** the integration selects an isolated x86_64 runtime instead of rejecting the SDK or replacing the native managed environment

#### Scenario: Preserve Linux support
- **GIVEN** a supported Linux host and Linux SAP NW RFC SDK
- **WHEN** the operator provisions and starts the integration
- **THEN** the integration retains the existing Linux SDK-backed source-build path and does not depend on macOS runtime selection

### Requirement: Platform-specific PyRFC installation
The integration SHALL install a compatible pinned PyRFC release in its managed virtual environment using a prebuilt wheel on macOS and an SDK-backed build on Linux. Installation MUST finish by importing `pyrfc.Connection` with the provisioned SDK available; a package metadata entry alone MUST NOT count as success.

#### Scenario: Install on Apple Silicon
- **GIVEN** Python and the SDK are compatible Apple Silicon builds
- **WHEN** the operator runs the PyRFC installer on macOS
- **THEN** the installer selects a macOS ARM wheel and verifies that `pyrfc.Connection` imports successfully

#### Scenario: Install for an Intel macOS SDK
- **GIVEN** an Intel macOS SDK selected on an Apple Silicon host
- **WHEN** the operator runs the PyRFC installer
- **THEN** the installer creates or reuses a separate Rosetta x86_64 virtual environment, installs the pinned macOS x86_64 PyRFC wheel, repairs its private SDK rpath, and verifies `pyrfc.Connection`

#### Scenario: Native library load fails
- **GIVEN** the Python package is present but an SDK library cannot be loaded
- **WHEN** installation verification runs
- **THEN** the command exits unsuccessfully and identifies the missing or incompatible native library

### Requirement: Cross-platform runtime loading
The SAP PyRFC service SHALL configure the host-appropriate native library search path before importing PyRFC and SHALL preserve ADT fallback behavior when PyRFC is unavailable.

#### Scenario: Start on macOS with PyRFC
- **GIVEN** a compatible SDK and PyRFC wheel are installed
- **WHEN** the SAP PyRFC service starts on macOS
- **THEN** health status reports `pyrfc_installed` as true, the SDK as present, and selects PyRFC for an RFC-configured connection

#### Scenario: Automatically launch the selected architecture
- **GIVEN** the configured SDK was provisioned for a supported native or Rosetta runtime
- **WHEN** installation, verification, or service startup runs
- **THEN** every Python process uses the recorded compatible architecture and virtual environment without an operator-supplied `arch` prefix

#### Scenario: Start without an SDK
- **GIVEN** no compatible SDK is configured
- **WHEN** the service starts with an ADT profile
- **THEN** the service remains available through ADT and health status reports why PyRFC is unavailable

### Requirement: Operator verification
The integration SHALL provide a non-secret verification command that checks the selected Python executable, host and Python architecture, SDK layout and architecture, PyRFC import, and resolved native libraries. When connection credentials are explicitly requested, it SHALL also perform a live RFC ping without printing passwords.

#### Scenario: Offline verification succeeds
- **GIVEN** a compatible SDK and PyRFC installation
- **WHEN** the operator runs verification without a live connection option
- **THEN** the command exits successfully and reports every local prerequisite as ready without contacting SAP

#### Scenario: Live verification succeeds
- **GIVEN** local prerequisites and valid RFC credentials are configured
- **WHEN** the operator requests live verification
- **THEN** the command invokes `RFC_PING`, reports connectivity, redacts secrets, and exits successfully

