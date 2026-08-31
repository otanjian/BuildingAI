# Tool Gateway operations runbook

## Dashboard and alert signals

The `工具网关` console dashboard reads the tenant-scoped `/consoleapi/tool-gateway/metrics` endpoint. It exposes a bounded 5,000-event sample with `byOutcome`, `blockedEgress`, `toolFailures`, `approvalBacklog`, the oldest pending approval timestamp, and the emergency-disabled flag. The UI cards are operational indicators, not billing totals; reconcile long-term cost and usage from the audit warehouse.

Recommended alerts:

- `blockedEgress > 0`: page security on-call, inspect the denial reason and resolved target, and do not widen an allowlist without review.
- `toolFailures > 5` in a rolling window or `CIRCUIT_OPEN`: page the owning integration team and keep the tool disabled until the dependency is healthy.
- `approvalBacklog > 20` or oldest pending approval older than 15 minutes: notify the approver group and check for stuck workflows.
- `emergencyDisabled = true`: page the platform owner; after recovery, verify each tool status and policy version.

Metrics are tenant-scoped and contain no raw credentials or unrestricted request/response payloads.

## Blocked egress

Inspect `tool_gateway_executions.denial_reason` and the redacted input. `SSRF_PRIVATE_TARGET`, `SSRF_RESOLVED_PRIVATE_TARGET`, `SSRF_DNS_REBINDING`, `SSRF_DNS_RESOLUTION_FAILED`, and `EGRESS_NOT_ALLOWLISTED` are fail-closed outcomes. Verify the DNS answer and update the tool's protected network policy only after security review.

## Tool failures

READ tools may retry within their declared limit. A tool that fails five times opens its circuit for 30 seconds. WRITE and DESTRUCTIVE tools never retry automatically.

## Approval backlog

Review pending records in the browser's `工具网关` page. Approvals expire after five minutes and are bound to a parameter digest; changing input invalidates the approval.

## Emergency disable

Use `紧急禁用` in the browser console. It denies new gateway calls while preserving redacted history.解除后仍需 verify the individual tool status and policy version.

## Staged cutover rehearsal

Run `node scripts/tool-gateway-cutover-rehearsal.mjs` during deployment rehearsal. The script is shadow-only: it validates the candidate public endpoint and emits `candidate` followed by `ready-for-adapter-handshake`; it never opens an MCP session or sends business data. Set `TOOL_GATEWAY_REHEARSAL_URL` to a controlled public test endpoint. Any invalid, local, or `.invalid` endpoint must produce a `blocked` result and a non-zero exit. Promote adapters in this order: shadow decisions → READ traffic → approved WRITE traffic → rollback to gateway denial on any policy mismatch.
