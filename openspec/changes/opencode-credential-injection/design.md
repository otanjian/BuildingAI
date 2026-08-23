## Context

The iframe uses OpenCode's own MCP execution process. BuildingAI can safely keep the password out of the session context, but the separate OpenCode process needs a narrow bridge to retrieve it for the SAP connection call. The bridge must work for existing sessions because session history and mappings survive page refreshes.

## Decisions

1. **Session mapping is the capability boundary.** A short internal API request identifies the OpenCode session. BuildingAI looks up the mapped conversation, verifies it is an OpenCode agent, loads the authenticated owner's personal parameters, and returns only tool argument overrides.
2. **Static server-to-server authentication.** The bridge uses `BUILDINGAI_OPENCODE_INTERNAL_KEY` on an internal header. The development default keeps the local stack functional; deployments should set a private value in both processes. The key is never sent to the browser.
3. **Execution-time injection.** OpenCode wraps only MCP execution. It detects SAP connection tools, requests overrides, and passes a merged copy to the MCP client while retaining the original arguments for UI/lifecycle metadata.
4. **Credential extraction is narrow.** BuildingAI recognizes structured password keys and common `password`/`passwd`/`pwd` assignments in configured parameter strings. It does not forward arbitrary personal parameters as secrets.
5. **Fail open for availability, fail closed for authorization.** A missing bridge configuration or network failure leaves the original tool call untouched. An API authorization failure returns no secret and also leaves the original call untouched.
6. **Model-facing managed-credential contract.** Whenever BuildingAI session context is present, OpenCode adds a runtime instruction that masked SAP credentials are managed and must not be requested in chat. The runtime also removes `password` from the SAP connection tool's required fields and describes it as injected when omitted. This is dynamic so existing sessions receive the policy without rewriting stored metadata.

## Data Flow

`OpenCode MCP wrapper -> BuildingAI internal endpoint (session id, tool name, args) -> mapped conversation/user personalParams -> password override -> SAP MCP`

The raw password exists only in the API's in-memory request and the outbound MCP process call. It is not placed in OpenCode metadata or the BuildingAI chat record.

## Testing

- Unit-test password extraction, masked-value detection, and safe override merging.
- Unit-test the internal API authorization/session checks with mocked services.
- Unit-test the OpenCode wrapper's successful injection, preservation of supplied passwords, and fail-open behavior.
- Unit-test managed-credential system instructions and the optional SAP password schema.
- Run focused API/OpenCode tests, type checks, builds, and a fresh local SAP OpenCode session.
