## 1. Contract and policy

- [x] 1.1 Extend shared `ToolConfig` types and web DTO/config mapping with validated Direct delegation settings.
- [x] 1.2 Add unit tests for delegation policy defaults, clamping, allowlist checks, same-scope checks, and one-level recursion prevention.

## 2. Direct execution core

- [x] 2.1 Extract or introduce a reusable blocking Direct execution service that resolves the target model and runs the existing Direct tool loop without an HTTP response.
- [x] 2.2 Add `AgentInvocationService` to validate target Direct agents, preserve user/tenant/project scope, enforce timeout/call limits, bound output, and emit redacted structured logs.
- [x] 2.3 Add child usage validation/deduction through the existing billing handler with a deterministic parent association.
- [x] 2.4 Add unit tests for successful invocation, invalid target, timeout, output truncation, cancellation, and billing/error accounting.

## 3. Agent tool integration

- [x] 3.1 Implement the `invoke_agent` model tool with bounded task/context schemas and stable success/error result shapes.
- [x] 3.2 Register the tool only for eligible Direct parent agents and disable delegation in child execution contexts.
- [x] 3.3 Add integration coverage proving a parent can consume a child result and that ordinary Direct agents remain unchanged.

## 4. Frontend configuration and progress

- [x] 4.1 Add a Direct-agent delegation section to the existing agent configuration menu for enabling delegation and selecting same-scope Direct targets.
- [x] 4.2 Render a compact child-agent progress/result state in the existing chat UI without exposing child private prompts or credentials.
- [x] 4.3 Validate frontend configuration filtering and progress/error rendering through the production typecheck/build and browser flow.

## 5. Verification

- [x] 5.1 Run focused backend unit/integration tests, API typecheck, lint, and client typecheck/build.
- [x] 5.2 Start the local stack and verify through the browser UI: enter the agent configuration via the visible workspace/agent menu, configure a parent and child Direct agent, open the parent chat through its menu entry, and confirm the delegation tool/progress path with a real request.
- [x] 5.3 Validate the OpenSpec change and record browser verification evidence, including failure-path checks for a non-Direct or out-of-scope target.
