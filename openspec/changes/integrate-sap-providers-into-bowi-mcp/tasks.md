## 1. Bowi SAP Security Model

- [x] 1.1 Add granular SAP capabilities to Bowi assertions and managed OpenCode principal resolution with production-safe defaults
- [x] 1.2 Add tests for SAP capability parsing, publish/anonymous rejection, and stable tool authorization failures
- [x] 1.3 Implement subject-bound SAP profile resolution from personal parameters and explicitly enabled service configuration, with redaction tests
- [x] 1.4 Preserve compatibility with existing composite SAP connection personal parameters and PyRFC parsing tests

## 2. Upstream MCP Adapters

- [x] 2.1 Implement a bounded Streamable HTTP JSON-RPC client with initialization, session propagation, timeout, call, and close behavior covered by tests
- [x] 2.2 Implement the ADT adapter with explicit Bowi-to-upstream mappings, per-call client isolation, and sanitized error mapping
- [x] 2.3 Implement the PyRFC adapter with subject/profile-scoped hidden leases, per-lease serialization, allowlisted RFC validation, expiry, disconnect, and no write retry
- [x] 2.4 Add adapter tests for concurrent subject isolation, hidden connection IDs, expired-handle recovery, timeout cleanup, and RFC allowlist enforcement

## 3. Bowi SAP Provider

- [x] 3.1 Add the curated SAP provider schemas, capability annotations, and routing for health/read/RFC/write/transport operations
- [x] 3.2 Register the SAP provider in Bowi without changing Todo or dynamically discovered EHCS behavior
- [x] 3.3 Add structured redacted SAP audit logging and stable SAP error codes to Bowi tool results
- [x] 3.4 Add registry/runtime/catalog tests proving approved discovery, capability denial before upstream calls, secret rejection, and sanitized failures
- [x] 3.5 Keep ADT lock handles internal by making source update a same-session lock/write/unlock operation with failure cleanup tests

## 4. Transport and OpenCode Migration

- [x] 4.1 Change SAP ADT startup to pinned stateful Streamable HTTP with session timeout and health endpoint, and update local documentation/config examples
- [x] 4.2 Add a repeatable two-session ADT transport smoke test that detects initialization crashes and response cross-talk
- [x] 4.3 Consolidate the managed and local OpenCode SAP catalog onto `bowi-mcp`, leaving direct SAP servers disabled as administrator diagnostics
- [x] 4.4 Update deployment environment examples and operator documentation for upstream URLs, profile modes, capability grants, timeouts, and RFC allowlist
- [x] 4.5 Expose Todo schemas to trusted OpenCode discovery, then add and validate usage rules for Bowi Todo/SAP routing and correct direct ADT/PyRFC diagnostic lifecycles
- [x] 4.6 Remove direct `sap-abap` and `sap-pyrfc` registrations from ordinary OpenCode configuration while retaining their upstream runtimes

## 5. Verification

- [x] 5.1 Run focused Bowi, SAP provider, adapter, assertion, and principal tests
- [x] 5.2 Run SAP PyRFC tests and shell syntax checks for integration startup scripts
- [x] 5.3 Run API typecheck/lint and OpenSpec strict validation, documenting any unrelated pre-existing failures
- [x] 5.4 Perform live Bowi `initialize`, `tools/list`, and authorized/unauthorized SAP tool smoke checks without destructive SAP calls
