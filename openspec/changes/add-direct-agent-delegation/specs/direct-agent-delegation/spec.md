## Purpose

Allows a Direct agent to delegate a bounded, synchronous task to an explicitly approved Direct specialist while preserving the current user, tenant, project, security, and billing boundaries.

## ADDED Requirements

### Requirement: Allowlisted Direct delegation

The system SHALL expose an agent-delegation capability only when the calling agent is Direct, delegation is enabled for that agent, and the target agent is an enabled allowlist member with `createMode = direct`.

#### Scenario: Delegation tool is available
- **WHEN** a Direct agent has delegation enabled and at least one valid allowlisted Direct target
- **THEN** the agent can request a child-agent invocation during a turn

#### Scenario: Invalid target is unavailable
- **WHEN** the target is not allowlisted, does not exist, is disabled, or is not Direct
- **THEN** the system rejects the invocation without executing the target agent

### Requirement: Synchronous bounded execution

The system SHALL execute a valid child invocation synchronously with a bounded task input, bounded output, a configured timeout, and a per-parent-turn call limit. The child SHALL receive the current user, tenant, and project scope and SHALL use its own Direct model, prompt, knowledge bases, and MCP configuration.

#### Scenario: Child returns a result
- **WHEN** the parent invokes a valid child with a task and optional context within configured limits
- **THEN** the parent receives the child status and result and can continue its own response

#### Scenario: Child times out or exceeds a limit
- **WHEN** child execution exceeds its timeout, output limit, or the parent has reached its call limit
- **THEN** the system returns a bounded error result and does not start another child execution for that call

### Requirement: Isolation and recursion prevention

The system MUST reject cross-tenant or cross-project delegation, MUST preserve the caller identity, MUST NOT accept client-supplied delegation permissions, and MUST prevent a child invocation from invoking another agent or creating a cycle.

#### Scenario: Scope or recursion violation
- **WHEN** a request targets another tenant/project or a child attempts delegation
- **THEN** the system rejects the request and the target agent is not executed

### Requirement: Usage and failure accounting

The system SHALL account for child model usage under the current user and parent request association, and SHALL emit a structured record for every attempted child invocation containing parent, child, call, status, duration, and usage where available.

#### Scenario: Successful or failed child call is accounted
- **WHEN** a child invocation succeeds, fails, is cancelled, or times out
- **THEN** the system records its terminal status and usage/error summary without storing credentials or full private prompts
