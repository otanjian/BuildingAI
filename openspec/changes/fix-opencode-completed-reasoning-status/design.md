## Context

See `proposal.md` and `specs/opencode-reasoning-status/spec.md`. The OpenCode source checkout used
by BuildingAI lives at `/Users/jiantan/ai_assistant/opencode`. Its embed-only reasoning renderer
already derives a reactive `streaming` value from the assistant message's `time.completed` field.
That value controls both paced markdown and whether the disclosure starts open, but the summary
always uses the in-progress translation key.

## Goals / Non-Goals

**Goals:**

- Reuse the existing assistant completion signal so the label changes at the same lifecycle boundary
  as disclosure expansion and text streaming.
- Keep the change scoped to the existing embed-only reasoning disclosure.
- Keep visible copy in the shared typed i18n dictionaries.

**Non-Goals:**

- No new polling, timers, DOM mutation bridge, or parent-to-iframe protocol.
- No inference from reasoning-part timestamps, tool states, or overall session idleness.
- No visual redesign of reasoning cards.

## Decisions

1. **Select the label from `streaming()`.** The renderer will use the current thinking key while
   `streaming()` is true and a new completed-reasoning key otherwise. This guarantees the disclosure
   label, open state, and paced rendering share one authoritative completion boundary.

   **Alternative rejected:** inspect `ReasoningPart.time.end`. The message completion timestamp is
   already the renderer's contract and avoids disagreement when provider part timing is absent.

2. **Add a shared typed i18n key.** English will define the source phrase and Simplified/Traditional
   Chinese will supply the localized completed phrase; other locales will inherit the English
   fallback until translated through their normal localization workflow.

   **Alternative rejected:** hardcode “思考完成” in the component. That would violate OpenCode's
   localization contract and show Chinese in non-Chinese locales.

3. **Extract only the label selection as a pure policy helper if needed for focused testing.** The
   helper will accept completion state and return a typed translation key, while the component still
   owns rendering.

   **Alternative rejected:** add a browser-only DOM test for a two-branch string selection. A pure
   test is faster, deterministic, and exercises the exact lifecycle policy.

## Risks / Trade-offs

- **[Risk]** The source fix is not visible in the currently running binary. → Build the managed
  OpenCode web/runtime artifact and verify the served bundle before UI smoke testing.
- **[Risk]** A locale has no completed translation yet. → The typed base dictionary supplies the
  English fallback; include both Chinese variants used by the reported flow now.
- **[Risk]** A session remains incorrectly busy for an unrelated backend issue. → The completed label
  still follows the individual assistant message timestamp and does not mask a live message.

## Migration Plan

Build and deploy the managed OpenCode runtime through the existing repository workflow. Rollback is
limited to restoring the prior runtime bundle; no data migration is required.
