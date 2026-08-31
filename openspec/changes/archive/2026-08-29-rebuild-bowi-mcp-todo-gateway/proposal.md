## Why

Bowi AI needs one trusted business-tool entry point that agents and managed OpenCode sessions can discover automatically, while the existing `bowi-mcp` is hosted by one extension and cannot safely operate user-scoped Todo data. The Todo center is already available through the web API, so now is the right time to expose it through MCP without allowing published agents or unrelated sessions to inherit a creator's personal identity.

## What Changes

- Add a first-party Bowi MCP endpoint in the main API with a stable, client-authenticated tool catalog.
- Add Todo tools for search, assignee lookup, create, definition update, progress update, and deletion, backed by the existing Todo domain service.
- Resolve the effective Todo subject from a verified BuildingAI invocation or managed OpenCode session; fail closed for anonymous, published-agent, stale, or ambiguous identities.
- Inject hidden OpenCode session/call context into MCP `_meta` so Bowi tools are recognized without adding model-visible identity arguments.
- Preserve Todo's existing creator/assignee visibility and mutation rules, optimistic concurrency, lifecycle normalization, and creator-only deletion.
- Keep the current EHCS Bowi MCP runtime compatible during this change; a full EHCS provider migration is a non-goal.

### Why now

Todo is the first user-scoped business capability behind Bowi AI, making a secure identity and tool-discovery contract necessary before more business domains are added.

### Non-goals

- Replacing the existing Todo web page or REST API.
- Exposing Bowi MCP as a general external OAuth/API-key product.
- Rewriting EHCS domain tools or removing its legacy endpoint in this change.
- Adding a generic workflow engine or arbitrary SQL capability for Todo users.

## Capabilities

### New Capabilities

- `bowi-mcp-todo-gateway`: Unified Bowi MCP discovery and secure execution of personal Todo tools from BuildingAI and managed OpenCode.

### Modified Capabilities

- None.

## Impact

- Main NestJS API modules for Todo, MCP routing, agent invocation context, and OpenCode session resolution.
- Managed OpenCode MCP invocation metadata and generated runtime configuration.
- System MCP catalog synchronization for the Bowi server and Todo tools.
- Tests covering MCP protocol behavior, identity provenance, Todo authorization, optimistic concurrency, and OpenCode context propagation.
