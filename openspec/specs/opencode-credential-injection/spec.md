# opencode-credential-injection Specification

## Purpose
Allow an embedded OpenCode session to use credentials already configured by the authenticated Bowi AI user while keeping those credentials outside model-visible content.
## Requirements
### Requirement: Resolve credentials only for a mapped OpenCode session

The Bowi AI API SHALL resolve credential overrides only when the request carries the configured internal OpenCode key, the OpenCode session is mapped to a non-deleted conversation, and that conversation belongs to an OpenCode agent. Requests that fail any check SHALL be rejected without returning credential values.

#### Scenario: Unknown session is rejected

- **WHEN** OpenCode requests credential overrides for an unmapped session
- **THEN** the API returns an authorization/not-found error and no secret value

#### Scenario: Non-OpenCode conversation is rejected

- **WHEN** a mapped session belongs to another agent type
- **THEN** the API returns an authorization error and no secret value

### Requirement: Inject the configured SAP password at execution time

The OpenCode runtime SHALL request credential overrides immediately before executing a recognized SAP connection MCP tool and merge the password only into the outbound tool arguments. It SHALL preserve the original model arguments for tool-call metadata and lifecycle events.

#### Scenario: Password is available in personal parameters

- **WHEN** `sap_connect` is called with a missing, empty, or masked password and the user's personal parameters contain a password
- **THEN** the MCP server receives the configured password and the model-visible tool input remains masked/absent

#### Scenario: Password is already supplied

- **WHEN** the model supplies a non-masked password
- **THEN** the runtime preserves that value and does not overwrite it with a personal parameter

### Requirement: Model uses managed SAP credentials without prompting

For a session carrying Bowi AI context, OpenCode SHALL tell the model that a masked SAP password is managed by Bowi AI and SHALL present the `sap_connect` password field as optional. The model SHALL call `sap_connect` without asking the user to paste a password. A resolved password remains invisible to the model.

#### Scenario: Masked password appears in session context

- **WHEN** the model sees a SAP connection parameter whose password is `[masked]`
- **THEN** it is instructed to omit the password or pass the masked placeholder and call `sap_connect` directly

#### Scenario: Existing Bowi AI session

- **WHEN** an existing session already contains Bowi AI context created before this behavior was deployed
- **THEN** the OpenCode runtime adds the managed-credential instruction dynamically on its next model turn

#### Scenario: Credential resolution fails

- **WHEN** the SAP connection call fails because no managed credential can be resolved
- **THEN** the assistant asks the user to update Bowi AI personal parameters rather than paste a password into chat

### Requirement: Never expose resolved credentials

The credential endpoint, runtime wrapper, and MCP adapter MUST NOT write resolved passwords to model messages, browser URLs, session metadata, tool metadata, lifecycle events, logs, or tool output. If resolution is unavailable, the normal MCP call behavior SHALL continue without a password override.

#### Scenario: Bowi AI bridge is unavailable

- **WHEN** the internal API is unreachable or not configured
- **THEN** OpenCode executes the original tool arguments and does not fail unrelated tools solely because credential resolution is unavailable
