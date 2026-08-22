## ADDED Requirements

### Requirement: Persist a pending OpenCode question

The system MUST expose the currently pending OpenCode question, including its request identifier,
session identifier, question text, header, options, multiple-selection flag, and custom-answer flag,
in the active turn status. The value MUST be recoverable by a fresh status request after a browser
refresh.

#### Scenario: Question arrives while a turn is running

- **WHEN** OpenCode reports a pending question for the active session
- **THEN** the worker keeps the turn active and the status response contains that question
- **AND** the worker MUST NOT reject or abort the turn automatically

### Requirement: Resolve a pending question

The system MUST provide owner-authorized reply and reject operations for the active turn's exact
pending question. A reply MUST send OpenCode answers as an array of string arrays in question order.
A stale request identifier MUST be rejected without mutating another question or turn.

#### Scenario: User submits selected answers

- **WHEN** the owner submits answers for the displayed question
- **THEN** OpenCode receives the answers and the operation succeeds
- **AND** subsequent turn status no longer reports that question once OpenCode has consumed it

#### Scenario: User ignores the question

- **WHEN** the owner chooses ignore
- **THEN** OpenCode receives a reject operation and the turn remains recoverable until the remote
  session settles

### Requirement: Render questions in agent conversations

The authenticated detail chat and public chat MUST render a pending question inline with an OpenCode
conversation, including legacy streaming conversations. The UI MUST support radio selection for
single-select questions, checkbox selection for multi-select questions, an optional custom answer,
submit, and ignore. Refreshing the page MUST restore the same question from durable turn status or
legacy conversation metadata.

#### Scenario: Question is restored after refresh

- **WHEN** a conversation page is refreshed while its turn is waiting for a question answer
- **THEN** the question card is rendered without resubmitting the turn
- **AND** answer controls remain usable for the conversation owner

#### Scenario: Question arrives on the legacy stream

- **WHEN** the legacy OpenCode event stream emits `question.asked`
- **THEN** the conversation renders the structured question card instead of a generic `question Running` tool row
- **AND** submitting or ignoring the card calls the matching OpenCode question operation

#### Scenario: Legacy question is restored after refresh

- **WHEN** a legacy conversation page is refreshed while OpenCode is waiting for an answer
- **THEN** the question card is reconstructed from conversation metadata
- **AND** answering it continues the same OpenCode session

#### Scenario: A new conversation receives a v2 question event

- **WHEN** a newly created legacy conversation receives `question.v2.asked` or an equivalent
  OpenCode SSE payload whose question data is under `data`
- **THEN** the event bridge normalizes it to the same pending-question shape as `question.asked`
- **AND** the question card is rendered without requiring a page refresh or a second user turn

#### Scenario: Historical question tool parts are replayed

- **WHEN** a refreshed conversation contains a persisted OpenCode `question` tool part
- **THEN** the part is not rendered as a generic `question (running)` tool row
- **AND** the structured pending-question card remains the sole interactive representation
