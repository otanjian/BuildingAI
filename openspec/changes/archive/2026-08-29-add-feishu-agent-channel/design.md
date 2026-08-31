## Context

The API already has a console-protected channel module backed by the `Dict` configuration store, and
published agents expose a token-authenticated `/v1/chat-messages` interface. The integration must
run inside the API process and must not require a public callback URL, so an outbound Feishu long
connection is the appropriate transport.

## Goals / Non-Goals

**Goals:**

- Persist one independently operable Feishu configuration per standard agent.
- Keep secrets server-side, expose only masked metadata, and make runtime failures visible in the
  console.
- Start and stop long connections without restarting the API.
- Maintain chat-to-agent conversation IDs and event idempotency in Redis.

**Non-Goals:**

- A database migration for a new table; use the existing grouped dictionary store to remain
  compatible with current deployments.
- A callback endpoint, rich-card composer, or multi-instance event coordination.

## Decisions

### Configuration storage

Store each configuration as one JSON value in the `config` dictionary table under group
`feishu-agent-channel` and key equal to the agent UUID. This preserves secrets in the API boundary
and avoids a deployment migration. The service reads all group entries at startup and masks
`appSecret` and `agentAccessToken` in responses.

### Runtime transport

Use the official `@larksuiteoapi/node-sdk` `WSClient` with the `im.message.receive_v1` event
handler. The service owns a map of active clients, starts enabled entries on module initialization,
and stops/replaces a client when an administrator changes its configuration. A single API instance
is assumed, matching Feishu long-connection delivery semantics.

### Agent invocation

Resolve the agent API origin from the explicit `BUILDINGAI_API_URL` override, then the production
API base URL, and finally `APP_DOMAIN`. When the conventional `mac.bosofts.com` web origin is used,
map it to `api.mac.bosofts.com` so the request cannot be routed to the frontend proxy. Call the
public `POST /v1/chat-messages` endpoint with `responseMode: streaming`,
`Authorization: Bearer <agentAccessToken>`, and a stable `X-Anonymous-Identifier` derived from the
Feishu chat ID. Parse the UI-message SSE stream, accumulate `text-delta` events, and retain the
`data-conversation-id` value for subsequent messages. This reuses the same published-agent contract
as other clients and avoids coupling the channel to private agent internals.

### Console API

Expose `GET /consoleapi/feishu-channel`, `PUT /consoleapi/feishu-channel/:agentId`,
`POST /consoleapi/feishu-channel/:agentId/test`, and
`POST /consoleapi/feishu-channel/:agentId/toggle`. All routes use existing console authentication
and permission decorators. Toggle responses include connection status and a safe last-error string.

### Message handling

Extract text from Feishu text messages, ignore bot-authored or unsupported events, mark `event_id`
as processed in Redis with a short TTL before invoking the agent, create a CardKit card with
`streaming_mode` enabled, and update its markdown element with monotonically increasing sequence
numbers. Throttle card updates so token generation cannot exceed Feishu API limits, finalize the
card when the agent stream ends, and fall back to a final text reply if CardKit is unavailable.
Errors are logged with IDs only and produce a generic retry message in the chat.

### Module dependency boundary

The Feishu channel only calls the published standard-agent API. It has no dependency on the
non-standard agent services or gateways, so `ChannelModule` remains independent of
`AiAgentsModule` at import time.

## Risks / Trade-offs

- [Risk] Long connections are process-local and duplicate events can occur after restarts → Redis
  idempotency keys use event IDs, and the UI reports the current instance status. Production uses a
  single active channel worker until leader election is introduced.
- [Risk] Feishu or agent calls can exceed the event acknowledgement window → acknowledge the SDK
  event handler promptly and perform the agent call asynchronously; reply failures remain visible in
  logs/status.
- [Risk] Streaming-card permissions or APIs may be unavailable in an existing Feishu app → keep the
  generated answer locally and deliver a final text reply when streaming-card operations fail.
- [Risk] Secrets in the dictionary table are not field-level encrypted → restrict table/API access
  to the service account and never include raw values in logs or responses; encryption can be added
  later without changing the API.
- [Risk] `APP_DOMAIN` may not be externally resolvable from the API process → validate it when
  enabling and surface a clear connection error.

## Migration Plan

1. Deploy the API and client with the SDK dependency; existing channels are unaffected.
2. Configure and test a channel in the console, then enable it. The first save creates the
   dictionary entry.
3. Roll back by disabling channels and deploying the previous build; dictionary entries remain inert
   and can be removed by an administrator.
