## Context

The OpenCode provider currently applies sensitive-word projection and sends the resulting object directly to TypeORM as JSONB. PostgreSQL rejects `\\u0000` in text values. The user message is persisted early, but the assistant message is persisted only at the terminal boundary, so this failure produces the refresh symptom described in the proposal.

## Goals / Non-Goals

**Goals:**

- Make assistant-message JSONB writes safe for all nested OpenCode output.
- Keep sanitization deterministic, allocation-bounded, and independent of provider-specific part types.
- Preserve the existing terminal metadata update and expose a recoverable terminal error when persistence unexpectedly fails.

**Non-Goals:**

- Do not change OpenCode event parsing or execution ownership.
- Do not rewrite existing rows or store raw invalid payloads.

## Decisions

1. Add a pure recursive JSON-safe sanitizer beside the existing sensitive-word projector. It removes C0 control characters that PostgreSQL text rejects (`NUL` and the remaining non-whitespace C0 range), while leaving tabs, newlines, carriage returns, Unicode, numbers, booleans, and null intact. Arrays and objects are copied so caller-owned stream state is not mutated.
2. Apply sensitive-word filtering first, then sanitize the final assistant message immediately before `createMessage`. This keeps policy behavior unchanged and protects every nested field, including tool arguments/results and usage metadata.
3. If the final write rejects for another reason, update conversation metadata to a terminal `persist_failed` status and log only the error class/code. The provider still completes the stream with an error finish reason; it must not leave `running` metadata.

Alternatives considered: stripping only `part.text` misses tool payloads; replacing NUL with a visible glyph changes user content; changing the database column type does not solve PostgreSQL's JSONB text restriction.

## Risks / Trade-offs

- [Risk] Removing control characters can slightly alter terminal output → Mitigation: limit removal to characters PostgreSQL cannot store and preserve whitespace controls.
- [Risk] A second database error could still prevent metadata update → Mitigation: isolate the fallback update in a best-effort guarded block and keep terminal status polling authoritative.

## Migration Plan

No schema migration. Deploy the sanitizer and provider handling, then verify with a real OpenCode/tool payload containing NUL and with the existing API test suite. Rollback is a code-only revert; historical rows are untouched.
