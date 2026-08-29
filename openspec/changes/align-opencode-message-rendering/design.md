## Context

The repository has an iframe-based OpenCode conversation surface. The iframe already owns the durable OpenCode session timeline, while BuildingAI's ordinary agent surface groups completed reasoning and tools behind task rows. The embedded OpenCode timeline currently renders each reasoning part and most tool calls independently, which makes the same work look different.

## Goals / Non-Goals

**Goals:**

- Keep the iframe as the single conversation renderer and preserve its session URL, lifecycle, and live updates.
- Align only the embedded timeline's grouping, disclosure state, and visual treatment with ordinary BuildingAI reasoning/tool rows.
- Preserve the OpenCode workspace/file interactions and conversation/session binding.

**Non-Goals:**

- No changes to OpenCode's model or tool execution runtime.
- No changes to shared ordinary-agent component styling.
- No migration of historical message data.

## Decisions

1. **Keep the iframe contract unchanged.** Do not change the iframe URL, server proxy, session ownership, or parent/child lifecycle. The change is limited to OpenCode's embedded web UI.

2. **Render at user-turn granularity.** In embed mode, create one assistant timeline unit for the complete durable assistant response belonging to a user turn (including protocol-level assistant messages produced across tool loops). Within that unit, aggregate every reasoning part into one summary and every tool call into one summary before rendering the assistant text. This matches the ordinary agent's single-response layout instead of exposing protocol message/part boundaries.

3. **Reuse OpenCode detail renderers.** Keep the existing tool-specific `MessagePart` renderers for input, output, errors, and permissions inside the new group content instead of mapping the session to a second protocol.

4. **Match ordinary-agent affordances.** Use the same summary semantics (completed count, task-style disclosure, left-border content, and active expansion) while retaining OpenCode's SolidJS/theme primitives.

5. **Preserve non-embed behavior.** The new grouping path is enabled only when `buildingaiEmbed=1`; ordinary OpenCode routes keep their existing grouping and disclosure rules.

## Risks / Trade-offs

- Grouping rows changes only disclosure and nesting; the underlying OpenCode part order and tool-specific renderers remain unchanged.
- If a future OpenCode tool introduces a new status, it remains visible as an individual `MessagePart` inside the completed/running group.
- Existing non-embed routes are unaffected because the grouping option is opt-in.

## Migration Plan

Build the OpenCode web package, run focused grouping/UI tests and type checks, then browser-verify the existing iframe session. Rollback is reverting the embed-only grouping changes; the iframe contract remains intact throughout.
