## Context

The canonical `bowi-mcp` server is created and synchronized by `BowiMcpCatalogSyncService`, while an
agent's `mcpServerIds` is currently only populated by selected seeders or explicit agent updates.
Existing OpenCode agents can therefore retain an empty list even though the canonical server and its
tools are available. OpenCode's global managed runtime can authenticate Bowi, but a session without
the server in its effective tool catalog cannot make a normal Bowi tool call.

## Goals / Non-Goals

**Goals:**

- Repair persisted OpenCode agent bindings after the canonical Bowi server exists.
- Keep the operation idempotent and preserve unrelated MCP bindings.
- Make failure non-destructive: if the canonical server is unavailable, leave agent bindings
  unchanged and log a warning.

**Non-Goals:**

- Changing runtime principal resolution or capability checks.
- Automatically binding direct SAP upstream servers.
- Removing user-selected MCP servers from an agent.

## Decisions

1. **Repair from the catalog sync service.** The service already runs after the provider registry is
   ready and has the authoritative `AiMcpServer` repository. It will find active OpenCode agents and
   append the canonical Bowi ID to each missing binding.
2. **Use a single canonical server lookup.** Match by exact `name === "bowi-mcp"`, require
   `isDisabled = false`, and do not infer a direct SAP server as a substitute.
3. **Preserve and deduplicate bindings.** Existing IDs remain in order; the Bowi ID is appended only
   when absent. Agents are saved only when the resulting list differs.
4. **Fail soft on bootstrap repair.** A missing Bowi row or repository failure must not prevent the
   API from starting; the existing catalog sync behavior remains authoritative and the warning is
   observable in logs.

## Risks / Trade-offs

- A large installation may update many agents during one bootstrap → use one bounded query and only
  save changed rows.
- An agent may intentionally omit Bowi → this change treats managed OpenCode agents as requiring the
  platform Bowi gateway; direct/non-OpenCode agents are untouched.
- A stale OpenCode process may cache its MCP catalog → the binding repair is paired with
  restarting/reloading the managed OpenCode runtime during deployment verification.

## Migration Plan

1. Deploy the API change and restart the API so catalog synchronization repairs existing OpenCode
   agents.
2. Restart the managed OpenCode runtime to refresh its MCP catalog.
3. Verify the affected agent has `bowi-mcp` in `mcpServerIds`, then issue a fresh conversation and
   confirm `tools/list` and an authorized read-only SAP call.
4. Roll back by reverting the service change; no data migration is required.
