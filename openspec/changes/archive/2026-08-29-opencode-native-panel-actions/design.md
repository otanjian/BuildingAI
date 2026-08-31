## Context

OpenCode already ships a complete web client with the correct question cards, task progress, tool
events, message actions, files, and composer. Reimplementing those pieces in BuildingAI has produced
two competing views of one remote session. The iframe should be the only OpenCode chat renderer
while BuildingAI remains the owner of the local conversation and its history.

## Goals / Non-Goals

**Goals:**

- Make the OpenCode Web UI the single renderer for OpenCode conversations.
- Keep the local BuildingAI conversation ID as the stable route/history identity.
- Persist a one-to-one local conversation → OpenCode session mapping and reuse it after refresh.
- Limit the behavior change to `createMode=opencode` agents.
- Provide loading, unavailable-runtime, and retry states without exposing credentials in the iframe
  URL.

**Non-Goals:**

- Do not copy or fork OpenCode Web source code.
- Do not change the BuildingAI chat protocol for other providers.
- Do not let the iframe create a new OpenCode session from a blank OpenCode route.

## Decisions

1. **Server-owned embed contract.** Add a protected BuildingAI endpoint that checks conversation
   ownership and agent type, creates the remote session when missing, persists the mapping, and
   returns only the iframe URL and non-secret identifiers.

2. **Stable OpenCode route.** Build the URL as
   `<OpenCode baseURL>/server/<base64(baseURL)>/session/<sessionId>`, matching OpenCode Web's server
   route. The server key is derived from the configured runtime URL and never contains the API
   key/password.

3. **BuildingAI owns navigation and history.** The sidebar and `/agents/:agentId/c/:conversationId`
   route stay unchanged. Selecting another local conversation remounts the iframe with that
   conversation's mapped session. A local draft is materialized into a local record and remote
   session before embedding.

4. **Single OpenCode surface.** For OpenCode agents, the center content is the iframe. The existing
   BuildingAI message list, PromptInput, legacy projection SSE, and duplicate question card are not
   rendered in this branch. Other agents continue through `ChatContent` exactly as before.

5. **Iframe lifecycle and failures.** The panel shows a spinner while the embed contract resolves,
   an error state with retry when the runtime cannot be reached, and remounts on
   conversation/session changes. The iframe is not sandboxed because OpenCode Web needs scripts,
   storage, fetch/SSE, and its own route navigation.

6. **Security boundary.** The endpoint reuses the existing authenticated/public-agent ownership
   checks. No BuildingAI bearer token is placed in the URL. The configured OpenCode URL is
   normalized server-side; future remote deployments must allow framing through their CSP/frame
   headers.

## Risks / Trade-offs

- The iframe is isolated from BuildingAI React state; OpenCode Web controls its own internal UI and
  interactions. BuildingAI remains authoritative for local history and session mapping.
- Cross-origin OpenCode deployments must permit framing and must be reachable from the user's
  browser. Local `127.0.0.1:4096` remains supported.
- If the OpenCode runtime is unavailable, the local conversation is still preserved and can be
  retried later.
