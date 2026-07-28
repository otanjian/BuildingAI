## Why

OpenCode agents (e.g. SAP智能助手) accept image uploads in the BuildingAI chat UI and persist file parts correctly, but the OpenCode adapter only forwards plain text to `prompt_async`. Users see a thumbnail and ask the agent to read the screenshot; the model replies that it never received an image. Why now: production evidence on `ai.bosofts.com` confirmed a public PNG was stored and reachable, while OpenCode only got the caption text.

## What Changes

- Forward user image (and other eligible file) attachments from BuildingAI UIMessage parts into OpenCode `prompt_async` parts (`FilePartInput`: `type`, `mime`, `url`, optional `filename`).
- Keep text extraction for titles / empty-content checks; do not drop file parts when text is present.
- Prefer HTTP(S) URLs already stored on uploads; optionally materialize into the conversation artifact workspace when OpenCode cannot fetch the public URL (127.0.0.1 / private network cases).
- Surface a clear error or user-visible note when attachments cannot be forwarded (instead of silently ignoring images).

**Non-goals**

- Changing Direct/Dify/Coze multimodal paths (already use BuildingAI or their own file APIs).
- Adding a separate OCR tool for screenshots.
- OpenCode TUI / client changes outside BuildingAI’s HTTP adapter.
- Replacing OpenCode model selection or vision capability detection on the OpenCode side.

## Capabilities

### New Capabilities

- `opencode-prompt-attachments`: Map BuildingAI chat file parts into OpenCode prompt file parts so multimodal user input reaches the remote session.

### Modified Capabilities

- (none in `openspec/specs/`; related OpenCode chat behavior lives under the in-progress `opencode-agent-integration` change and is extended here as a focused follow-up.)

## Impact

- **API:** `OpencodeApiService.promptAsync`, `OpencodeChatProvider` (extract + map parts)
- **OpenCode:** consumes existing `FilePartInput` / prompt parts schema (already documented on local `/doc`)
- **Ops:** OpenCode process must be able to read attachment URLs (public `APP_DOMAIN` or local file URI under workspace)
- **Client:** no UI change required if uploads already produce `file` parts; optional toast if forwarding fails
