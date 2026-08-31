## 1. Cross-platform probe tests

- [x] 1.1 Add unit tests for Linux `.so` and macOS `.dylib` SDK layouts, missing libraries, and architecture compatibility diagnostics.
- [x] 1.2 Add shell-level tests for Darwin/Linux loader variable selection and installer rejection of a mismatched SDK before replacement.

## 2. SDK and PyRFC installation

- [x] 2.1 Extend the SDK probe with platform-specific library names, host/Python/library architecture reporting, and a machine-readable readiness result.
- [x] 2.2 Update `install-nwrfcsdk.sh` to validate staged official archives/directories cross-platform, preserve existing installs on failure, and configure the generated SDK environment.
- [x] 2.3 Update `install-pyrfc.sh` to install pinned PyRFC 3.3.1 from the official macOS wheel, repair its private SDK rpath, preserve the Linux source/legacy path, and verify `pyrfc.Connection` import.
- [x] 2.4 Add tests for automatic native Linux, native macOS ARM64, and macOS x86_64/Rosetta runtime profile selection.
- [x] 2.5 Accept an Intel macOS SDK on Apple Silicon when Rosetta and a compatible x86_64 Python are available, recording the selected runtime without deleting existing environments.
- [x] 2.6 Install the architecture-specific macOS PyRFC pin (`3.3.1` ARM64 or `3.3` x86_64) while preserving the Linux source-build path.

## 3. Runtime and operator verification

- [x] 3.1 Configure the correct dynamic-library environment in the service launcher and Python bootstrap for macOS and Linux.
- [x] 3.2 Add an offline-by-default verifier with an optional redacted live `RFC_PING` check, and expose its result in actionable health diagnostics.
- [x] 3.3 Update requirements and operator documentation for official macOS SDK acquisition, Apple Silicon setup, limitations, and troubleshooting.
- [x] 3.4 Make service startup and verification automatically execute the recorded native or Rosetta Python runtime and report the selected profile.
- [x] 3.5 Document the two supported macOS profiles and retained Linux behavior.

## 4. End-to-end verification

- [x] 4.1 Run unit and shell tests, syntax checks, and strict OpenSpec validation.
- [x] 4.2 Provision the supplied Intel macOS SDK on this Apple Silicon Mac, install PyRFC in the isolated Rosetta virtual environment, and pass offline verification.
- [x] 4.3 Restart the private upstream and verify Bowi health plus a live `RFC_PING` without exposing credentials.
