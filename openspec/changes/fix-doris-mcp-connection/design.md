## Context

The shared AI SDK already contains a modern HTTP client, but the running API can load stale package output and the current compatibility probe silently falls back whenever discovery parsing fails. The API then persists the full AI SDK error into `ai_mcp_servers.connect_error`, whose PostgreSQL column is limited to 255 characters.

## Goals / Non-Goals

**Goals:**

- Make protocol selection deterministic for modern Doris HTTP responses.
- Ensure source and runtime package outputs cannot diverge during local/API startup.
- Bound persisted diagnostics without hiding the full error from logs or the returned check result.
- Cover modern success, legacy fallback, and oversized error cases with focused tests.

**Non-Goals:**

- Changing Doris server code, SQL, or business tools.
- Implementing new procurement metrics or changing agent prompts.

## Decisions

1. **Use an explicit protocol-selection result.** Replace a boolean probe with a result that distinguishes modern support from legacy compatibility. Only a valid modern JSON-RPC discovery response that advertises the requested version selects `ModernMcpHttpClient`; unavailable, unsupported, malformed, or non-modern responses fall back to the existing client so older MCP servers keep working.

2. **Keep modern metadata on every request.** The modern client remains stateless and sends the protocol version, client capabilities, and client info in `params._meta`, preserving configured authorization headers.

3. **Normalize at the API persistence boundary.** Keep the full error for the logger and return payload, but truncate the value written to `connectError` to the entity/database limit with an ellipsis. This avoids a migration for a diagnostic field and protects both console and web connection checks.

4. **Build before runtime verification.** The package build output used by the API must include the modern client. Verification will run the focused AI SDK tests, API tests, package build, and a live request against `http://127.0.0.1:3000/mcp` when the local Doris process is available.

## Risks / Trade-offs

- [A server returns an unusual discovery response] → Accept only a well-formed modern result as modern; retain the existing legacy path for all responses that do not explicitly advertise the requested version.
- [Truncation removes useful context] → Preserve the complete message in structured logs and the immediate API response; only the persisted status field is bounded.
- [API runs from stale `dist`] → Rebuild the shared SDK as part of verification and update startup/build dependency wiring if the workspace does not already enforce it.

## Migration Plan

Deploy the shared SDK and API together, run the MCP connection check for Doris, and retry the enterprise agent conversation. Roll back the package/API build if a legacy endpoint regression is detected; no Doris-side rollback is required.
