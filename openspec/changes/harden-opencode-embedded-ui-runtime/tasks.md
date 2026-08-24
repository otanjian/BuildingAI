## 1. Runtime integrity contract

- [x] 1.1 Add a stable BuildingAI Web UI contract marker to the OpenCode application HTML
- [x] 1.2 Add failing launcher contract tests for binary marker validation, attestation mismatch,
      source drift, and served-HTML compatibility

## 2. Controlled build and launcher enforcement

- [x] 2.1 Implement deterministic OpenCode runtime-source fingerprinting and attestation validation
- [x] 2.2 Add a controlled single-platform build command that embeds the Web UI, validates the marker,
      and writes the attestation
- [x] 2.3 Gate OpenCode preflight and readiness on the verified binary and served Web UI before
      reporting the managed stack healthy

## 3. Recovery and verification

- [x] 3.1 Run shell regression tests, syntax checks, OpenSpec validation, and OpenCode embed-focused tests
- [x] 3.2 Build and attest the current OpenCode workspace, wait for active sessions to become idle, and
      restart the managed runtime
- [x] 3.3 Browser-verify the representative BuildingAI embed omits both duplicate shell areas and the
      direct OpenCode route retains its normal shell
- [x] 3.4 Record binary/source fingerprints and fresh verification evidence while preserving unrelated
      working-tree changes
