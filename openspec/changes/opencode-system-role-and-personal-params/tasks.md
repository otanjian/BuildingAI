## 1. System prompt helper (TDD)

- [x] 1.1 Add failing unit tests for `buildOpencodeSystemPrompt` covering: role only, personal params only, both (order), empty inputs → artifact hint only, non-string values stringified
- [x] 1.2 Implement `buildOpencodeSystemPrompt` (and personal-params section formatter) under `packages/api/src/modules/ai/agents/utils/`
- [x] 1.3 Run the new unit tests and confirm green

## 2. Wire OpenCode provider

- [x] 2.1 Inject `UserDictService` into `OpencodeChatProvider`; when `userId` is present, load `personalParams` (omit section on empty/anonymous; log and omit on load failure)
- [x] 2.2 Replace `system: systemHint` with merged output from `buildOpencodeSystemPrompt({ rolePrompt: agent.rolePrompt, personalParams, systemHint })`
- [x] 2.3 Ensure Nest module providers still resolve (compile / existing agent module wiring)

## 3. Verification

- [x] 3.1 Run targeted API unit tests for the new helper (and any provider-level mock of `promptAsync` if added)
- [x] 3.2 Manually or via smoke: OpenCode agent with non-empty `rolePrompt` + account personal params → turn succeeds; confirm behavior matches specs (or document manual check)
- [x] 3.3 Mark OpenSpec tasks complete after verification; run `openspec validate opencode-system-role-and-personal-params`
> Ownership reconciliation (2026-08-21): durable OpenCode execution now freezes the
> effective system instructions in the credential-free dispatch snapshot owned by
> `opencode-turn-consistency`; this change continues to own prompt composition rules.
