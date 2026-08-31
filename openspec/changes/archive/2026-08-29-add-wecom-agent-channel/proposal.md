## Why

BuildingAI already supports connecting Feishu bots to published standard agents, but enterprises
that use WeCom cannot expose the same agent capability in their daily collaboration environment.

**Why now:** WeCom's intelligent-robot API now provides an official Node.js WebSocket SDK and native
streaming replies, so the proven Feishu operating model can be extended without introducing public
callback infrastructure.

## What Changes

- Add a WeCom intelligent-robot channel for published standard agents.
- Let administrators manage multiple named WeCom connections, each bound to one standard agent and
  one unique BotID.
- Support credential testing, enable/disable, deletion, runtime status, and safe error visibility.
- Receive direct and group text messages through an outbound WeCom long connection, preserve
  per-chat agent conversations, and stream answers back into the originating WeCom conversation.
- Protect Bot Secrets and agent access tokens with encrypted storage, masked responses, event
  idempotency, and exclusive multi-instance connection ownership.

## Non-goals

- Supporting non-standard, OpenCode, Coze, or Dify agents.
- Supporting URL callbacks, WeCom custom applications, customer-contact applications, or the
  existing WeChat Official Account integration.
- Supporting media inputs, template-card interactions, welcome messages, proactive automations, or
  automatic WeCom-to-BuildingAI user binding in the first release.

## Capabilities

### New Capabilities

- `wecom-agent-channel`: Configure, operate, and monitor WeCom intelligent-robot connections that
  route text conversations to published standard BuildingAI agents.

### Modified Capabilities

None.

## Impact

- NestJS channel module, console APIs, TypeORM entities and migrations, Redis runtime state, and the
  published-agent streaming adapter.
- React console routes, connection list/form pages, service hooks, and channel navigation.
- New dependency on the official `@wecom/aibot-node-sdk` package and outbound WebSocket access to
  WeCom.
- Existing Feishu and WeChat Official Account behavior remains unchanged.
