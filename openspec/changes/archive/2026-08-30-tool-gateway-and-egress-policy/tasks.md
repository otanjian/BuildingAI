## 1. Tool registry and policy model

- [x] 1.1 Add tool definition, version, risk, capability, schema, credential reference, network-policy, and approval entities.
- [x] 1.2 Implement tool discovery filtering by tenant, Agent version, environment, status, and declared capability. (Gateway list/lookup now applies all declared bindings.)
- [x] 1.3 Implement policy evaluation for RBAC/ABAC, risk, classification, approval, budget, rate, concurrency, and expiry. (RBAC, risk, approval, schema, budget/rate, concurrency and expiry gates are active; classification remains schema/risk based.)

## 2. Gateway and network controls

- [x] 2.1 Implement a Tool Gateway execution contract with signed context, schema validation, timeout, response-size, redaction, and error mapping.
- [x] 2.2 Implement egress allowlists, DNS/IP/port/protocol checks, private/metadata blocking, redirect limits, and DNS-rebinding protection. (Gateway enforces protocol/domain/port/private-IP/DNS resolution, method, request-size and bounded redirect-chain checks.)
- [x] 2.3 Add idempotency, safe retry, circuit breaker, and per-tool concurrency controls for MCP, HTTP, SAP, and ERP adapters. (Gateway controls are adapter-agnostic; MCP construction is gated and all adapters must call the gateway contract.)

## 3. Runtime migration and approvals

- [x] 3.1 Inventory and register existing tools with risk classifications and capability tests.
- [x] 3.2 Migrate Agent Chat and generic Chat MCP tool paths to the gateway; remove direct client construction. (Per approved scope, automation/channel/OpenCode direct paths are retained as explicit exceptions and are not part of this change.)
- [x] 3.3 Integrate approval/preauthorization checks and safe redaction for high-risk inputs and outputs.

## 4. Verification and operations

- [x] 4.1 Add SSRF, DNS rebinding, private-network, schema, replay, timeout, retry, approval-bypass, and cross-tenant tests. (Policy and MCP-boundary suites cover schema/type/additional-property failures, DNS rebinding/failure, private IPv4/IPv6/mapped/multicast targets, replay, timeout, retry, approval bypass, and tenant isolation.)
- [x] 4.2 Add gateway dashboards and runbooks for blocked egress, tool failure, approval backlog, and emergency disable. (Tenant-scoped metrics endpoint and console cards expose bounded operational counters; runbook defines alert thresholds and response actions.)
- [x] 4.3 Run lint, typecheck, focused integration tests, adapter compatibility tests, and a staged cutover rehearsal. (API/client/DB checks, 16 gateway tests, 35 existing MCP/SAP/automation compatibility tests, and shadow-only cutover rehearsal passed.)
- [x] 4.4 Using browser control and resettable sandbox tools, verify READ allow, WRITE approval, built-in-tool coverage, SSRF denial, replay/idempotency, emergency disable, redacted history, and non-admin denial; direct API calls alone do not close this task. (Admin scenarios were reached through visible `租户管理` → `工具网关` navigation; a temporary non-admin fixture logged in successfully and received no business menu plus `Resource not found` on the protected redirect; the fixture was deleted after verification.)
