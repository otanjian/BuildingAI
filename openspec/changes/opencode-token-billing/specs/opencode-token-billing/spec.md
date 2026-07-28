## ADDED Requirements

### Requirement: OpenCode turn usage is aggregated into platform usage

The system MUST collect OpenCode-reported token fields during an Agent chat turn with `createMode: "opencode"` and map them into platform `ChatMessageUsage` (input, output, total, reasoning, cache details).

#### Scenario: Multi-step assistant turn with tools

- **WHEN** OpenCode emits one or more assistant `message.updated` events that include `tokens` for the active session during a BuildingAI turn
- **THEN** the system MUST sum those assistant message token fields into a single turn-level usage object used for that assistant reply

#### Scenario: OpenCode omits tokens

- **WHEN** the turn completes and no OpenCode assistant message included usable token fields
- **THEN** the system MUST treat usage as zero and MUST NOT invent estimated tokens

### Requirement: Usage is streamed and persisted on the assistant message

The system MUST expose turn usage to the client via the existing UI message stream and MUST persist it on the saved assistant message so history reload shows the same numbers.

#### Scenario: Successful turn finishes

- **WHEN** an OpenCode Agent stream turn finishes (including abort after partial work) and aggregated usage has been computed
- **THEN** the system MUST write a `data-usage` stream part with input/output/total (and detail fields when available) and MUST store matching `usage` on the persisted assistant message

#### Scenario: Message usage UI

- **WHEN** a user opens Token用量 for an OpenCode assistant message that has persisted or streamed usage
- **THEN** the UI MUST show the non-zero totals provided by the backend (not forced zeros when usage exists)

### Requirement: OpenCode turns deduct platform points when configured

The system MUST apply the console Agent create-type billing rule for key `opencode` the same way as Dify/Coze: when billing mode is points and points > 0, validate spendable power before the turn and deduct after usage is known.

#### Scenario: Points billing enabled

- **WHEN** OpenCode create-type billing is `points` with `points > 0`, the request is not debug, a user id is present, and aggregated `totalTokens` > 0
- **THEN** the system MUST deduct user power via the shared agent billing handler and MUST include `userConsumedPower` in `data-usage` and the persisted assistant message

#### Scenario: Free or disabled points

- **WHEN** OpenCode create-type points are 0 or billing is not points-enabled
- **THEN** the system MUST still surface token usage when available and MUST NOT deduct power

#### Scenario: Debug mode

- **WHEN** the chat request is in debug mode
- **THEN** the system MUST NOT deduct power and MUST still surface token usage when available

#### Scenario: Insufficient power

- **WHEN** points billing is enabled and the user has insufficient spendable power for the minimum pre-check
- **THEN** the system MUST reject the turn before calling OpenCode prompt with a clear insufficient-credits error
