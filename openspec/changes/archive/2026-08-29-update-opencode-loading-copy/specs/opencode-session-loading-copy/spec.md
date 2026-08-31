## Purpose

Provide a clear, accurate loading cue while the embedded OpenCode experience creates or opens the
latest conversation for the user.

## ADDED Requirements

### Requirement: Identify new-or-latest conversation loading

The embedded OpenCode chat surface MUST display the text “正在新建/打开最新会话...” in its loading
overlay while the latest conversation is being created or opened.

#### Scenario: Embedded session iframe is loading

- **WHEN** an embedded OpenCode conversation has a session URL but the iframe has not finished
  loading
- **THEN** the loading overlay shows “正在新建/打开最新会话...” next to the existing loading spinner

#### Scenario: No conversation route is available

- **WHEN** the embedded OpenCode panel is rendered without a conversation identifier
- **THEN** the panel keeps its existing empty-state behavior and does not claim that an iframe
  session is currently loading
