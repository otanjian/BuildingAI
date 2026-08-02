## 1. Mapper

- [x] 1.1 Add a pure mapper from BuildingAI UIMessage `parts` → OpenCode `prompt_async` parts (text + `image/*` `FilePartInput`)
- [x] 1.2 Unit-test: image+caption, image-only, text-only, `blob:` / localhost rejection or rewrite hooks

## 2. Adapter wiring

- [x] 2.1 Extend `OpencodeApiService.promptAsync` to accept full `parts` (or text + file attachments) instead of text-only
- [x] 2.2 Update `OpencodeChatProvider` to use the mapper; allow image-only prompts; stop dropping file parts
- [x] 2.3 Implement localhost/`blob:` handling per design (rewrite to public upload URL, materialize under artifact root, or explicit error)

## 3. Verify

- [x] 3.1 Run unit tests for the mapper / adapter
- [x] 3.2 Manual smoke on OpenCode agent: paste screenshot + caption → model acknowledges image content (or tool uses extracted params)
- [x] 3.3 Confirm text-only OpenCode chats still stream normally
