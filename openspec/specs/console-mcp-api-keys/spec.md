# console-mcp-api-keys Specification

## Purpose
TBD - created by archiving change buildingai-console-mcp. Update Purpose after archive.
## Requirements
### Requirement: Create Console MCP API key
An authenticated console user SHALL be able to create a personal Console MCP API key bound to their user id. The system MUST return the raw secret only once at creation time and MUST persist only a non-reversible hash (plus metadata such as label, created_at, last_used_at, revoked_at).

#### Scenario: Create key
- **WHEN** a logged-in user creates a Console MCP API key with an optional label
- **THEN** the system returns the raw key once and stores only a hashed form associated with that user

### Requirement: List and revoke keys
An authenticated user SHALL be able to list their own non-sensitive key metadata and revoke any of their keys. Revocation MUST take effect immediately for subsequent MCP authentication. Users MUST NOT list or revoke another user's keys unless they are root and a future admin capability is explicitly added (phase 1: own keys only).

#### Scenario: Revoke key
- **WHEN** a user revokes one of their Console MCP API keys
- **THEN** subsequent MCP requests presenting that key are rejected as unauthorized

#### Scenario: List keys does not expose secret
- **WHEN** a user lists their Console MCP API keys
- **THEN** the response includes id, label, timestamps, and revoked status but MUST NOT include the raw secret or hash

### Requirement: Authenticate MCP with key as user
Presenting a valid Console MCP API key MUST authenticate the MCP request as the owning user with that user's live role permissions loaded for authorization (equivalent richness to console JWT sessions for permission checks). Disabled users MUST NOT authenticate successfully.

#### Scenario: Key maps to user permissions
- **WHEN** MCP authenticates with a valid key for user U
- **THEN** permission checks for tools use U's current role permissions (not an empty permission set)

#### Scenario: Disabled user
- **WHEN** the key owner account is disabled
- **THEN** MCP authentication fails even if the key is not revoked

