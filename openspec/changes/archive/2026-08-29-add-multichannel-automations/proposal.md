## Why

BuildingAI can already connect a standard agent to a Feishu bot, but users cannot create durable
tasks from that conversation and receive an agent result later. We need an automation capability now
for Feishu while establishing a channel-neutral contract so adding DingTalk, WeCom, and other
delivery channels does not require changing scheduling or agent-execution behavior.

## What Changes

- Add user-created one-shot and recurring automations with `at`, `every`, and `cron` schedules.
- Let a user create, list, pause, resume, cancel, and run a task from an enabled chat channel.
- Persist task definitions, execution runs, next-run state, failures, retries, and delivery results.
- Expose the durable task lifecycle through the canonical `bowi-mcp` server, including create,
  search, inspect, update, pause, resume, manual run, and delete tools; channel and web entry points
  reuse that same application boundary.
- Persist a durable dispatch/outbox record so a database commit cannot lose a run when queue
  submission fails or the process restarts.
- Execute due tasks asynchronously with bounded timeouts, idempotency, and a configurable missed-run
  policy.
- Introduce a channel-neutral delivery adapter registry with provider account/tenant targets,
  capability negotiation, receipts, unknown-delivery handling, and separate primary/failure routes;
  implement the Feishu adapter in this change.
- Deliver scheduled results proactively to the originating Feishu user or group chat, including
  clear confirmation and failure notifications.
- Run scheduled agents with an isolated, server-controlled tool policy; unattended runs SHALL NOT
  silently wait for interactive approval or execute unapproved high-risk tools.
- Enforce creator/chat scope, agent access checks, task limits, prompt limits, and secret-safe logs.
- Keep existing Feishu interactive chat behavior compatible; do not require DingTalk or WeCom
  credentials in this release.

## Capabilities

### New Capabilities

- `multichannel-automations`: Create, manage, schedule, execute, audit, and deliver durable agent
  automations through an extensible channel and provider-account abstraction.

### Modified Capabilities

- None.

## Impact

- NestJS automation, scheduling, queue, persistence, and delivery services.
- PostgreSQL entities and migrations for automation jobs and runs.
- Redis/BullMQ runtime coordination and idempotency.
- Feishu channel handling and proactive message APIs.
- Feishu chat commands, confirmation-gated natural-language intents, and structured automation
  tool contracts that can be reused by future channel adapters.
- Console APIs/UI for task inspection and operational status (read-only administration in the first
  release; task mutations remain creator/channel scoped).

## Non-goals

- Implementing DingTalk, WeCom, or other channel adapters in this change.
- Arbitrary shell/code execution as a scheduled payload.
- Cross-channel identity synchronization or a universal rich-card composer.
- Replacing the existing Feishu long-connection chat integration.
- Arbitrary natural-language scheduling without a confirmation gate. Natural-language input is
  normalized into the same command DTO as explicit commands, previewed, and only persisted after
  an actor-bound confirmation.
- Automatic cross-channel identity federation; each adapter may bind an external identity to a
  local creator, while unresolved identities remain scoped to the provider account and conversation.
