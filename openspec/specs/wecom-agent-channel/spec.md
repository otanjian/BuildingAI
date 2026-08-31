# wecom-agent-channel Specification

## Purpose
Provide administrators with a secure and observable way to connect WeCom intelligent robots to
published standard Bowi AI agents while preserving continuous text conversations.
## Requirements
### Requirement: Administrators can manage WeCom robot connections

The console SHALL let an authorized administrator list, create, edit, test, enable, disable, and
delete named WeCom robot connections. Each connection MUST bind one WeCom BotID to one published
standard agent, and the same normalized BotID MUST NOT be bound to multiple connections.

#### Scenario: Create a connection

- **WHEN** an administrator submits a unique BotID, Bot Secret, connection name, supported Agent,
  and Agent access token
- **THEN** the system stores the connection disabled and returns non-sensitive connection metadata

#### Scenario: Reject an unsupported Agent

- **WHEN** an administrator creates, tests, or enables a connection for a non-standard Agent
- **THEN** the system rejects the operation without starting a WeCom listener

#### Scenario: Reject a duplicate BotID

- **WHEN** an administrator submits a BotID already owned by another connection
- **THEN** the system rejects the operation and does not disclose stored credentials

#### Scenario: Operate one connection independently

- **WHEN** an administrator enables, disables, or deletes one connection
- **THEN** only that connection's runtime and status change while other connections remain active

### Requirement: WeCom text messages reach the bound standard Agent

For every enabled connection, the system SHALL receive supported direct and group text messages,
invoke the bound standard Agent through its published streaming chat contract, and reply in the
originating WeCom conversation. It SHALL maintain independent conversation continuity for each
connection and chat scope.

#### Scenario: Reply to a direct text message

- **WHEN** a user sends text to an enabled robot in a direct conversation
- **THEN** the system streams the bound Agent's answer into that direct conversation

#### Scenario: Reply to a group text message

- **WHEN** a user sends text to an enabled robot in a group conversation
- **THEN** the system streams the bound Agent's answer into that group conversation

#### Scenario: Continue an existing conversation

- **WHEN** the same WeCom conversation sends another message after receiving an Agent reply
- **THEN** the system supplies the previously returned Agent conversation identifier so context is
  preserved

#### Scenario: Ignore an unsupported message

- **WHEN** the robot receives a media message or unsupported event
- **THEN** the system does not invoke the Agent and does not create a text conversation mapping

### Requirement: Streaming replies are rate-safe and finalized

The system SHALL project accumulated Agent text into one native WeCom stream, throttle refreshes to
respect WeCom conversation limits, finalize every successfully started stream, and present a short
safe failure message when generation fails.

#### Scenario: Agent produces incremental text

- **WHEN** the published Agent produces multiple text deltas
- **THEN** the system updates one WeCom stream with accumulated content and finishes it with the
  complete answer

#### Scenario: Agent request fails after streaming starts

- **WHEN** generation fails after the WeCom stream was created
- **THEN** the system attempts to finalize the same stream with a safe retry message and records a
  credential-redacted diagnostic

#### Scenario: Agent answer exceeds WeCom stream size

- **WHEN** the generated answer exceeds the supported WeCom streaming payload size
- **THEN** the system safely truncates the visible response, marks it as truncated, and finalizes
  the stream without sending an invalid payload

### Requirement: Delivery and runtime ownership are reliable

The system SHALL process a WeCom message identifier at most once per connection and SHALL ensure
that at most one API instance owns an enabled robot's long connection at a time. Losing runtime
ownership or disabling the connection MUST stop subsequent message handling on that instance.

#### Scenario: Duplicate message callback

- **WHEN** WeCom delivers the same message identifier more than once to one connection
- **THEN** only the first delivery invokes the Agent and sends a reply

#### Scenario: Two instances restore one connection

- **WHEN** two API instances attempt to restore the same enabled connection
- **THEN** only the instance holding that connection's runtime lease starts the WeCom listener

#### Scenario: Restore runs after database upgrades

- **WHEN** the API starts on an installation where the WeCom connection migration is pending
- **THEN** the system completes database initialization before querying and restoring enabled WeCom
  connections

#### Scenario: Runtime lease is lost

- **WHEN** an active instance can no longer renew the connection lease
- **THEN** it disconnects its local listener and stops processing new callbacks for that connection

### Requirement: Credentials and runtime data remain protected

The system MUST encrypt stored Bot Secrets and Agent access tokens and MUST NOT expose raw secrets
in list, detail, test, status, error, or log output. Conversation, idempotency, lease, and deletion
state MUST be isolated by connection identifier.

#### Scenario: Read connection details

- **WHEN** an administrator opens a saved connection
- **THEN** the response reports whether credentials are present without returning either credential

#### Scenario: Update non-secret fields

- **WHEN** an administrator edits a connection and leaves secret inputs blank
- **THEN** the existing stored credentials are preserved

#### Scenario: Delete a connection with an in-flight answer

- **WHEN** a connection is deleted while an Agent answer is still being generated
- **THEN** the deleted connection sends no subsequent stream updates and cannot accept new events
