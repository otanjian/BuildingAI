## Purpose

为 MCP、Agent Chat 和控制台工具等本 change 范围内的模型驱动外部动作建立默认拒绝、风险可分级、网络可限制、审批可追踪的统一执行边界，防止任意出网和不可逆操作。自动化、渠道和 OpenCode 直连路径是经批准的范围例外，由各自专项 change 管理。

## ADDED Requirements

### Requirement: Register versioned tools with declared risk

The system SHALL register each executable tool with a tenant or platform owner, version, capability set, input/output schema, risk level, credential reference, timeout, network policy, idempotency requirement, and approval mode. Only active tools bound to the current Agent version SHALL be discoverable by the model.

#### Scenario: Discover tools for an Agent

- **WHEN** a runtime loads tools for an Agent version
- **THEN** it receives only active tools allowed for the current tenant, environment, and version, without credential values or unrelated server details

#### Scenario: Reject an undeclared tool

- **WHEN** a model or client requests a tool not present in the version binding
- **THEN** the gateway rejects the request and records a policy-denied event

### Requirement: Authorize and gate tool execution

The system SHALL evaluate actor, tenant, project, Agent version, target resource, tool risk, input classification, environment, budget, rate, and approval state before execution. The gateway SHALL fail closed when policy context is missing or invalid.

#### Scenario: Execute a permitted read

- **WHEN** an authorized actor invokes an approved READ tool with schema-valid parameters within budget
- **THEN** the gateway executes it under the signed context and returns a redacted result

#### Scenario: Deny a high-risk write without approval

- **WHEN** a WRITE or DESTRUCTIVE tool is invoked without a valid preauthorization or approval
- **THEN** no external call is made and the response explains the approval requirement without exposing sensitive parameters

### Requirement: Enforce egress and SSRF protections

The system SHALL restrict outbound calls to approved protocols, domains, resolved IP ranges, ports, methods, redirects, request sizes, response sizes, and timeouts. It SHALL block loopback, link-local, private, metadata, management, and DNS-rebinding targets unless explicitly approved through a protected network policy.

#### Scenario: Block a private IP target

- **WHEN** a registered MCP URL resolves to a private or metadata IP
- **THEN** the gateway rejects the connection before sending application data and records the resolved target and reason

#### Scenario: Follow an approved redirect

- **WHEN** an external service redirects to a domain outside the tool's allowlist
- **THEN** the gateway stops following redirects and returns a bounded network-policy error

### Requirement: Apply execution safety controls

The gateway SHALL enforce schema validation, total and per-attempt timeout, concurrency limits, safe retry rules, circuit breaking, response redaction, and idempotency for tools that mutate external state.

#### Scenario: Retry a transient read failure

- **WHEN** an idempotent READ call receives a configured transient network failure
- **THEN** the gateway retries within the policy limit and emits one logical usage/audit event with attempt details

#### Scenario: Prevent duplicate write

- **WHEN** a client replays a mutating tool request with the same idempotency key
- **THEN** the gateway returns the original outcome or a deterministic in-progress result without issuing a second external mutation

### Requirement: Audit tool decisions and outcomes

The system SHALL record request, actor, Agent version, tool version, risk, target system, policy decision, approval, parameter digest, outcome, latency, and cost for every discovery and execution attempt. Secret values and unrestricted payloads SHALL NOT be stored.

#### Scenario: Inspect a denied execution

- **WHEN** an auditor queries a denied tool invocation
- **THEN** the record shows the policy version and denial reason, while sensitive input remains redacted or hashed

### Requirement: Cover in-scope built-in and asynchronous tool paths

The system SHALL apply the same registration, authorization, egress, approval, timeout, redaction, idempotency, and audit controls to built-in tools, public Agent tools, Agent Chat, console tool tests, MCP tools, and any asynchronous Worker execution explicitly routed through the gateway. Automation, channel, and OpenCode direct paths MAY remain outside this gateway under the approved scope exception and SHALL retain their own security controls.

#### Scenario: Deny an unregistered built-in tool

- **WHEN** an Agent invokes a built-in weather, attachment, planning, or dataset tool that is not registered for its version
- **THEN** the gateway denies the invocation and no direct helper path executes it

#### Scenario: Preserve policy across a Worker boundary

- **WHEN** an approved in-scope tool call is handed from API to a Worker
- **THEN** the Worker validates the signed tenant/version/policy context and applies the same controls before execution

### Requirement: Operate tools through a browser console

The system SHALL expose an authorized browser console for registering or disabling tools, viewing risk and egress policies, reviewing pending approvals, testing a sandbox connection, and inspecting redacted execution records. Emergency disable SHALL be visible and SHALL take effect for new calls.

#### Scenario: Review and approve a tool call in the browser

- **WHEN** a tester opens the tool approval page, reviews a seeded WRITE call, and approves it with the required permission
- **THEN** the browser shows target, risk, redacted parameters, expiry and decision, the call executes once, and the execution record is visible

#### Scenario: Verify browser egress blocking

- **WHEN** the tester runs a seeded tool whose URL resolves to a blocked private/metadata target through the browser connection-test action
- **THEN** the UI shows a bounded SSRF/egress denial, no external application data is sent, and the resolved target/reason is recorded

#### Scenario: Emergency-disable a tool in the browser

- **WHEN** an authorized operator disables a tool from the browser and then repeats its invocation
- **THEN** the second invocation is denied, the UI shows disabled status, and the prior execution history remains available

#### Scenario: Keep the browser console behind the same policy

- **WHEN** a non-administrator tries to register, change egress, approve, test, or emergency-disable a tool in the browser
- **THEN** the operation is denied by the same tenant/tool policy and no browser-only bypass path is available
