## Purpose

This capability keeps iframe-based OpenCode sessions aligned with BuildingAI identity and agent policy without exposing bootstrap credentials as ordinary chat content.

## ADDED Requirements

### Requirement: New OpenCode sessions receive sanitized BuildingAI context

When BuildingAI creates an OpenCode session for an authenticated user, it SHALL include the current login account and the user's personal parameters after applying the agent's sensitive-word replacement policy. It MUST exclude passwords, access tokens, and other authentication secrets owned by BuildingAI.

#### Scenario: Authenticated SAP session initialization

- **WHEN** an authenticated user opens a new OpenCode agent conversation
- **THEN** the created OpenCode session contains a sanitized context snapshot with the user's account identifier and personal parameter key/value pairs

#### Scenario: Sensitive replacement is applied before transmission

- **WHEN** a configured sensitive word appears in an account or personal-parameter value
- **THEN** the value sent to OpenCode contains that rule's replacement and the original matching text is not sent as session context

#### Scenario: No visible bootstrap message

- **WHEN** the OpenCode Web iframe loads a newly initialized session
- **THEN** the user sees an empty conversation ready for input and no synthetic context message is rendered

### Requirement: OpenCode uses the session context for model requests

OpenCode SHALL append the stored BuildingAI context to the system instructions for each model request in that session, while preserving the normal OpenCode agent instructions and user messages.

#### Scenario: Context persists across turns

- **WHEN** the user sends multiple prompts in the same initialized session
- **THEN** each model request includes the same sanitized BuildingAI context snapshot

#### Scenario: Existing sessions remain compatible

- **WHEN** an existing session has no BuildingAI context metadata
- **THEN** OpenCode continues with its normal system instructions and does not fail the request
