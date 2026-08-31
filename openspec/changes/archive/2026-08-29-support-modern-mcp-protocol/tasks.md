## 1. Test the compatibility boundary

- [x] 1.1 Add failing unit tests for modern protocol discovery, request metadata, JSON/SSE response parsing, and tool listing/calls.
- [x] 1.2 Add failing tests proving legacy Streamable HTTP and SSE configurations continue to use the existing client path.

## 2. Implement modern Streamable HTTP support

- [x] 2.1 Add a modern MCP HTTP client/transport that negotiates `2026-07-28`, sends required headers and `_meta`, and parses JSON/SSE responses.
- [x] 2.2 Update the shared MCP client factory to select modern or legacy behavior while preserving the existing `McpClient` interface and configured headers.
- [x] 2.3 Normalize modern tool definitions and results for agent execution and MCP connection checks, including actionable unsupported-protocol errors.

## 3. Verify and document

- [x] 3.1 Run focused unit tests and package typecheck/lint; fix regressions.
- [x] 3.2 Validate the Doris endpoint through the BuildingAI connection check without changing Doris, and update this task list with the result.
