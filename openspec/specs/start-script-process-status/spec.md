# start-script-process-status Specification

## Purpose
Ensure the local development orchestrator reports process metadata that matches the active startup mode and never presents obsolete detached-run metadata as current foreground state.
## Requirements
### Requirement: Foreground startup clears detached development PID metadata

The development orchestrator SHALL remove existing development-stack PID metadata before it replaces itself with the foreground development command.

#### Scenario: Foreground start follows a detached run

- **GIVEN** a development PID file remains from an earlier detached startup
- **WHEN** the operator starts the development stack in foreground mode
- **THEN** the obsolete development PID file is removed before the foreground command runs
- **AND** a later status check does not report that obsolete PID as the active development process

#### Scenario: Detached startup retains PID tracking

- **GIVEN** the operator requests detached development startup
- **WHEN** the detached development services are launched
- **THEN** the orchestrator records the detached process manager PID for status and stop operations

### Requirement: PID cleanup is limited to metadata

The development orchestrator MUST NOT terminate an unrelated process solely because its numeric PID appears in an obsolete development PID file during foreground startup.

#### Scenario: Obsolete PID was reused

- **GIVEN** the development PID file names a running process that is unrelated to the managed development stack
- **WHEN** foreground startup begins
- **THEN** the orchestrator removes the obsolete metadata without signaling that process

