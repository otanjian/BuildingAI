## ADDED Requirements

### Requirement: Open root cause modal from anomaly row

The anomalies table SHALL provide a 根因分析 action that opens a modal titled with the anomaly id.

#### Scenario: Open modal

- **WHEN** user clicks 根因分析 on a row
- **THEN** modal opens with anomaly id visible in the header

### Requirement: Stream RCA via platform chat

The modal SHALL use real platform AI streaming (not timed fake steps) to display assistant analysis.

#### Scenario: Streaming content

- **WHEN** modal opens and analysis starts
- **THEN** assistant text appears incrementally in the message area

### Requirement: User follow-up in modal

The modal SHALL allow user text input and send follow-up messages in the same RCA session stream.

#### Scenario: Follow-up question

- **WHEN** user sends a follow-up in the modal
- **THEN** assistant replies in the modal conversation

### Requirement: New session per open in V1.1

Each time the modal opens, the system SHALL start a fresh RCA conversation (no restored history from prior opens).

#### Scenario: Reopen modal

- **WHEN** user closes and reopens RCA for the same anomaly
- **THEN** message history from the previous open is not shown

### Requirement: Context includes anomaly fields

The initial RCA prompt SHALL include anomaly id, rule id, description, existing root cause and solution from the row.

#### Scenario: Informed analysis

- **WHEN** RCA starts
- **THEN** first assistant turn references the anomaly description from persisted data
