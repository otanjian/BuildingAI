## Context

See `proposal.md` for motivation and `specs/sap-pyrfc-cross-platform-runtime/spec.md` for behavior. The private upstream currently runs from `integrations/sap-pyrfc-mcp/.venv`, but its scripts and probe assume Linux `.so` libraries and `LD_LIBRARY_PATH`. On this Apple Silicon workstation, Python is arm64 and PyPI publishes a matching PyRFC 3.3.1 wheel whose extension references `@rpath/libsapnwrfc.dylib` and `@rpath/libsapucum.dylib`. The licensed SDK is not installed and cannot be bundled by BuildingAI.

PyRFC 3.3.1 is the latest published compatible release and is now yanked because the upstream public project is unmaintained. The integration therefore needs an explicit pin and visible warning rather than an unconstrained dependency.

## Goals / Non-Goals

**Goals:**

- Make SDK discovery, installation, import, health, and diagnostics correct on Darwin and Linux.
- Fail before replacing an existing SDK when an input archive is for the wrong OS or native architecture.
- Make the ordinary setup path deterministic and testable without SAP credentials.
- Verify an optional real connection separately from local installation readiness.

**Non-Goals:**

- Managing SAP Support Portal authentication or accepting SAP license terms for the operator.
- Building universal or translated binaries from incompatible SDK artifacts.
- Changing Bowi authorization, RFC allowlists, or user credential ownership.

## Decisions

### Normalize SDK layout through one Python probe

Extend the existing SDK probe to select required library names from `sys.platform`, enumerate native architecture with platform tools, and return an explicit compatibility result. Shell installers and health status will call this probe instead of duplicating `.so`/`.dylib` assumptions.

Alternative: implement all checks in shell. Rejected because archive validation, health reporting, and automated tests would drift across scripts.

### Validate a staged SDK before replacing the active SDK

The SDK installer will extract or locate the candidate in a temporary directory, run the probe against that exact path, then replace `lib/nwrfcsdk` only after validation succeeds. It will write `.env.local-sdk` atomically after installation.

Alternative: continue copying first and checking later. Rejected because a bad macOS archive could destroy a working installation.

### Use the official wheel on macOS and source install on Linux

On Darwin, `install-pyrfc.sh` will perform an exact `pyrfc==3.3.1` wheel install, which selects the published Python/ARM-compatible artifact. On Linux it will retain the current SDK-backed source path and legacy patch. Both paths end with the same local verifier.

Alternative: build PyRFC from source everywhere. Rejected on macOS because a matching official binary exists and source builds add Xcode/Cython variability. An unconstrained `pip install pyrfc` is also rejected because the upstream is unmaintained and future resolution is not deterministic.

### Configure loader variables and repair the macOS rpath for a private SDK location

Start and verification scripts will prepend the SDK `lib` directory to `DYLD_LIBRARY_PATH` on Darwin and `LD_LIBRARY_PATH` on Linux. The PyRFC 3.3.1 wheel links SDK libraries through `@rpath`, but inspection and the official PyRFC installation guide confirm that its `LC_RPATH` is fixed to `/usr/local/sap/nwrfcsdk/lib`. Because BuildingAI deliberately installs the SDK below the private integration directory, the installer must use `install_name_tool` to replace that wheel rpath with the configured `SAPNWRFC_HOME/lib`. It must also normalize the SDK dylib IDs and dependent ICU references using SAP's published `paths_fix.sh` behavior before verifying the import.

Alternative: install all SDK files at `/usr/local/sap/nwrfcsdk`. Rejected because it requires administrator access, mutates global workstation state, and prevents isolated project installations. Relying only on `DYLD_LIBRARY_PATH` is rejected because it does not repair the wheel's declared private rpath and is unreliable across macOS process launch contexts.

### Separate local readiness from live SAP connectivity

Add a verification CLI with an offline default and an explicit live flag. The offline path is safe for setup and CI; the live path calls `RFC_PING` using existing redacted configuration behavior.

Alternative: make every install contact SAP. Rejected because SDK/Python correctness and network/authorization failures are independent layers.

## Risks / Trade-offs

- [PyRFC 3.3.1 is yanked and unmaintained] → Pin it exactly, document the status, keep the upstream process isolated, and do not broaden the RFC allowlist.
- [SAP SDK availability and licensing prevent fully automatic provisioning] → Require an operator-supplied official archive/directory and never commit SDK binaries.
- [Apple Silicon SDK availability varies by SAP patch level] → Detect architecture before install and report the exact mismatch; do not claim Rosetta as a transparent fix.
- [macOS loader behavior can differ between interactive shells and service processes] → Repair explicit rpaths, export paths in the service launcher, and verify through the same virtual-environment Python used by the service.
- [Existing Linux users depend on legacy mirror behavior] → Preserve it as an explicit development-only Linux path and cover Linux layout in tests.

## Migration Plan

1. Add failing unit/shell tests for Darwin/Linux layouts, architecture mismatch, and loader variables.
2. Implement the shared probe and cross-platform scripts.
3. On macOS, provision an operator-supplied official SDK and install the pinned wheel.
4. Run offline verification, restart the private upstream, then run health and live `RFC_PING` checks.
5. Roll back by restoring the previous scripts and removing only the generated `.env.local-sdk`, virtual-environment PyRFC package, and local SDK directory; ADT fallback remains available throughout.
