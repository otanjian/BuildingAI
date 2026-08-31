## Purpose

Keep local API and web startup behavior predictable when developers use non-default ports through
the shell environment or root `.env` file.

## ADDED Requirements

### Requirement: Honor configured development ports

The local launcher MUST load `SERVER_PORT` and `CLIENT_DEV_PORT` from the environment and use those
values for managed API/web processes, readiness checks, port cleanup, status output, and displayed
local URLs. When unset, it MUST retain API port `4090` and web port `4091`.

#### Scenario: Custom ports are configured

- **WHEN** `SERVER_PORT=4190` and `CLIENT_DEV_PORT=4191` are provided before startup
- **THEN** the launcher manages ports `4190` and `4191`
- **AND** readiness and status checks target those same ports

#### Scenario: Defaults are used

- **WHEN** neither port variable is configured
- **THEN** the launcher uses API port `4090` and web port `4091`
- **AND** its displayed URLs use those default ports
