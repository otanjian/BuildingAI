## Purpose

Provide administrators with a secure, one-click way to connect a Feishu bot to a published standard
BuildingAI agent and operate that connection without maintaining a separate integration service.

## ADDED Requirements

### Requirement: Configure a Feishu agent channel

The console SHALL allow an authorized administrator to create or update one Feishu channel
configuration for a selected standard agent, including the Feishu app ID, Feishu app secret,
BuildingAI agent access token, and whether the channel is enabled. The console SHALL never return
either secret after it has been saved.

#### Scenario: Save a valid configuration

- **WHEN** an authorized administrator submits a selected agent and non-empty credentials
- **THEN** the system validates the required fields, stores the configuration, and returns the
  selected agent and masked credential summaries

#### Scenario: Reject an incomplete configuration

- **WHEN** an administrator submits a configuration missing an app ID, app secret, agent ID, or
  agent access token
- **THEN** the system rejects the request with a field-level validation error and does not enable
  the channel

#### Scenario: Restore the saved agent when reopening the page

- **WHEN** an administrator reopens the Feishu channel page after saving one or more channel
  configurations
- **THEN** the page preselects the saved agent associated with the configuration, displays its
  masked status metadata, and leaves secret inputs blank so saved secrets are not exposed

### Requirement: Test and operate the connection

The console SHALL provide actions to test Feishu credentials, enable or disable the channel, and
display the current connection state and the last connection error. Enabling a channel SHALL start
an outbound Feishu long connection; disabling it SHALL stop receiving events for that channel.

#### Scenario: Successful connection test

- **WHEN** an administrator tests credentials that Feishu accepts
- **THEN** the system reports success without enabling the channel or exposing an access token

#### Scenario: Failed connection test

- **WHEN** Feishu rejects the submitted credentials
- **THEN** the system reports a failure reason safe for display and leaves the prior running state
  unchanged

#### Scenario: Enable and disable

- **WHEN** an administrator enables a saved configuration
- **THEN** the connection state transitions to connecting and then connected when the long
  connection is ready
- **WHEN** the administrator disables it
- **THEN** the system stops the long connection and reports a stopped state

### Requirement: Forward Feishu messages to the standard agent

For each enabled channel, the system SHALL receive text messages from the configured Feishu bot,
call the configured standard agent through its public chat interface, and reply in the same Feishu
chat. The system SHALL preserve a stable conversation mapping per Feishu chat so subsequent messages
continue the same agent conversation.

#### Scenario: Reply to a text message

- **WHEN** a user sends a text message to the configured bot
- **THEN** the system sends the text to the selected agent in streaming mode and incrementally
  displays the agent's answer in a native Feishu streaming card in that chat

#### Scenario: Streaming card is unavailable

- **WHEN** Feishu rejects streaming-card creation or an incremental card update cannot continue
- **THEN** the system preserves the generated answer and sends it as a final text reply without
  terminating the Feishu connection

#### Scenario: Agent request fails

- **WHEN** the agent request times out or returns an error
- **THEN** the bot replies with a short retry message and records the error without terminating the
  Feishu connection

#### Scenario: Agent endpoint returns an empty or malformed response

- **WHEN** the agent endpoint or an intermediary returns an empty or non-JSON response
- **THEN** the channel records a safe diagnostic identifying the unusable upstream response and
  replies with a short retry message without throwing a JSON parsing error

#### Scenario: Duplicate event delivery

- **WHEN** Feishu retries the same event delivery
- **THEN** the system processes it at most once and does not send duplicate replies

### Requirement: Restrict supported events and protect secrets

The integration SHALL process only supported direct or group text-message events, SHALL ignore
bot-authored messages and unsupported message types, and SHALL keep app secrets and agent access
tokens out of API responses and application logs.

#### Scenario: Ignore unsupported or bot-authored event

- **WHEN** an event is not a text message or was authored by the bot itself
- **THEN** the system acknowledges or ignores the event without calling the agent or sending a reply
