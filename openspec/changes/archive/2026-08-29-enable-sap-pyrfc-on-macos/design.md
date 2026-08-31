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
- Building universal binaries or translating SAP SDK binaries.
- Changing Bowi authorization, RFC allowlists, or user credential ownership.

## Decisions

### Normalize SDK layout through one Python probe

Extend the existing SDK probe to select required library names from `sys.platform`, enumerate native architecture with platform tools, and return an explicit compatibility result. Shell installers and health status will call this probe instead of duplicating `.so`/`.dylib` assumptions.

Alternative: implement all checks in shell. Rejected because archive validation, health reporting, and automated tests would drift across scripts.

### Validate a staged SDK before replacing the active SDK

The SDK installer will extract or locate the candidate in a temporary directory, run the probe against that exact path, then replace `lib/nwrfcsdk` only after validation succeeds. It will write `.env.local-sdk` atomically after installation.

Alternative: continue copying first and checking later. Rejected because a bad macOS archive could destroy a working installation.

### Select a runtime profile from the SDK before creating the virtual environment

The installer records a runtime profile alongside `SAPNWRFC_HOME`. Linux selects the native host architecture and keeps `.venv`. macOS selects native ARM64 when the SDK contains ARM64; when an Apple Silicon host receives an x86_64-only macOS SDK, it requires Rosetta and an x86_64-capable Python, then selects `.venv-x86_64`. Existing virtual environments are retained so provisioning one profile does not erase another platform path.

Alternative: validate every SDK against whichever Python happens to run the installer. Rejected because it incorrectly rejects a usable Intel macOS SDK on Apple Silicon and makes service startup depend on the caller's shell architecture.

### Use architecture-specific official wheels on macOS and source install on Linux

On Darwin ARM64, `install-pyrfc.sh` performs an exact `pyrfc==3.3.1` wheel install. On Darwin x86_64 it installs `pyrfc==3.3`, the newest release that publishes a matching Intel macOS wheel. On Linux it retains the current SDK-backed source path and legacy patch. All paths end with the same local verifier running under the selected architecture.

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
- [Apple Silicon SDK availability varies by SAP patch level] → Prefer a native matching SDK; when only an Intel macOS SDK is supplied, make Rosetta selection explicit in health and verification output and keep it isolated from the native environment.
- [PyRFC 3.3.1 has no Intel macOS wheel] → Pin the Intel profile to PyRFC 3.3 and test the selected wheel tag and native import; do not fall back to an incompatible ARM wheel.
- [macOS loader behavior can differ between interactive shells and service processes] → Repair explicit rpaths, export paths in the service launcher, and verify through the same virtual-environment Python used by the service.
- [Existing Linux users depend on legacy mirror behavior] → Preserve it as an explicit development-only Linux path and cover Linux layout in tests.

## Migration Plan

1. Add failing unit/shell tests for Darwin/Linux layouts, architecture mismatch, and loader variables.
2. Implement the shared probe and cross-platform scripts.
3. On macOS, provision an operator-supplied SDK, record the selected native or Rosetta profile, and install the architecture-specific pinned wheel.
4. Run offline verification, restart the private upstream, then run health and live `RFC_PING` checks.
5. Roll back by restoring the previous scripts and removing only the generated `.env.local-sdk`, virtual-environment PyRFC package, and local SDK directory; ADT fallback remains available throughout.
