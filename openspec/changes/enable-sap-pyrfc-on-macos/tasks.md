## 1. Cross-platform probe tests

- [x] 1.1 Add unit tests for Linux `.so` and macOS `.dylib` SDK layouts, missing libraries, and architecture compatibility diagnostics.
- [x] 1.2 Add shell-level tests for Darwin/Linux loader variable selection and installer rejection of a mismatched SDK before replacement.

## 2. SDK and PyRFC installation

- [x] 2.1 Extend the SDK probe with platform-specific library names, host/Python/library architecture reporting, and a machine-readable readiness result.
- [x] 2.2 Update `install-nwrfcsdk.sh` to validate staged official archives/directories cross-platform, preserve existing installs on failure, and configure the generated SDK environment.
- [x] 2.3 Update `install-pyrfc.sh` to install pinned PyRFC 3.3.1 from the official macOS wheel, repair its private SDK rpath, preserve the Linux source/legacy path, and verify `pyrfc.Connection` import.

## 3. Runtime and operator verification

- [x] 3.1 Configure the correct dynamic-library environment in the service launcher and Python bootstrap for macOS and Linux.
- [x] 3.2 Add an offline-by-default verifier with an optional redacted live `RFC_PING` check, and expose its result in actionable health diagnostics.
- [x] 3.3 Update requirements and operator documentation for official macOS SDK acquisition, Apple Silicon setup, limitations, and troubleshooting.

## 4. End-to-end verification

- [x] 4.1 Run unit and shell tests, syntax checks, and strict OpenSpec validation.
- [ ] 4.2 Provision the matching SDK on this Mac, install PyRFC in the managed virtual environment, and pass offline verification.
- [ ] 4.3 Restart the private upstream and verify Bowi health plus a live `RFC_PING` without exposing credentials.
