## Purpose

Keeps the agent conversation sidebar “generating” indicator accurate when users switch chats while a reply continues in the background.

## ADDED Requirements

### Requirement: Generating indicator is per conversation stream

The system SHALL track in-flight generation independently for each Agent conversation and SHALL clear the sidebar generating indicator for a conversation only when that conversation’s stream finishes, errors, or is explicitly stopped by the user.

#### Scenario: Switch away while generating then both finish

- **WHEN** conversation A is generating and the user starts or switches to conversation B, and both streams later complete successfully
- **THEN** the sidebar MUST stop showing the generating indicator on A and on B

#### Scenario: Background stream error clears indicator

- **WHEN** a background conversation stream ends with an error after the user has switched away
- **THEN** the sidebar MUST clear the generating indicator for that conversation

#### Scenario: Explicit stop clears indicator

- **WHEN** the user stops generation for a conversation that is marked generating
- **THEN** the sidebar MUST clear the generating indicator for that conversation

### Requirement: Indicator applies on site-chat and detail

The system SHALL apply the same per-conversation generating indicator rules on both the public Agent site-chat surface and the logged-in Agent detail chat surface.

#### Scenario: Same behavior on both surfaces

- **WHEN** a user reproduces switch-while-generating on either site-chat or detail chat
- **THEN** the generating indicator MUST clear for the finished conversation on that surface
