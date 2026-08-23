## 1. Regression Coverage

- [x] 1.1 Add a shell contract test that requires foreground startup to clear obsolete development PID metadata after the detached-mode branch.
- [x] 1.2 Run the new test against the current script and confirm it fails for the missing cleanup behavior.

## 2. Startup Script Fix

- [x] 2.1 Add non-signaling development PID metadata cleanup and invoke it only for foreground startup.
- [x] 2.2 Run shell syntax checks and all focused `start.sh` contract tests.

## 3. Live Verification

- [x] 3.1 Remove the reproduced obsolete PID metadata through the new behavior and confirm `./start.sh status` no longer reports a stale development PID while all service ports remain healthy.
- [x] 3.2 Validate the OpenSpec change and record completion status.
