## Context

The iframe points directly at OpenCode Web, so BuildingAI's legacy provider prompt composition is not involved. OpenCode supports arbitrary session metadata but does not currently interpret application-specific metadata as system context.

## Goals / Non-Goals

**Goals:**

- Build a bounded, sanitized context snapshot in the authenticated BuildingAI API.
- Attach it to the OpenCode session without adding a visible message.
- Make OpenCode's runner include it on every turn.

**Non-Goals:**

- Sending BuildingAI passwords, tokens, or cookies to OpenCode.
- Rewriting existing conversation messages.
- Changing non-OpenCode agent types.

## Decisions

### 1. Session metadata is the hand-off boundary

The embed-session endpoint loads `UserPlayground.username`, personal parameters, and the agent sensitive-word config, then stores a sanitized string under a namespaced metadata key. This avoids a bootstrap prompt that would be visible and persisted as user content.

### 2. Reuse the canonical sensitive-word filter

The API formats the context with stable English section labels and filters the complete rendered text once using `createSensitiveWordFilter`. Replacement output is non-cascading by the existing engine. Context is capped to a conservative size to prevent accidental token amplification.

### 3. OpenCode runner appends metadata context

The OpenCode session runner reads only the namespaced string metadata key and appends it after ordinary agent/system instructions. Missing or malformed metadata is ignored. The OpenCode server is rebuilt from the workspace source so the managed 1.18.19 runtime has this behavior.

### 4. Do not transfer authentication secrets

Only `username` is copied from the login playground. Personal parameter values are policy-filtered as requested; keys that are clearly authentication material (`password`, `token`, `secret`, `apiKey`, `authorization`) are represented with a fixed masked value rather than forwarded in clear text.

## Risks / Trade-offs

- [Risk] Personal parameters may be large → cap rendered context and log only IDs/counts.
- [Risk] OpenCode runtime drift → add a source-level unit test and verify the managed binary/version after rebuild.
- [Risk] Existing sessions lack metadata → treat the field as optional and preserve normal behavior.

## Migration Plan

Deploy the BuildingAI API and rebuilt OpenCode runtime together. Existing sessions continue normally; new iframe sessions receive the snapshot. Rollback is safe because unknown metadata is ignored by older OpenCode runtimes.
