## Context

Assistant messages can contain many `reasoning` parts (one per model thinking step). Today `message.tsx` maps each non-empty reasoning part to its own `Reasoning` block. Even with `defaultOpen` only for the streaming step, every completed step still renders a full trigger row (“Thought for N seconds”), which stacks into tall chrome—unlike completed tools, which collapse into one `Task` summary via `partitionToolPartsForDisplay`.

Existing helpers:
- `isReasoningPartStreaming(parts, index, isStreaming)` — which step is still “thinking”
- `MessageTools` + `Task` — collapse pattern to mirror

## Goals / Non-Goals

**Goals:**
- Partition reasoning into completed vs active using the same streaming rules already used for open state.
- Collapse completed steps into one default-closed summary toggle (Chinese label matching tools).
- Keep the active streaming step outside the group, default open.
- When nothing is active, only the completed summary remains (default closed).

**Non-Goals:**
- Reordering message layout to interleave reasoning with tools/text.
- Changing provider payloads or duration metadata.
- Redesigning the shared `Reasoning` / `ReasoningTrigger` components beyond what grouping needs.

## Decisions

1. **Mirror tool partition helper**  
   Add `partitionReasoningPartsForDisplay(parts, isStreaming)` next to `reasoning-streaming.ts` (or a sibling helper module). A part is **active** iff `isReasoningPartStreaming(...)` is true; otherwise **completed** (when it has non-empty text). `shouldCollapseCompleted` when `completed.length > 0`.  
   *Alternatives:* Merge all reasoning text into one block — rejected; loses per-step duration/content. Collapse only when count > 1 — rejected; tools collapse even for one completed call, keep parity.

2. **UI composition in `message.tsx` (or thin `MessageReasoning`)**  
   - Completed → `Task` with title `已完成 N 个思考过程`, `defaultOpen={false}`, nested `Reasoning` blocks with `defaultOpen={false}` / `isStreaming={false}`.  
   - Active → standalone `Reasoning` with `defaultOpen` / `isStreaming` true.  
   Reuse `BrainIcon` + `CheckCircleIcon` styling analogous to tools’ wrench + check.  
   *Alternatives:* Only change `defaultOpen` without grouping — rejected; still leaves N trigger rows.

3. **Empty / filtered parts**  
   Keep filtering out empty/whitespace reasoning before partition (same as today).

## Risks / Trade-offs

- **[Risk] Nested collapsibles** (Task outer + Reasoning inner) may feel double-clicky → Mitigation: outer group default closed; inner steps default closed; user expands group then a step—same as tools.  
- **[Risk] Duration display inside group** still per-step → Acceptable; summary only shows count.  
- **[Trade-off] Historical messages** with many reasoning parts will also collapse after reload (all completed) → Intended.

## Migration Plan

Client-only UI change; deploy with frontend. Rollback by reverting the change. No data migration.

## Open Questions

- None blocking; copy string fixed to `已完成 N 个思考过程` for parity with tools.
