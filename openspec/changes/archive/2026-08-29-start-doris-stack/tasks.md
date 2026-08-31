## 1. Launcher contract

- [x] 1.1 Add Doris workspace, Compose, frontend, MCP, enablement, and port environment defaults without changing existing defaults.
- [x] 1.2 Extend `start.sh` usage, argument parsing, target dispatch, status, logs, and stop/restart semantics with a `doris` target.

## 2. Doris lifecycle implementation

- [x] 2.1 Implement isolated Docker FE/BE start/stop ownership with readiness checks and actionable failure handling.
- [x] 2.2 Implement managed static knowledge-hub frontend start/stop with PID/log metadata and configurable port.
- [x] 2.3 Implement managed Doris MCP start/stop through the sibling launcher with configurable port, PID/log metadata, and `/live` readiness.
- [x] 2.4 Include opt-in Doris startup in the `all` target and keep optional startup non-fatal while explicit `doris` remains strict.
- [x] 2.5 Auto-start a stopped Colima Docker runtime when it is the active context, while leaving other Docker contexts user-controlled.

## 3. Verification and documentation

- [x] 3.1 Add shell contract tests covering syntax, target dispatch, opt-in behavior, configuration propagation, Docker runtime recovery, and ownership markers.
- [x] 3.2 Update `.env.example` and Chinese usage documentation with Doris commands, endpoints, and environment variables.
- [x] 3.3 Run shell tests, OpenSpec validation, and live Doris readiness checks when Docker and the sibling runtime are available.
