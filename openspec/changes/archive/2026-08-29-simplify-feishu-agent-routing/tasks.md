## 1. Feishu service routing cleanup

- [x] 1.1 Add failing service tests proving only direct agents can be saved, tested, toggled, loaded, and started, and that OpenCode agents are rejected with the standard-agent error.
- [x] 1.2 Remove durable/OpenCode branching from `FeishuChannelService`, including gateway injection, durable event handling, recovery, turn mappings, question/stop actions, and durable-specific Redis keys; keep direct-agent streaming and fallback behavior.
- [x] 1.3 Make all connection and legacy Dict validation paths require a published Agent Token and update error text to say only standard agents are supported.
- [x] 1.4 Run focused Feishu service tests and API typecheck; mark the service cleanup complete only after the new rejection and direct streaming tests pass.

## 2. Feishu console and API cleanup

- [x] 2.1 Add failing client/API contract tests showing the Agent selector excludes non-direct agents and the form has no durable/OpenCode mode guidance.
- [x] 2.2 Update Feishu connection list types, selectors, labels, and help text to describe standard Agent-only support and required Agent Token.
- [x] 2.3 Run client lint/typecheck and focused console tests; mark the UI cleanup complete after the standard-agent-only contract is verified.

## 3. Documentation and regression verification

- [x] 3.1 Remove or update active Feishu OpenSpec/design references that claim OpenCode durable agents are supported; leave historical archived changes unchanged.
- [x] 3.2 Validate the OpenSpec change and run the complete relevant API/client test commands; record any pre-existing failures separately.
- [ ] 3.3 Perform a manual 1:1 Feishu smoke test with the ERPNext standard Agent: token authentication, SSE/CardKit response, text fallback, duplicate event, and restart listener behavior. (Requires live Feishu credentials and is not runnable in this environment.)
