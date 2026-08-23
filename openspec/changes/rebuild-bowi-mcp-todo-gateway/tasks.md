## 1. Gateway Contract and Security

- [x] 1.1 Add failing registry and runtime tests for authenticated stable discovery, protocol errors, duplicate tools, and structured business errors
- [x] 1.2 Implement the Bowi MCP registry, stateless runtime, client authentication, and main API endpoint
- [x] 1.3 Add failing principal resolver tests for managed OpenCode, verified platform assertions, missing context, and publish/anonymous denial
- [x] 1.4 Implement fail-closed Bowi principal resolution without model-visible identity arguments

## 2. Todo Provider

- [x] 2.1 Add failing provider tests for tool schemas, search translation, CRUD/progress delegation, stale conflicts, and sanitized authorization errors
- [x] 2.2 Implement the six Todo Bowi tools against `PersonalTodoService` and register the provider through `TodoModule`
- [x] 2.3 Add HTTP contract tests covering initialize, tools/list, successful tools/call, unauthenticated access, and unresolved sessions

## 3. Catalog and First-Party Agent Integration

- [x] 3.1 Add failing synchronization tests for the canonical system Bowi MCP server and Todo tool projection
- [x] 3.2 Implement idempotent Bowi server/tool synchronization while preserving legacy EHCS tool records
- [x] 3.2a Discover the EHCS compatibility provider before switching the canonical Bowi server URL
- [x] 3.3 Add failing agent invocation tests for short-lived Bowi assertions and publish/site provenance denial
- [x] 3.4 Inject verified, short-lived Bowi invocation assertions into first-party agent MCP clients without persisting them
- [x] 3.5 Preserve login, publish-key, site-token, and anonymous provenance through conversation creation and OpenCode binding

## 4. Managed OpenCode Integration

- [x] 4.1 Add failing OpenCode tests proving Bowi is auto-configured and session/call context is passed in MCP `_meta`, not tool arguments
- [x] 4.2 Implement managed Bowi MCP configuration and optional hidden execution metadata in the OpenCode MCP catalog boundary
- [x] 4.3 Add API resolver tests for unique OpenCode session binding and fail-closed ambiguous or ineligible sessions

## 5. Verification and Compatibility

- [x] 5.1 Run focused API, Todo, agent, and OpenCode tests and fix regressions
- [x] 5.2 Run affected package type checks/lint and validate `rebuild-bowi-mcp-todo-gateway` with OpenSpec
- [x] 5.3 Confirm the legacy EHCS endpoint and catalog constants remain unchanged and document deployment environment requirements
