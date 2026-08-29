## Purpose

为企业提供一个边界清晰、凭证明确的飞书入口，仅将飞书消息转发到标准 ERPNext 系统操作智能体，避免第三方运行时和持久化执行语义进入该通道。

## ADDED Requirements

### Requirement: Feishu accepts only standard agents

飞书连接配置、测试、启用和启动加载 MUST 只接受 `createMode = direct` 的标准智能体。OpenCode、Coze、Dify 及其他非标准智能体 MUST 被拒绝，并返回明确的标准智能体限制提示。

#### Scenario: Standard ERPNext agent can be configured

- **WHEN** an administrator saves a Feishu connection for a direct agent with valid Feishu credentials and a published agent token
- **THEN** the connection is accepted and can be enabled

#### Scenario: Non-standard agent is rejected

- **WHEN** an administrator saves, tests, enables, or starts a Feishu connection for an OpenCode, Coze, Dify, or other non-direct agent
- **THEN** the operation is rejected without starting a Feishu listener

### Requirement: Feishu routes standard messages through the public streaming API

飞书收到标准智能体的文本消息后 MUST 使用已发布 Agent Token 调用普通流式对话接口，并将 SSE 文本增量投影到 CardKit；CardKit 不可用时 MUST 降级为普通文本回复。

#### Scenario: Standard message streams to Feishu

- **WHEN** an enabled Feishu connection receives a text message for the bound direct agent
- **THEN** the service calls the public streaming chat API with the connection token and returns the accumulated answer to the same Feishu message

#### Scenario: Streaming card failure falls back to text

- **WHEN** a standard-agent response cannot create, update, or finalize a CardKit message
- **THEN** the service sends the completed answer as a normal Feishu text reply

### Requirement: Feishu keeps standard-channel delivery safety

飞书标准通道 MUST retain per-connection event idempotency, chat-scoped conversation continuity, credential redaction, and distributed listener ownership. The channel MUST NOT expose OpenCode durable turn controls or recovery behavior.

#### Scenario: Duplicate Feishu event is ignored

- **WHEN** the same event is delivered more than once to the enabled connection
- **THEN** only the first delivery invokes the agent and subsequent deliveries produce no additional reply

#### Scenario: Connection is restarted

- **WHEN** the API process restarts with an enabled standard-agent connection
- **THEN** the listener resumes using the stored Feishu credentials without attempting durable OpenCode recovery
