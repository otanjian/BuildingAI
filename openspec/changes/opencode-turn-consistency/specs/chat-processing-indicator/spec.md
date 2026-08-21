## MODIFIED Requirements

### Requirement: Show in-progress cue while agent turn is incomplete
The chat UI MUST show one dynamic activity indicator for the active incomplete turn. A durable OpenCode turn is incomplete while its status is `accepted`, `running`, or `committing`, and its indicator MUST be keyed by `turnId`. Other streaming agent chats remain incomplete while their chat status is `submitted` or `streaming`.

#### Scenario: Durable OpenCode turn is active
- **WHEN** an OpenCode turn is `accepted`, `running`, or `committing`
- **THEN** the UI displays one activity indicator for that exact turn even after refresh or conversation switching

#### Scenario: Streaming provider turn is active
- **WHEN** a non-durable agent chat is `submitted` or `streaming`
- **THEN** the UI displays its existing animated processing indicator

#### Scenario: Mid-stream after tools or text appear
- **WHEN** a non-durable assistant turn is streaming and already has reasoning, tools, or text
- **THEN** the existing processing indicator remains below that assistant content and above the input area

#### Scenario: Waiting after send
- **WHEN** a durable OpenCode turn is `accepted` or another provider is `submitted`
- **THEN** the relevant activity indicator remains visible before final assistant content exists

#### Scenario: Turn completes
- **WHEN** the relevant durable turn becomes terminal or the relevant stream becomes `ready` or `error`
- **THEN** the activity indicator is hidden or replaced by the persisted terminal message
