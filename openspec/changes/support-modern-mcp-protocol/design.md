## Context

The shared AI SDK MCP wrapper currently maps `streamable-http` to the AI SDK's built-in HTTP transport. The installed client negotiates legacy MCP initialization, while modern MCP servers use `/mcp` with a stateless request envelope and per-request `_meta` protocol fields. Connection checks and agent tool discovery both use this wrapper, so the fix belongs at this shared boundary.

## Goals / Non-Goals

**Goals:**

- Add a reusable modern Streamable HTTP transport/client path in the shared AI SDK package.
- Keep the existing AI SDK path for legacy endpoints and SSE.
- Make connection checks, tool listing, and runtime tool execution share the same protocol selection.
- Bound request timeouts and preserve caller-provided headers.

**Non-Goals:**

- No changes to Doris, MCP server records, or agent prompts.
- No broad protocol proxy or arbitrary-version translation layer.
- No change to the public MCP configuration shape.

## Decisions

1. **Probe modern protocol before legacy fallback.** Send a minimal `server/discover` request to the configured HTTP endpoint with `mcp-protocol-version: 2026-07-28`. A successful modern response selects the modern client; a known legacy response falls back to the current AI SDK transport. This avoids breaking existing servers while handling Doris explicitly.
2. **Implement modern requests in the shared wrapper.** The modern client will POST JSON-RPC requests to the endpoint, add the protocol and method headers, include `_meta` with protocol version and client capabilities, parse JSON or SSE responses, and expose the existing `McpClient` interface. This keeps API and UI callers unchanged.
3. **Use a per-client request id and no session dependency.** Modern requests are stateless, so the client will not require an `Mcp-Session-Id`; it will still honor configured authorization/custom headers.
4. **Return actionable errors.** Protocol negotiation failures include endpoint and supported/requested version details, while callers continue to receive a rejected client/connection check rather than a false positive.
5. **Test at the wrapper boundary.** Mock `fetch` to verify modern discovery, metadata/header construction, JSON/SSE parsing, tool listing/calls, legacy fallback, and unsupported-version errors.

## Risks / Trade-offs

- [Risk] A server may reject the modern discovery method while still supporting modern requests. → Retry a direct modern `initialize`/`tools/list` sequence when discovery is unavailable, before legacy fallback.
- [Risk] SSE response framing differs between MCP implementations. → Accept both JSON responses and `data:` SSE frames, and fail with a bounded parse error when no JSON-RPC result is present.
- [Risk] The AI SDK package may not expose all tool schema types needed by the modern response. → Normalize modern tools to the existing `McpToolInfo` and AI SDK tool shape at the wrapper boundary.

## Migration Plan

Deploy the shared package with the compatibility client, restart API workers, then re-run MCP connection checks. Existing MCP configurations require no edits. Rollback is a package rollback; the Doris server remains unchanged throughout.
