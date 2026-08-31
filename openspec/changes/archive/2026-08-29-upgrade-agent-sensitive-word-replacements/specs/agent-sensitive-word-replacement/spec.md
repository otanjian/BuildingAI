## MODIFIED Requirements

### Requirement: Per-agent sensitive word configuration
The system SHALL support a per-agent sensitive-word configuration containing an enable switch, an ordered list of word-to-replacement rules, a server-managed revision, and a flag controlling whether model reasoning is also replaced. Each rule SHALL bind one non-empty literal word to its own replacement string, and an empty replacement string SHALL be valid. The system SHALL reject configurations with more than 500 rules, words or replacement strings longer than 128 Unicode code points, duplicate words under the same ASCII case-insensitive matching semantics used at runtime, or a stale canonical revision.

#### Scenario: Configure sensitive words for an agent
- **WHEN** an administrator saves enabled rules mapping `机密` to `【内部信息】` and `apikey` to `***`
- **THEN** the rules are persisted on that agent and returned unchanged when the agent detail is loaded

#### Scenario: Initialize canonical revision
- **WHEN** canonical rules are first saved over legacy/null configuration with `expectedRevision: 0`
- **THEN** the server assigns stored revision 1 and does not allow create or the client to select that stored value

#### Scenario: Remove matched text with an empty replacement
- **WHEN** an administrator saves a rule with a non-empty word and an empty replacement string
- **THEN** the rule is accepted and a runtime match produces no output text

#### Scenario: Reject duplicate matching words
- **WHEN** an administrator submits rules containing both `apikey` and `APIKEY`
- **THEN** the configuration is rejected with a validation error and the previously saved configuration remains unchanged

#### Scenario: Load a legacy shared-replacement configuration
- **WHEN** an agent contains the legacy word-list and shared-replacement configuration
- **THEN** every legacy word is exposed and executed as an independent rule using that shared replacement without requiring a database migration

#### Scenario: Older client keeps editing a legacy configuration
- **WHEN** an older client strictly saves words, a shared replacement, or switches before any canonical save
- **THEN** the configuration remains legacy with upgrade baseline revision 0 and remains editable by that client

#### Scenario: Load malformed legacy entries
- **WHEN** a stored legacy list contains blanks, case-insensitive duplicates, more than 500 entries, or words longer than 128 Unicode code points
- **THEN** runtime builds a safe shared-mask set from the first 500 valid unique in-limit words, logs only redacted reason codes, and does not fail otherwise valid legacy entries

#### Scenario: Preserve legacy empty replacement semantics
- **WHEN** a legacy configuration contains an absent or empty shared replacement value
- **THEN** every legacy word continues to use `***` instead of being interpreted as an intentional deletion rule

#### Scenario: Save rules during a rolling deployment
- **WHEN** a new client saves per-word rules while an older application instance may still read the agent JSON
- **THEN** the persisted configuration includes a legacy-compatible shadow word list with a fail-closed `***` replacement, while new instances use the per-word rules as authoritative

#### Scenario: Generate the compatibility shadow on the server
- **WHEN** a canonical subresource request contains valid rules, switches, and the expected revision
- **THEN** the service persists server-derived `words` plus `replacement: "***"`, and the canonical endpoint rejects client-submitted shadow fields

#### Scenario: Two new editors change the same rules
- **WHEN** two editors load the same rule revision and the first editor saves a mapping change before the second editor
- **THEN** the first save increments the revision and the second save is rejected as stale without overwriting the first

#### Scenario: Older client changes only switches
- **WHEN** an older client submits the unchanged compatibility shadow while changing only enabled or reasoning settings on an agent with authoritative rules
- **THEN** the system preserves the authoritative per-word mappings and applies only the switch changes

#### Scenario: Older client edits legacy words
- **WHEN** an older client changes the shadow word list or shared replacement on an agent with authoritative rules
- **THEN** the update is rejected with an upgrade-required conflict and the authoritative rules remain unchanged

#### Scenario: Older client echoes canonical fields during an unrelated save
- **WHEN** an older page returns the complete canonical object it previously loaded while saving another agent setting
- **THEN** an exact current echo may change only switches, a stale echo is ignored without blocking the unrelated setting, and neither form can modify authoritative mappings

#### Scenario: Disable filtering
- **WHEN** an administrator turns off sensitive-word replacement and later turns it on again
- **THEN** the configured rules and reasoning preference remain available, and replacement is bypassed only while disabled

#### Scenario: Older client disables replacement
- **WHEN** an older client submits a null sensitive-word configuration for an agent that already has rules
- **THEN** the system preserves the existing rules and reasoning preference and stores the configuration with replacement disabled

#### Scenario: Older direct client immediately re-enables replacement
- **WHEN** an older direct-agent page has just disabled authoritative rules and then submits an enabled empty legacy default without reloading
- **THEN** the system treats the payload as re-enabling the preserved rules rather than clearing them

#### Scenario: Corrupted authoritative rules
- **WHEN** stored authoritative rules are malformed, exceed limits, or contain matching duplicates
- **THEN** the runtime does not execute a partial rule set, uses the valid fail-closed legacy shadow when available, and otherwise refuses the turn with a generic configuration error while recording a redacted diagnostic

#### Scenario: Public detail and square copy
- **WHEN** an agent with sensitive-word rules is viewed through a published-detail API or copied by another user from the square
- **THEN** the sensitive-word configuration and its dictionary are neither returned nor copied, and configured assistant display text is projected before it crosses that boundary

#### Scenario: Generic detail and square list
- **WHEN** a non-owner requests generic agent detail or anyone lists square cards
- **THEN** generic detail is denied to the non-owner and published/square responses use explicit allowlist DTOs that cannot contain the sensitive-word configuration, integration credentials, access tokens, enterprise-chat secrets, or internal prompts

#### Scenario: Copy a third-party agent
- **WHEN** another user copies a Coze, Dify, or OpenCode agent from the square
- **THEN** the copy preserves at most the provider discriminator, contains no source API key or extended connection configuration, and requires the new owner to reconnect it

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

#### Scenario: Unrelated text does not wait for the longest rule
- **WHEN** the dictionary contains a long word but the current streamed suffix is not a prefix of any configured word
- **THEN** the determinable text is emitted without retaining a fixed maximum-word-length tail

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
- **WHEN** an agent has no sensitive-word configuration, has a valid empty rule list, or has the enabled flag off
- **THEN** the assistant reply passes through unchanged

#### Scenario: Quick-command and annotation replies
- **WHEN** a custom quick-command reply or annotation reply contains a configured word
- **THEN** its live text, context projection, and persisted assistant text use the corresponding replacement

#### Scenario: Follow-up suggestions
- **WHEN** an assistant-generated follow-up suggestion contains a configured word
- **THEN** the suggestion shown to the user is replaced before emission and any saved suggestion representation uses the same projected value

#### Scenario: Human operator reply
- **WHEN** an administrator sends an operator reply containing a configured word
- **THEN** the message is replaced once before it is stored and synchronized to the visitor

#### Scenario: User-visible top-level error
- **WHEN** a top-level assistant stream error is shown to the user and contains a configured word
- **THEN** the user-visible string is replaced in a schema-valid AI SDK `errorText` chunk and the stream terminates without modifying tool-specific error payloads

#### Scenario: Error before the stream begins
- **WHEN** a chat request fails before response headers are committed
- **THEN** the server returns its standard HTTP error response instead of a malformed or partial SSE event

#### Scenario: Opening statement
- **WHEN** an agent opening statement contains a configured word in plain text, markdown, or a Plate/Slate text leaf
- **THEN** owner chat preview and published chat detail render the projected statement without changing the raw owner-editable configuration or non-text JSON fields

#### Scenario: Published custom replies remain server-side
- **WHEN** published agent detail is returned for an agent with custom quick commands
- **THEN** no quick-command configuration or reply body is returned, while invoking a matching command still returns the filtered reply from the server

#### Scenario: Copy assistant-authored configured content
- **WHEN** another user copies an enabled agent from the square
- **THEN** the copy stores projected opening statements and custom command replies while omitting the source dictionary, so it cannot later emit the original configured text

### Requirement: Filter reasoning output
The system SHALL apply the configured per-word replacements to assistant reasoning output only when the agent configuration enables reasoning replacement. Reasoning and answer text SHALL be processed as independent stream channels.

#### Scenario: Reasoning filtering enabled
- **WHEN** reasoning replacement is enabled and reasoning text contains configured words
- **THEN** each word is replaced with its own configured value in both live reasoning and persisted reasoning

#### Scenario: Reasoning filtering disabled
- **WHEN** reasoning replacement is disabled and reasoning text contains configured words
- **THEN** reasoning content is streamed and persisted unchanged while its part lifecycle remains valid and answer text remains subject to replacement

#### Scenario: Reasoning ends before answer text starts
- **WHEN** a reasoning stream ends with held-back text and an answer stream starts afterward
- **THEN** the held-back reasoning is emitted as reasoning before its end event and never appears in an answer text event

#### Scenario: Multiple parts of the same channel
- **WHEN** two text parts or two reasoning parts use different stream IDs during a multi-step turn
- **THEN** each part is matched and flushed independently and characters from different IDs never form a match

#### Scenario: Duplicate start for an open part ID
- **WHEN** a producer emits a new text-start or reasoning-start using an ID that is still open
- **THEN** the previous part's held-back content and synthetic end are emitted before the new start, and the two logical parts are never matched together

#### Scenario: Delta arrives without a start
- **WHEN** a text or reasoning delta has a valid part ID but no matching start event
- **THEN** the adapter emits a synthetic matching start and filters the delta normally; a delta without a usable ID is never passed through raw and ends with a generic safe error

#### Scenario: Unmatched end event
- **WHEN** a text-end or reasoning-end has no open matching part
- **THEN** the malformed end is suppressed and does not close or flush another part

### Requirement: Streaming output matches persisted history
The system SHALL produce the same replaced content from batch and streamed processing and SHALL persist exactly the replaced text and reasoning shown live, while retaining each stream part's channel and identifier.

#### Scenario: Reload conversation after filtered reply
- **WHEN** a user reloads a conversation containing a replaced assistant reply
- **THEN** persisted answer text and, when enabled, persisted reasoning match the live content exactly

#### Scenario: Configuration changes during a turn
- **WHEN** an administrator edits replacement rules while an assistant turn is already running
- **THEN** that turn uses its start-time validated policy snapshot for both live projection and persistence, and the next turn uses the newer saved rules

#### Scenario: Multiple channel and chunk boundaries
- **WHEN** configured words span arbitrary chunk boundaries across separate reasoning and answer parts
- **THEN** each channel's concatenated streamed output equals batch replacement of that channel and no content moves between channels

#### Scenario: Semantic boundary arrives before a part end
- **WHEN** an open text or reasoning part is followed by a new top-level `start`, `start-step`, `finish-step`, `finish`, `abort`, a top-level error, or stream EOF without its matching end event
- **THEN** all held-back content and a synthetic matching part-end are emitted with the original part type and ID before the boundary so no content crosses steps and no client part remains permanently streaming

#### Scenario: Chunk arrives after a terminal event
- **WHEN** a producer emits another chunk after `finish`, `abort`, or a top-level error
- **THEN** the late chunk is discarded and cannot reopen or append to the terminated assistant message

#### Scenario: Too many parts remain open
- **WHEN** a malformed producer opens more than 32 text/reasoning parts without closing them
- **THEN** the adapter closes buffered states, emits one generic safe error, terminates, and does not allocate another part state

#### Scenario: Tool-approval continuation
- **WHEN** a direct-agent assistant message continues after a tool approval response
- **THEN** the server accepts only the approval decision into its persisted assistant prefix, permits expected tool-state transitions, replaces newly generated user-visible content exactly once, never reprocesses the previously persisted text/reasoning prefix, and stores history matching the continuation shown live

### Requirement: Out-of-scope content is not filtered
The system SHALL NOT modify tool call inputs or outputs (including execution-plan tool output), tool-specific error payloads, generated HTML artifact files, source/file parts, user input messages, or configured opening questions that act as user-input templates. Filtering SHALL use an explicit allowlist of user-visible chat reply fields rather than recursively traversing arbitrary data.

#### Scenario: Tool call content passes through unchanged
- **WHEN** an assistant message includes tool input, output, or a tool-specific error
- **THEN** those payloads are streamed and persisted without replacement

#### Scenario: User input passes through unchanged
- **WHEN** a user sends a message containing a configured word
- **THEN** the user message is stored and displayed without replacement

#### Scenario: Unknown data part passes through unchanged
- **WHEN** an assistant stream contains a data part not explicitly included in the replacement allowlist
- **THEN** the data part passes through unchanged

## ADDED Requirements

### Requirement: Configuration editing is race-safe
The system SHALL save sensitive-word drafts through a dedicated per-agent subresource with optimistic revision checks, independently from the general agent form autosave. The editor SHALL debounce and serialize its own saves, and an older response or detail refetch SHALL NOT replace a newer local draft. A failed save SHALL preserve the latest draft and expose a retryable error state.

#### Scenario: Edit while an earlier save is in flight
- **WHEN** an administrator changes a replacement rule after revision N has been sent but before revision N completes
- **THEN** the next local snapshot is saved after N using N's acknowledged server revision, and the response or refetch for N does not overwrite the newer draft

#### Scenario: Rule save fails
- **WHEN** the API rejects or fails to save the current valid rule revision
- **THEN** the current rows remain editable, the previous server configuration remains intact, and the UI indicates that the latest revision is unsaved

#### Scenario: A rule row is temporarily invalid
- **WHEN** an administrator is editing a row whose word is blank, duplicate, or over its limit
- **THEN** the full row draft remains visible, no sensitive-word configuration is sent, and unrelated valid configuration fields may continue autosaving without the invalid intermediate rules

#### Scenario: Disable while a rule draft is invalid
- **WHEN** replacement is enabled and an administrator turns it off while local rule rows are invalid
- **THEN** the client disables the last acknowledged valid policy without sending the invalid rows, preserves the local draft, and rebases it to the returned revision

#### Scenario: Save an unrelated setting
- **WHEN** an administrator changes another agent setting without changing the acknowledged sensitive-word policy
- **THEN** the general agent update omits sensitive-word configuration and cannot overwrite rules or conflict with a newer rule revision from another editor

#### Scenario: Delayed non-sensitive update completes after a rule save
- **WHEN** an agent update or third-party synchronization loaded the agent before a newer sensitive revision and writes its unrelated result afterward
- **THEN** ORM metadata excludes the sensitive JSON column from that update and the newer sensitive configuration remains byte-for-byte unchanged

#### Scenario: Navigate to another agent during autosave
- **WHEN** an administrator navigates to a different agent while a debounce timer or save request belongs to the previous agent
- **THEN** navigation waits for the previous valid draft to save successfully, blocks with retry/discard on failure, and any late completion remains scoped to the previous agent

#### Scenario: Navigate with an invalid draft
- **WHEN** an administrator attempts to leave the agent while replacement rows are invalid and therefore unsaved
- **THEN** navigation is blocked with a choice to continue editing or discard the invalid draft

#### Scenario: Close or reload the browser with unsaved rules
- **WHEN** a sensitive draft is dirty or saving and the administrator closes or reloads the page
- **THEN** the browser's native unsaved-change confirmation is shown so the draft is not silently lost
