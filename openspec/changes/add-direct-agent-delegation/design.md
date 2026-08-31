## Context

The API already resolves Direct models, builds tools, runs a bounded `ToolLoopAgent`, persists normal chat messages, and applies tenant-aware knowledge-base/MCP access. The existing public controller is an SSE adapter and should not be called over HTTP for an internal child invocation. The MVP stores delegation policy inside the existing agent tool configuration and keeps child output out of the parent conversation history.

## Goals / Non-Goals

**Goals:**

- Reuse the Direct model/tool execution path for an internal blocking child call.
- Make delegation server-configured, same-scope, one-level, bounded, and testable.
- Preserve current user identity and charge child model usage through the existing billing handler.
- Provide a small frontend configuration surface reachable from the agent configuration menu.

**Non-Goals:**

- Refactoring third-party providers or durable OpenCode turns.
- New workflow tables, queue workers, public endpoints, or a visual orchestration editor.

## Decisions

### Shared Direct runner

Introduce an internal Direct runner with a blocking result API. The existing SSE path will remain behavior-compatible and use the same lower-level preparation/execution primitives where practical. `AgentInvocationService` calls the runner directly, avoiding self-HTTP, publish credentials, and nested response parsing.

Alternative rejected: calling `/v1/chat-messages` from a tool. It duplicates authentication, couples internal execution to public routing, and makes cancellation and accounting ambiguous.

### Delegation policy in `toolConfig`

Extend the existing `ToolConfig` with `agentDelegation` containing `enabled`, `allowedAgentIds`, `maxCallsPerTurn`, and `timeoutMs`. The service validates and clamps values (maximum three calls and one-minute child timeout for the MVP). No migration is required and old agents remain unchanged.

Alternative rejected: a new composition table. It is better for a later workflow product but adds migrations and lifecycle UI beyond this first capability.

### Tool registration and context

Register `invoke_agent` only for a Direct parent with a valid policy. The tool receives only a task and bounded JSON context. The child runs with the current user/tenant/project and its own model, prompt, datasets, and MCP servers; delegation is disabled in the child execution context.

### Authorization and accounting

The service requires the target to be allowlisted, Direct, in the same tenant/project scope, and accessible to the current user. It logs a redacted structured delegation event and calls the existing billing validation/deduction for the child model, associated with the parent conversation or internal request ID.

### Result and failure contract

The tool returns `{ status, agentId, agentName, answer }` on success and a stable error code/message on failure. Child output is truncated to 8,000 characters. Timeout, cancellation, and validation errors are returned as tool results so the parent can decide how to respond; they do not crash the API process.

## Risks / Trade-offs

- [Child latency increases parent latency] → Use a hard timeout and one-level synchronous execution.
- [A prompt may attempt to bypass policy] → Never accept delegation permissions from the model or browser; enforce the allowlist in the service.
- [Usage can be charged twice or missed] → Keep child billing separate and use one deterministic association ID per child call.
- [Tool metadata may not render in every model] → Treat the tool as optional; ordinary Direct agents continue without it.
- [Configuration is less expressive than a graph] → Keep the schema intentionally small and defer graph composition to a future change.

## Migration Plan

Deploy backend and frontend changes together. Existing agents have no `agentDelegation` field and behave exactly as before. Rollback is code-only: disable the feature flag or revert the release; stored tool configuration remains backward-compatible.
