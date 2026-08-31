## Context

The target agent already binds the Doris and Bowi MCP server records. Doris exposes domain-level tools whose child capabilities are filtered by runtime version, privileges, and optional providers. The agent prompt is the existing configuration surface for enforcing tool-selection and fallback behavior.

## Goals / Non-Goals

**Goals:**

- Make the agent inspect capability manifests before child calls.
- Prevent retries and fabricated metrics when a child is unavailable.
- Keep the existing server bindings and Bowi todo workflow intact.
- Apply the fix in BuildingAI configuration only.

**Non-Goals:**

- Enabling Doris semantic/Ossie, MetricFlow, ADBC, or privileged cluster features.
- Changing Doris source files, environment files, grants, schemas, or data.
- Adding a second data source or inventing a client-side semantic model.

## Decisions

1. **Use the agent role prompt as the policy surface.** The current MCP integration already exposes domain manifests and reads the agent configuration from PostgreSQL; a prompt policy is the smallest durable change and avoids changing the shared MCP client for one agent.
2. **Discover before invoking.** The prompt will require empty-argument manifest discovery and `callable=true` filtering, including the manifest version returned by Doris.
3. **Treat provider and probe errors as capability states.** `PROVIDER_NOT_CONFIGURED`, `PROBE_PERMISSION_DENIED`, `DORIS_VERSION_UNKNOWN`, and `CHILD_CAPABILITY_UNAVAILABLE` will be reported and will not be confused with empty query results.
4. **Prefer the existing query path.** Accessible `sap_*` catalog and read-only query tools remain the fallback; semantic views are used only when visible to the configured Doris user.

## Risks / Trade-offs

- [Risk] Doris capabilities or error codes change → Mitigation: require fresh manifest discovery on every analysis turn and report unknown states instead of guessing.
- [Risk] Prompt-only policy can be ignored by a model → Mitigation: keep the policy explicit, ordered, and tied to observable error handling; verify with an agent smoke run.
- [Risk] Current Doris privileges remain insufficient for some analytics → Mitigation: report the exact unavailable dimensions and leave privilege changes to an explicitly authorized Doris change.

## Migration Plan

Update the target agent's role prompt in the BuildingAI PostgreSQL configuration, then run a fresh agent request and a direct MCP manifest/query smoke test. Rollback is a single database update restoring the previous prompt text.

## Verification Record

The live Doris manifest contains 8 domains and 55 child capabilities: 13 are callable and 42 are unavailable. The unavailable set is 21 version-gated (`DORIS_VERSION_UNKNOWN`), 7 probe/privilege-gated (`PROBE_PERMISSION_DENIED`), and 14 optional-provider capabilities (`PROVIDER_NOT_CONFIGURED`, including 12 semantic/MetricFlow and 2 ADBC children). BuildingAI has 0 missing server bindings for the target agent; it retains 23 Bowi tools and 8 Doris domain tools. A read-only `doris_query.execute_query` smoke query returned `connectivity_check = 1`.
