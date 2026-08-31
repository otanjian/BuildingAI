## Context

`AgentMemory` already stores `userId`, `agentId` and content and is consumed by the chat runtime. The existing settings page uses the separate global `UserMemory` API, so changing only labels would leave the UI and runtime semantics inconsistent.

## Decisions

1. Add a dedicated `ai-agent-memories` web API while keeping existing global user-memory routes for compatibility.
2. Resolve accessible agents in the memory service using the same rules as the agent square: the user's own agents, root access, or approved published agents visible to everyone or explicitly assigned to the user.
3. Return an enriched, UI-safe memory DTO (`agentId`, `agentName`, `content`, timestamps) rather than exposing database relation details.
4. Use a responsive CSS grid for the agent/content columns. The editor remains a dialog, with a full-viewport mode controlled by local state and an explicit `DialogClose` button.

## API shape

- `GET /ai-agent-memories` → `{ items }`
- `GET /ai-agent-memories/agents` → `{ items: [{ id, name }] }`
- `POST /ai-agent-memories` with `{ agentId, content }`
- `PATCH /ai-agent-memories/:id` with `{ agentId, content }`
- `DELETE /ai-agent-memories/:id`
- `DELETE /ai-agent-memories/all`

All routes require an authenticated playground user; service methods apply user and agent access checks.

## Risks and mitigations

- An agent can become inaccessible between list and mutation; re-check access in every mutation and return a client error.
- Existing global memories remain in storage; the new page intentionally manages `AgentMemory` records only and keeps old endpoints available to other callers.
- Full-screen dialog classes must preserve focus management supplied by Radix; use the existing dialog primitives rather than a second modal implementation.
