## MODIFIED Requirements

### Requirement: Per-agent sensitive word configuration
The system SHALL support a per-agent sensitive-word configuration containing an enable switch, an ordered list of word-to-replacement rules, and a flag controlling whether model reasoning is also replaced. Each rule SHALL bind one non-empty literal word to its own replacement string, and an empty replacement string SHALL be valid. The system SHALL reject configurations with more than 500 rules, words longer than 128 Unicode code points, replacement strings longer than 512 Unicode code points, or duplicate words under the same ASCII case-insensitive matching semantics used at runtime.

#### Scenario: Configure sensitive words for an agent
- **WHEN** an administrator saves enabled rules mapping `机密` to `【内部信息】` and `apikey` to `***`
- **THEN** the rules are persisted on that agent and returned unchanged when the agent detail is loaded

#### Scenario: Remove matched text with an empty replacement
- **WHEN** an administrator saves a rule with a non-empty word and an empty replacement string
- **THEN** the rule is accepted and a runtime match produces no output text

#### Scenario: Reject duplicate matching words
- **WHEN** an administrator submits rules containing both `apikey` and `APIKEY`
- **THEN** the configuration is rejected with a validation error and the previously saved configuration remains unchanged

#### Scenario: Load a legacy shared-replacement configuration
- **WHEN** an agent contains the legacy word-list and shared-replacement configuration
- **THEN** every legacy word is exposed and executed as an independent rule using that shared replacement without requiring a database migration

#### Scenario: Disable filtering
- **WHEN** an administrator turns off sensitive-word replacement and later turns it on again
- **THEN** the configured rules and reasoning preference remain available, and replacement is bypassed only while disabled

### Requirement: Filter AI assistant reply text
The system SHALL replace every configured word in assistant reply text with that word's configured replacement before text reaches the user for every agent type (opencode, coze, dify, and direct agents). Matching SHALL be literal, ASCII case-insensitive, longest-match-first, left-to-right, non-overlapping, and non-cascading.

#### Scenario: Sensitive word in a single-turn reply
- **WHEN** one or more configured words occur multiple times in a completed assistant reply
- **THEN** every occurrence is replaced with the corresponding configured value

#### Scenario: Different words use different replacements
- **WHEN** an assistant reply contains `机密` and `apikey` configured with different replacement values
- **THEN** every occurrence is replaced with its corresponding configured value

#### Scenario: Empty replacement removes a match
- **WHEN** a configured word with an empty replacement appears in an assistant reply
- **THEN** the matched source text is removed without applying a default mask

#### Scenario: Sensitive word spanning streamed deltas
- **WHEN** a configured word is split across two or more streamed chunks
- **THEN** the complete match is replaced with its configured value and no partial occurrence is shown

#### Scenario: Case-insensitive matching
- **WHEN** a Latin word is configured and the reply contains a different ASCII letter casing
- **THEN** the casing variant is replaced with the configured value

#### Scenario: Overlapping sensitive words
- **WHEN** two configured words overlap at the same source position
- **THEN** the longest source match is selected and its own replacement value is emitted once

#### Scenario: Replacement output is not reprocessed
- **WHEN** one rule's replacement value contains the source word of another rule
- **THEN** the replacement value is emitted literally and is not replaced again

#### Scenario: Filtering disabled for an agent
- **WHEN** an agent has no sensitive-word configuration, has no valid rules, or has the enabled flag off
- **THEN** the assistant reply passes through unchanged

### Requirement: Filter reasoning output
The system SHALL apply the configured per-word replacements to assistant reasoning output only when the agent configuration enables reasoning replacement. Reasoning and answer text SHALL be processed as independent stream channels.

#### Scenario: Reasoning filtering enabled
- **WHEN** reasoning replacement is enabled and reasoning text contains configured words
- **THEN** each word is replaced with its own configured value in both live reasoning and persisted reasoning

#### Scenario: Reasoning filtering disabled
- **WHEN** reasoning replacement is disabled and reasoning text contains configured words
- **THEN** reasoning is streamed and persisted unchanged while answer text remains subject to replacement

#### Scenario: Reasoning ends before answer text starts
- **WHEN** a reasoning stream ends with held-back text and an answer stream starts afterward
- **THEN** the held-back reasoning is emitted as reasoning before its end event and never appears in an answer text event

### Requirement: Streaming output matches persisted history
The system SHALL produce the same replaced content from batch and streamed processing and SHALL persist exactly the replaced text and reasoning shown live, while retaining each stream part's channel and identifier.

#### Scenario: Reload conversation after filtered reply
- **WHEN** a user reloads a conversation containing a replaced assistant reply
- **THEN** persisted answer text and, when enabled, persisted reasoning match the live content exactly

#### Scenario: Multiple channel and chunk boundaries
- **WHEN** configured words span arbitrary chunk boundaries across separate reasoning and answer parts
- **THEN** each channel's concatenated streamed output equals batch replacement of that channel and no content moves between channels
