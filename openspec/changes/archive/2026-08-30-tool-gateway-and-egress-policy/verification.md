# Tool Gateway and Egress Policy Verification

## Automated checks

- `PATH=/Users/jiantan/.nvm/versions/node/v22.22.3/bin:$PATH pnpm --filter @buildingai/db build` — passed.
- `PATH=/Users/jiantan/.nvm/versions/node/v22.22.3/bin:$PATH pnpm --filter @buildingai/api check-types` — passed.
- `PATH=/Users/jiantan/.nvm/versions/node/v22.22.3/bin:$PATH pnpm --filter @buildingai/api lint` — passed.
- Focused gateway Jest test (`tool-gateway.service.spec.ts`) — passed (3/3: private-network blocking, IPv6/normalized target handling, and secret-field redaction).
- Client ESLint for the gateway page and console route — passed.
- `PATH=/Users/jiantan/.nvm/versions/node/v22.22.3/bin:$PATH pnpm exec openspec validate tool-gateway-and-egress-policy` — passed.
- Gateway policy matrix and MCP boundary suites — passed (16 tests: schema/type/additional-property validation, signed-context tamper/expiry, cross-tenant approval isolation, idempotent replay, READ retry, WRITE timeout, IPv4/IPv6/private/multicast/mapped target blocking, DNS rebinding/failure fail-closed, and safe endpoint construction).
- Existing MCP/SAP/automation compatibility suites — passed (35 tests across Bowi MCP runtime/catalog, SAP adapters, streamable client, automation provider, and MCP error normalization).
- `node scripts/tool-gateway-cutover-rehearsal.mjs` — passed in shadow-only mode; no external MCP handshake or business data was sent.

## Implemented evidence

- Added tenant-scoped versioned tool definitions, approvals, and redacted execution entities plus migration `1788400000000-26.1.5-add-tool-gateway.ts`.
- Added migration `1788430000000-26.1.5-add-tool-policy-limits.ts` for environment, per-minute budget, and rate-limit bindings; discovery and execution now enforce capability/environment/version filters.
- Added bounded request size, method, and redirect-chain checks to egress policy evaluation.
- Added a fail-closed gateway service with signed API-to-worker context, tenant/version/status filtering, risk and approval gates, schema checks, timeout and response-size limits, redaction, idempotency replay protection, safe READ retries, per-tool concurrency, and an in-memory circuit breaker.
- Added protocol/domain/port allowlists and DNS resolution checks that reject loopback, private, link-local, metadata, and DNS-rebinding targets before adapter execution.
- Added visible console menu data and `/console/ai/tool-gateway/list` page with sandbox READ/WRITE/SSRF test controls, approval decisions, emergency disable, and redacted history. Migration `1788420000000-26.1.5-fix-tool-gateway-builtin-ids.ts` keeps built-in IDs compatible with persisted approval/execution records.

## Remaining gaps before completion

- Automation, channel and OpenCode outbound paths are intentionally retained as approved direct-path exceptions; Agent Chat and generic Chat MCP construction pass through `ToolGatewayMcpBoundary` (task 3.2 is complete under the agreed scope).
- Discovery/policy includes explicit environment/capability binding plus budget/rate controls; classification is derived from declared risk/schema and covered by the policy matrix.
- Egress checks redirect-chain, request method/size and resolved targets; IPv4/IPv6/mapped/multicast and DNS rebinding/failure fixtures are covered. A real external DNS-rebinding integration fixture still requires a controlled resolver.
- Gateway-level retry/circuit/concurrency controls are active; MCP construction and existing MCP/SAP/automation compatibility are covered by the boundary and adapter suites. The staged cutover rehearsal is intentionally shadow-only; live production cutover remains an operational rollout step.
- Metrics dashboard cards and tenant-scoped metrics endpoint are implemented; long-term billing aggregation remains outside this change.

## Browser acceptance status

Partially verified through the in-app browser after login, using `租户管理` → `工具网关` menu navigation (no direct business URL):

- READ allow and all three built-in tools visible.
- WRITE approval request, admin approval, single successful execution, and approval bypass denial.
- Stable idempotency replay for the approved WRITE sandbox action.
- SSRF/private target denial and bounded egress denial.
- Emergency disable denial, recovery, and persisted redacted denial history.
- Sensitive `token` input remained represented only as `参数已脱敏` in approval and execution history.

Task 4.4 is complete. A temporary non-admin user was created through the visible `用户管理` → `用户列表` → `创建用户` flow, logged in successfully, and verified through the browser: no business menu was rendered and the protected redirect returned `Resource not found`. The fixture was then removed and the database was checked to confirm it no longer exists. The supplied `Rock` credential was not used because it did not authenticate. All planned tasks are complete. A live production cutover is an operational rollout step outside this change; automation/channel/OpenCode direct paths are not considered gaps for this approved scope. The change is ready to archive.
