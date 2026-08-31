## Purpose

This capability gives the OpenCode iframe the same predictable BuildingAI presentation for reasoning and tool calls as ordinary agents, while retaining the durable OpenCode session and iframe architecture as the source and renderer of the conversation.

## ADDED Requirements

### Requirement: OpenCode reasoning uses the ordinary-agent presentation

When `buildingaiEmbed=1`, the OpenCode web UI MUST render the complete assistant response for each user turn as one message-level unit and group all reasoning parts in that turn using the ordinary-agent task-row interaction pattern. The system MUST keep the iframe renderer and MUST NOT replace it with a native BuildingAI panel.

#### Scenario: Completed reasoning is displayed

- **WHEN** an OpenCode user turn contains one or more completed reasoning parts across its assistant protocol messages
- **THEN** the iframe shows a collapsed completed-thinking summary with a count and allows the user to expand it to read each reasoning part

#### Scenario: Active reasoning is displayed

- **WHEN** an OpenCode turn is streaming a reasoning part
- **THEN** the iframe shows the active reasoning group expanded while streaming

### Requirement: OpenCode tool calls use the ordinary-agent presentation

When `buildingaiEmbed=1`, the OpenCode web UI MUST group all completed tool calls belonging to the same user turn using the ordinary-agent task-row interaction pattern, while preserving OpenCode's existing individual tool renderer and each tool's name, status, input, output, and error state.

#### Scenario: Completed tool calls are displayed

- **WHEN** an OpenCode user turn contains completed tool calls across one or more assistant protocol messages
- **THEN** the iframe shows a collapsed completed-tool summary and allows the user to expand each call's details

#### Scenario: A running or failed tool call is displayed

- **WHEN** an OpenCode tool call is running or has failed
- **THEN** the chat shows the ordinary-agent tool status and the available input, output, or error details

### Requirement: OpenCode message fidelity is preserved

The iframe renderer MUST preserve the order of user messages, assistant text, reasoning, tool calls, and tool results received from the durable OpenCode session.

#### Scenario: Assistant message parts are presented as one unit

- **WHEN** one user turn contains reasoning, tool, and text parts across interleaved assistant protocol messages
- **THEN** the iframe renders those parts within one assistant-response unit, with all reasoning and tools partitioned into one standard summary each before the assistant text

#### Scenario: Historical session is loaded

- **WHEN** a user opens an existing OpenCode conversation
- **THEN** the rendered timeline contains the same ordered user and assistant content as the durable session response

#### Scenario: Live session updates arrive

- **WHEN** OpenCode publishes a new message or part while a turn is running
- **THEN** the BuildingAI timeline updates without duplicating existing parts or losing completed content
