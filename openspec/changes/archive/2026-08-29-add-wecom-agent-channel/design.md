## Context

The current Feishu channel in `packages/api/src/modules/channel/feishu/` already proves the product
contract: encrypted connection records, Redis leases and idempotency, and token-authenticated calls
to the published `/v1/chat-messages` SSE endpoint. The console uses list-first connection management
under `packages/client/src/pages/console/channel/feishu/`.

WeCom intelligent robots expose both URL callbacks and an outbound WebSocket mode. In WebSocket
mode, each BotID can keep only one effective connection; replies update a native stream by sending
the accumulated content with a stable stream ID. WeCom limits one conversation to 30 messages per
minute and 1000 per hour, and a stream must be finalized within ten minutes.

The existing `wxoaconfig` service is for WeChat Official Accounts and has an incompatible callback,
credential, and encryption model.

## Goals / Non-Goals

**Goals:**

- Add an independent WeCom connection resource and runtime without changing existing channels.
- Reuse the published standard-Agent streaming contract while isolating platform transport code.
- Make multi-instance ownership, deletion safety, rate-safe streaming, and secret handling explicit.
- Match the existing console connection-list experience and permission model.

**Non-Goals:**

- A generalized all-channel framework in the first implementation.
- Sharing connection tables or credential keys with Feishu.
- Translating media into Agent attachments or resolving WeCom user identities.

## Decisions

### Use the official WeCom WebSocket SDK

Use `@wecom/aibot-node-sdk` with BotID and Secret. The SDK owns authentication, heartbeat,
reconnect, typed message dispatch, and stream replies. The service owns business lifecycle and
disconnects the SDK client when disabled, deleted, shut down, or deprived of its Redis lease.

**Rejected alternative:** URL callbacks require a public endpoint, signature validation, AES
handling, and a different streaming polling flow. **Rejected alternative:** a WeCom custom
application does not provide the intelligent-robot conversation contract requested here.

### Store WeCom connections in a dedicated table

Add `wecom_aibot_connection` with a UUID primary key, Agent foreign key, normalized name and BotID,
encrypted Bot Secret and Agent token, enabled flag, and timestamps. A unique normalized BotID index
prevents ambiguous routing; `(agentId, normalizedName)` makes list operations understandable.
Credentials use a separate versioned AES-256-GCM key, `WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY`.

**Rejected alternative:** Dict storage cannot atomically enforce BotID uniqueness or support
connection lifecycle and paginated management. Reusing the Feishu entity or encryption key would
couple unrelated credential domains and migrations.

### Keep Agent streaming reusable but transport-neutral

Extract the UI-message SSE request/parser from the Feishu service into a channel-local shared
`PublishedAgentChatClient`. It accepts Agent ID/token, message, anonymous identifier, prior
conversation ID, and a text callback. Feishu continues to use the same observable contract; WeCom
supplies `wecom:<connectionId>:<scope>` as the anonymous identifier.

**Rejected alternative:** duplicate the complete SSE implementation. That would let upstream error
and protocol behavior drift between channels. A broader core package is unnecessary while only two
channel consumers exist.

### Derive a stable conversation scope from chat type

Group scope is `group:<chatid>` and direct scope is `single:<userid>`. Redis stores returned Agent
conversation IDs under `wecom:conversation:<connectionId>:<scope>` and message claims under
`wecom:event:<connectionId>:<msgid>`. A keyed in-process promise chain serializes messages per scope
so concurrent callbacks cannot fork Agent context.

### Throttle accumulated native stream updates

Create one stream ID for each callback and send accumulated, UTF-8-safe content no more frequently
than once every 4000 ms. Always send a final `finish=true` update. Content is capped below WeCom's
20480-byte limit with an explicit truncation suffix. Before every update, confirm that the
connection is still active, leased, and not tombstoned.

**Rejected alternative:** forwarding every SSE delta can exceed the per-conversation rate limit.
Waiting for the complete answer would discard the requested native streaming experience.
The 4000 ms slot is shared by all streams in the same connection/chat scope, keeping combined
native updates below the documented hourly conversation ceiling even across consecutive requests.

### Use connection-scoped leases and safe lifecycle transitions

Acquire a tokenized Redis lease before connecting and renew it periodically with compare-and-expire
semantics. Release only the matching token. Deletion first marks a connection as tombstoned, stops
the client, invalidates queued updates, clears connection-scoped Redis state, and then removes the
record. Runtime status stays process-local and is exposed as stopped, connecting, connected, or
error.

Restore persisted connections during application bootstrap rather than module initialization.
Nest can initialize sibling modules concurrently, so querying from `ChannelModule.onModuleInit`
can race the same-version migration runner in `DatabaseModule.onModuleInit`. Application bootstrap
runs only after every module initialization hook has completed, making the migrated schema the
required boundary before connection restoration.

For a saved enabled connection, the test action reports live authenticated health rather than
opening a second connection that would evict production. Disabled or unsaved credentials are tested
with a temporary client that authenticates and immediately disconnects.

### Add a separate console surface

Expose paginated `/consoleapi/wecom-aibot-channel/connections` CRUD, test, and toggle routes. Add a
“企业微信机器人” list and form that filters Agent choices to `createMode = direct`, never restores
secret values into inputs, and uses existing shared UI components and permission guards.

## Risks / Trade-offs

- [Risk] The official SDK is new and its event/error surface may evolve → Pin a compatible release,
  wrap it behind a small client factory, and cover the wrapper with contract-focused tests.
- [Risk] A new connection can evict an existing connection for the same BotID → Enforce database
  uniqueness, acquire the distributed lease first, and never run a parallel test for an active row.
- [Risk] Long Agent turns may exceed WeCom's ten-minute stream lifetime → Apply an abort timeout and
  finalize with a safe timeout message.
- [Risk] Process-local status is not a global health view → Pair status with lease ownership; global
  telemetry can be added without changing the connection contract.
- [Risk] Single-chat serialization delays rapid messages → Bound the Agent request timeout and clear
  completed queue entries; deterministic context is preferred to parallel conversation forks.

## Migration Plan

1. Deploy the new table migration, encryption-key configuration, SDK dependency, API, and console
   code; database initialization completes before the channel restores connections, and no
   connection exists or starts by default.
2. Configure a connection disabled, test credentials, then enable it and verify direct/group text
   streaming.
3. Roll back by disabling WeCom connections before deploying the previous version. The new table is
   inert and can remain for a later redeploy.
