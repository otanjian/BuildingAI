## Context

The personal Todo domain already enforces creator-or-assignee visibility, role-based mutations, optimistic concurrency, and lifecycle normalization in `PersonalTodoService`. The existing Bowi MCP runtime and catalog are hosted by the EHCS extension, while the main API owns users, agents, conversations, MCP server records, and Todo. OpenCode caches MCP tool definitions per client connection and currently calls MCP tools without BuildingAI session metadata.

The implementation must coexist with a dirty monorepo and multiple active OpenCode changes, so it will add narrow integration points and preserve existing EHCS behavior.

## Goals / Non-Goals

**Goals:**

- Make the main API the owner of the first-party Bowi Todo MCP endpoint.
- Keep the catalog stable while authorizing each `tools/call` against a verified subject.
- Reuse the Todo service instead of duplicating access rules.
- Support managed OpenCode without model-visible identity fields.
- Leave a registry contract that later business providers can adopt.

**Non-Goals:**

- General third-party MCP authentication or OAuth.
- Per-user `tools/list` responses.
- Moving EHCS execution into the main API now.
- Persisting full tool inputs or Todo content in a new audit store.

## Decisions

### Main API owns a stateless Bowi Todo MCP endpoint

Add `BowiMcpModule` in the main API with a stateless HTTP controller and runtime service supporting `initialize`, `notifications/initialized`, `ping`, `tools/list`, and `tools/call`. The current repository uses a compact JSON-RPC runtime for EHCS; the main endpoint will follow that tested contract rather than introduce stateful SDK transport lifecycle in the same change. Protocol parsing remains isolated so it can be replaced by the official transport later.

Alternative: proxy the EHCS endpoint. Rejected because the extension does not own Todo or platform identity and a proxy would make it the accidental security boundary.

### Separate client authentication from Todo subject resolution

The endpoint accepts one of two first-party client credentials:

1. a managed OpenCode key plus `_meta.buildingai.sessionId`; or
2. a short-lived HMAC invocation assertion injected by the platform for a verified login-origin turn.

`tools/list` requires a valid client credential but no subject. `tools/call` additionally requires a verified personal subject. Publish/site/anonymous provenance is not eligible. The assertion is scoped to Bowi, expires quickly, and is never stored in the MCP server record.

Alternative: accept `userId` as a tool argument. Rejected because the model could forge it and published agents can operationally map to their creator.

### OpenCode runtime credential identifies the trusted client; `_meta` identifies the call

Managed OpenCode injects `{sessionId, callId}` under request `_meta.buildingai`. It does not calculate or submit `runtimeHash`. The API resolves the existing conversation binding and only accepts records marked as a verified personal session. Until provenance is persisted for every session path, eligibility is limited to records created through authenticated first-party flows and checked with the owning user/agent data available to the resolver; unresolved or duplicate session IDs fail closed.

Alternative: add `sessionId` to each Todo schema. Rejected because it exposes infrastructure identity to the model and pollutes business inputs.

### Todo provider owns model-facing schemas and delegates execution

The Todo module exports a Bowi provider containing six domain-prefixed tools: `todo_search`, `todo_search_assignees`, `todo_create`, `todo_update`, `todo_set_progress`, and `todo_delete`. The gateway validates JSON-schema-shaped inputs at runtime and passes the resolved user ID only through an internal execution context. Search exposes a relationship enum rather than asking the model for the current user's UUID.

Alternative: call Todo REST controllers internally. Rejected because controller DTO/auth layers are transport-specific and would duplicate identity translation.

### Registry is runtime truth; database tool rows are a projection

The gateway builds a deterministic registry from injected core providers plus marked providers discovered after all dynamic extension modules are loaded, rejects duplicate tool names, and exposes annotations including read-only/destructive hints. EHCS contributes a compatibility provider that delegates to its existing executor, so the canonical gateway contains both legacy EHCS definitions and new Todo definitions before the database URL changes. The system Bowi MCP record and tool rows are synchronized for UI discovery, but execution never loads schemas or handlers from the database. Existing rows are preserved during the transition rather than deleted by an individual provider.

### MCP business failures are tool results

Validation, authorization, not-found, conflict, and provider failures become `CallToolResult` values with `isError: true` and stable codes. JSON-RPC errors are reserved for invalid requests, unsupported protocol methods, and unknown tools. Messages are sanitized so an unrelated Todo still appears as not found.

### OpenCode call context is injected at the invocation boundary

`McpCatalog.convertTool` receives a hidden context callback or optional execution metadata from the session tool wrapper, then passes `_meta` in `client.callTool`. It never mutates tool arguments. The Bowi server is appended to managed OpenCode MCP configuration from environment-backed internal settings, without overwriting user-defined servers.

## Risks / Trade-offs

- [Legacy conversation records lack explicit auth provenance] → Fail closed for ambiguous records and add focused provenance persistence where managed sessions are created.
- [A global development key could be deployed accidentally] → Require an explicit non-default secret outside development and compare credentials in constant time.
- [OpenCode code is shared with upstream behavior] → Keep metadata injection optional and covered by tests proving other MCP servers receive unchanged calls.
- [No durable create idempotency ledger in this change] → Use the stable call ID for structured logs; callers must search after an uncertain create response. A durable cross-provider ledger remains a later capability.
- [Database catalog synchronization can lag] → Runtime `tools/list` uses the in-memory registry; sync failures are logged and do not alter execution definitions.
- [Delete confirmation differs by client UI] → Mark `todo_delete` destructive and preserve server authorization; interactive confirmation UI is not treated as a substitute for authorization.

## Migration Plan

1. Deploy the main Bowi endpoint, registry, client authentication, and discovered EHCS compatibility provider while retaining the EHCS endpoint.
2. Synchronize the merged catalog and then update the canonical `bowi-mcp` record to the main API URL.
3. Configure managed OpenCode with the new endpoint and hidden invocation metadata.
4. Enable first-party agents only after verified invocation assertions and capability checks are available.
5. Verify Todo isolation, stale-update behavior, and existing EHCS workflows.
6. Roll back by restoring the canonical server URL to the retained EHCS route and removing the managed OpenCode Bowi configuration; Todo REST remains unchanged.

## Deployment Requirements

- Set the same non-default `BUILDINGAI_OPENCODE_INTERNAL_KEY` in the BuildingAI API and managed OpenCode processes. Production rejects the local development key.
- Set `BUILDINGAI_API_URL` for managed OpenCode to the internally reachable BuildingAI API origin.
- Set `BOWI_MCP_INVOCATION_SECRET` for first-party agent assertions; `JWT_SECRET` is the compatibility fallback.
- Restart both the BuildingAI API and the managed OpenCode runtime after changing these values so the canonical `bowi` transport and catalog are rebuilt.
