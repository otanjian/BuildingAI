# opencode-iframe-billing Specification

## Purpose
Ensure OpenCode conversations executed inside the retained iframe are reflected in Bowi AI token
totals and point deductions without relying on the browser or model to report completion.
## Requirements
### Requirement: Iframe billing starts from an explicit safe boundary

The system MUST initialize a durable billing boundary before returning an OpenCode iframe session
and MUST NOT automatically charge remote user turns created before that boundary.

#### Scenario: Existing session is opened after deployment

- **WHEN** an existing OpenCode session without iframe billing state is opened through Bowi AI
- **THEN** the system MUST store the current time as its billing boundary before returning the
  iframe URL
- **AND** a later reconciliation MUST ignore user turns created before that boundary

#### Scenario: Embed endpoint is polled repeatedly

- **WHEN** the same initialized iframe session requests its embed information again
- **THEN** the system MUST preserve the original billing boundary

### Requirement: Completed iframe turns are settled every 30 minutes

The system SHALL attempt reconciliation every 30 minutes and MUST settle only initialized OpenCode
iframe sessions that are idle.

#### Scenario: Idle session contains new completed turns

- **WHEN** an initialized session is idle and contains completed user turns after its durable cursor
- **THEN** the system MUST aggregate all assistant descendants belonging to each user turn
- **AND** it MUST settle those turns in chronological order

#### Scenario: Session is still running

- **WHEN** an initialized OpenCode session reports a busy or retrying status
- **THEN** reconciliation MUST defer that session without advancing its cursor or deducting points

#### Scenario: Turn has no terminal assistant result

- **WHEN** a user turn does not yet have an assistant descendant with a finish or error outcome
- **THEN** reconciliation MUST stop before that turn and preserve it for a later run

### Requirement: Iframe settlement uses the existing OpenCode points rule

For each newly completed iframe turn, the system MUST use OpenCode-reported usage and the active
OpenCode create-type points rule, including the existing 1000-token denominator and upward rounding.

#### Scenario: Points billing is enabled

- **WHEN** a completed iframe turn has positive total tokens and OpenCode points billing is enabled
- **THEN** the system MUST deduct the calculated points and add the usage and deducted points to the
  conversation totals

#### Scenario: Billing is disabled or usage is zero

- **WHEN** OpenCode points billing is disabled or the completed turn reports zero tokens
- **THEN** the system MUST advance the durable cursor and record available usage without deducting
  points

### Requirement: Iframe settlement is durable and idempotent

The system MUST atomically persist each iframe turn's deduction and billing cursor, and MUST use a
deterministic turn-scoped association identifier covered by the existing OpenCode account-log
uniqueness rule.

#### Scenario: Reconciliation repeats

- **WHEN** the same remote user turn is observed by a later reconciliation run
- **THEN** the system MUST NOT deduct points or add usage totals a second time

#### Scenario: Multiple API instances run the schedule

- **WHEN** multiple Bowi AI API instances trigger reconciliation at the same time
- **THEN** no more than one instance MUST process iframe settlement at a time

#### Scenario: One session fails

- **WHEN** an OpenCode runtime call or settlement fails for one conversation
- **THEN** that conversation's uncommitted cursor MUST remain unchanged
- **AND** other eligible conversations MUST still be processed

#### Scenario: A native durable turn owns the same remote user message

- **WHEN** a Bowi AI durable OpenCode turn already references the remote user message
- **THEN** iframe reconciliation MUST NOT create a second deduction for that message
