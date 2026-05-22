## ADDED Requirements

### Requirement: Open platform chat without client changes

The extension SHALL open the platform AI sidebar using the existing `extension-open-chat` postMessage with a `promptQueue` containing one enhanced prompt per enabled rule, `initialDelayMs` of 3000ms, configured `modelId`, and `mcpServerIds`.

#### Scenario: Start check opens sidebar

- **WHEN** the user starts inspection from `/apps/erp-healthy`
- **THEN** the parent window opens the embedded chat panel and queues prompts for all enabled rules

### Requirement: Enhanced inspection prompt

Each queued prompt SHALL include the data item, rule method, `ruleCode`, `runId`, sequence index, and instructions requiring a single trailing JSON code block with the inspection result schema.

#### Scenario: Prompt contains metadata

- **WHEN** a prompt is sent for rule `LEAD_TIME_INVALID`
- **THEN** the user message includes `ruleCode=LEAD_TIME_INVALID` and `runId` matching the active session

### Requirement: Discover and title platform conversation

The coordinator SHALL poll platform Web APIs (not modify `packages/client`) to find the conversation created after inspection start and SHALL PATCH the conversation title to the run `sessionTitle`.

#### Scenario: Title updated in conversation list

- **WHEN** the coordinator discovers `conversationId` for the active run
- **THEN** the platform conversation title equals `数据检测 YYYY-MM-DD HH:mm:ss`

### Requirement: Poll and persist on assistant completion

The coordinator SHALL poll conversation messages until each assistant reply for the queue has `status = completed`, parse JSON from that message, and POST to the extension persist API in order.

#### Scenario: Sequential persist

- **WHEN** the third assistant message completes
- **THEN** the third enabled rule result is persisted and prior rules are already stored

#### Scenario: Stop when all rules done

- **WHEN** all N assistant messages are completed and persisted
- **THEN** the coordinator calls complete session and stops polling

### Requirement: Active session state

The extension SHALL track the active inspection in memory/sessionStorage (`runId`, `sessionTitle`, rule list, `startedAt`, `persistedCount`) until complete or page unload.

#### Scenario: Refresh during run

- **WHEN** the user reloads the dashboard during `RUNNING`
- **THEN** the coordinator MAY resume if session state and runId are still valid (best-effort)
