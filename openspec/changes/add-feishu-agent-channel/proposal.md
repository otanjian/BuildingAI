## Why

BuildingAI users currently need a separate integration service and manual environment configuration
to connect a Feishu bot to an agent. This makes a basic internal rollout unnecessarily difficult and
hides connection failures from administrators. Now that the standard agent exposes a stable public
chat interface, the console can provide a single, verifiable setup flow.

## What Changes

- Add a Feishu channel page in the BuildingAI console.
- Let an administrator choose a standard agent and enter the Feishu app credentials and the agent
  access token.
- Add connection testing, save, enable, disable, and current connection-status actions.
- Run an outbound Feishu long connection for each enabled configuration, receive text messages, call
  the selected BuildingAI agent, and reply in the same Feishu chat.
- Stream incremental BuildingAI answers into a native Feishu streaming card and fall back to a final
  text reply if the card APIs are unavailable.
- Keep per-chat conversation context and ignore duplicate Feishu event deliveries.
- Mask secrets in console responses and never return stored app secrets or agent tokens.

## Capabilities

### New Capabilities

- `feishu-agent-channel`: Configure, validate, operate, and monitor a Feishu bot connection to a
  standard BuildingAI agent.

### Modified Capabilities

## Impact

- NestJS channel module and console API.
- React console navigation, services, and configuration page.
- Redis-backed runtime state for chat mappings and event idempotency.
- Feishu Node SDK dependency and outbound access to Feishu APIs and the BuildingAI public chat
  endpoint.
- No changes to existing agent chat behavior or public API contracts.

## Non-goals

- Supporting non-standard agents in this first version.
- Implementing ERPNext identity mapping, write authorization, or a general-purpose rich-card
  composer.
- Replacing Feishu event subscriptions with an inbound callback server.
