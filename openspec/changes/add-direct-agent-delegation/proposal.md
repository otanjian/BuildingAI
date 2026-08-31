## Why

BuildingAI can expose one agent to a caller, but a Direct agent cannot delegate a focused task to another Direct agent during the same turn. This prevents reusable specialist agents from participating in a controlled workflow. The capability is needed now to provide a small, safe first step toward agent composition without introducing a separate orchestration engine.

## What Changes

- Allow a Direct agent to declare a server-side allowlist of Direct agents it may invoke.
- Add an internal `invoke_agent` tool that executes one allowlisted Direct agent synchronously and returns its bounded result.
- Enforce same-tenant/project scope, ownership/access checks, call limits, timeout, output limits, and one-level delegation.
- Reuse the existing Direct execution path and model billing; do not route internal calls through public API tokens.
- Expose delegation configuration in the agent configuration UI.
- Add user-visible progress and error handling without exposing child credentials or private prompts.

## Capabilities

### New Capabilities

- `direct-agent-delegation`: Controlled synchronous invocation of allowlisted Direct child agents from a Direct parent agent.

### Modified Capabilities

## Impact

- Backend agent execution, tool construction, agent configuration DTOs, authorization, billing, and tests.
- Frontend Direct-agent configuration and chat progress rendering.
- No new external provider integration and no database migration in the MVP; delegation policy is stored with existing agent tool configuration.

## Non-goals

- Coze, Dify, or OpenCode delegation.
- Parallel, asynchronous, handoff, or recursive multi-agent execution.
- Cross-tenant/project calls, public-token chaining, or a visual workflow designer.
