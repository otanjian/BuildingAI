## Context

See proposal.md for motivation. Today `OpencodeChatProvider` builds a fixed `systemHint` (artifact root isolation) and passes it as `system` to `OpencodeApiService.promptAsync`. `agent.rolePrompt` is unused on this path. Account personal parameters live in `UserDictService` under group `personalParams` (settings UI already CRUD); nothing in the OpenCode chat path reads them.

Native agents assemble richer system prompts via `PromptBuilder`; this change does **not** reuse that full builder — only role prompt + personal-params table + existing artifact hint.

## Goals / Non-Goals

**Goals:**

- Pure helper to build the merged OpenCode `system` string (easy to unit-test without Nest wiring).
- Load `personalParams` by `userId` inside the OpenCode provider before `promptAsync`.
- Preserve empty-input behavior (artifact hint only).

**Non-Goals:**

- Approach B (`{{code}}` substitution into role prompt).
- openingStatement / quickCommands in system.
- Parity with full `PromptBuilder` (memories, tool policy, KB, form-variable expansion).

## Decisions

### 1. Merge via dedicated pure function

Extract something like `buildOpencodeSystemPrompt({ rolePrompt, personalParams, systemHint })` in an agents util module.

- **Why:** Spec scenarios map cleanly to unit tests; provider stays thin.
- **Alternative:** Inline join in provider — harder to assert without mocking the whole stream path.

### 2. Personal params as explicit system section (approach A)

Format (English headers for model consistency):

```text
## User personal parameters
Use these account-level parameters when the task needs them.
- <code>: <value>
```

- Values: stringify non-strings with `JSON.stringify`; skip entries with empty code after trim.
- **Why:** Matches product choice A; codes like `sap链接参数` remain human-readable to the model.
- **Alternative:** JSON blob — less readable for instruction-following.

### 3. Load via `UserDictService.getGroupValues(userId, "personalParams")`

Inject `UserDictService` into `OpencodeChatProvider` (same pattern as `ai-chat-completion.service` for group `"ai"`).

- Skip load when `!params.userId`.
- Failures: log + omit section (do not fail the turn); personal params are additive context.

### 4. Section order

`[rolePrompt, personalParamsSection, systemHint].filter(Boolean).join("\n\n")` with trimmed role prompt.

### 5. No client changes

Server reads user dict; chat request body does not need to carry personal params.

## Risks / Trade-offs

- **[Risk] Sensitive values (e.g. SAP connection strings) enter OpenCode/LLM context** → Accepted product choice (A); document in ops awareness; no extra redaction in this change.
- **[Risk] Large personal-params tables inflate system tokens** → Accept for v1; revisit if needed.
- **[Trade-off] No form-variable expansion on rolePrompt** → Explicit non-goal; can follow later.

## Migration Plan

- Deploy API change only; no DB migration.
- Rollback: revert provider/helper; OpenCode returns to artifact-hint-only system.

## Open Questions

None — approach A confirmed; opening/quickCommands deferred.
