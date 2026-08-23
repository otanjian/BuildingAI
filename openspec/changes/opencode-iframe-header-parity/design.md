## Context

The BuildingAI OpenCode layout already owns local conversation history and embeds the OpenCode Web session in an iframe. Because the iframe is a separate web origin/port, BuildingAI cannot safely style or remove OpenCode's internal titlebar from the parent document. The embed URL therefore needs an explicit mode understood by the OpenCode Web application.

## Goals / Non-Goals

**Goals:**

- Reuse one BuildingAI header component for the ordinary and OpenCode chat branches.
- Keep the iframe content focused on OpenCode messages, composer, tasks, tools, files, and questions.
- Make the behavior opt-in through a URL marker so normal OpenCode Web remains unchanged.
- Keep the sidebar and back actions in the parent React application.

**Non-Goals:**

- Do not clone OpenCode's session tab implementation into BuildingAI.
- Do not add cross-frame message protocols for ordinary header actions.
- Do not change session mapping, authentication, prompt transport, or non-OpenCode providers.

## Decisions

1. **Explicit query marker.** Add `buildingaiEmbed=1` to the server-generated iframe URL. This is credential-free, easy to test, and does not affect the canonical route or session ID.
2. **Shared parent header.** Extract the existing BuildingAI header controls into a small component and render it above the iframe. It receives `panelExpanded`, `onTogglePanel`, `onBack`, and agent identity props so both chat branches use identical markup and behavior.
3. **OpenCode titlebar gate.** Read the marker in the OpenCode app shell and pass an `embedded` flag to the titlebar. In embedded mode the titlebar slot remains structurally present only as a zero-height hidden element, avoiding layout shifts while removing tabs and home/new-session actions.
4. **Do not crop the iframe.** Negative margins or clipped iframe wrappers would hide keyboard focus and responsive content. The source-level gate gives OpenCode Web a normal layout viewport and preserves its internal renderer.

## Risks / Trade-offs

- [Risk] A stale OpenCode binary could continue showing the old titlebar. → Rebuild the managed 1.18.19 binary with the web UI bundle and restart the OpenCode runtime.
- [Risk] Query parsing can diverge between legacy and new OpenCode layouts. → Gate the shared `Titlebar` component at the shell, covering both layouts, and add a focused helper test.
- [Risk] Header markup drift could reintroduce differences later. → Keep one parent header component and use DOM/visual smoke verification for an OpenCode iframe.

## Migration Plan

Build the OpenCode single binary, restart the OpenCode process, rebuild/restart the BuildingAI client, and verify an OpenCode conversation plus a non-OpenCode conversation. Rollback consists of removing the embed marker and parent iframe header, then rebuilding the previous binary.
