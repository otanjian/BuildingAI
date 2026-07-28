## Context

OpenCode agents already stream chat via `OpencodeChatProvider` → `OpencodeApiService.promptAsync`. Spike notes and the current client only send `{ parts: [{ type: "text", text }] }`. BuildingAI UIMessages may include `type: "file"` parts with `url` + `mediaType` (images uploaded to `/uploads/...`). OpenCode’s OpenAPI already defines `FilePartInput` (`type: "file"`, `mime`, `url`, optional `filename`).

Production incident (SAP智能助手): UI and DB had a public PNG; OpenCode received only the Chinese caption; the model claimed no image was provided.

## Goals / Non-Goals

**Goals:**
- Map user `file` parts (at least `image/*`) into OpenCode prompt `parts` alongside text.
- Preserve current text-only behavior when no files are attached.
- Prefer the stored public HTTPS upload URL when OpenCode can fetch it (same host as `APP_DOMAIN`).
- Fail loudly enough that silent “no image” regressions are avoidable in tests.

**Non-Goals:**
- OCR pipeline or dedicated vision tools.
- Changing Direct agent multimodal handling.
- OpenCode model feature detection / forcing a vision model.
- Client upload UX changes (already fixed by `fix-agent-image-upload`).

## Decisions

1. **Pass OpenCode `FilePartInput` in `parts[]`, not PromptInput.files alone**  
   Current adapter posts `parts` to `prompt_async`. OpenCode accepts file parts in that array (`FilePartInput`). Keep one code path: build `parts = [textPart, ...fileParts]`.  
   *Alternative:* use a higher-level `files` field if present on some prompt shapes — rejected for MVP because spike and live client already use `parts`.

2. **Use BuildingAI upload URL as `url` when it is http(s) and not localhost**  
   Matches production (`https://ai.bosofts.com/uploads/...`). OpenCode on the same machine can fetch via public hostname (verified with curl).  
   *Fallback:* if URL is `localhost` / `127.0.0.1` / `blob:` / missing, download or copy into `artifactRoot/attachments/` and pass a `file://` or workspace-relative URI OpenCode accepts — only if OpenCode FilePart `url` allows it (confirm against live schema; prefer rewriting to `APP_DOMAIN` public URL when files are already on disk under `storage/uploads`).

3. **Include `image/*` always; other MIME types optional**  
   Scope this change to images first (the reported bug). Non-image files can remain text-extracted by BuildingAI elsewhere or be forwarded later if OpenCode handles them.  
   *Alternative:* forward all `file` parts — deferred to avoid surprising binary dumps into coding agents.

4. **Empty text + image is allowed**  
   Today provider throws if `userText` is empty. After this change, allow prompts that are image-only (or image + whitespace) as long as at least one file part is forwarded.

5. **Unit-test the mapper; smoke against OpenCode `/doc` schema**  
   Pure function: UIMessage parts → OpenCode parts. Provider/integration tests mock `promptAsync` and assert file parts appear.

## Risks / Trade-offs

- **[Risk] OpenCode or upstream model lacks vision** → Mitigation: still forward parts; product may switch model (`volcengine/ark-code-latest` already used). Do not block upload.
- **[Risk] OpenCode cannot fetch public URL (hairpin / DNS)** → Mitigation: fallback copy into artifact workspace + local URI; log warning.
- **[Risk] SSRF if we re-fetch arbitrary user URLs into workspace** → Mitigation: only accept BuildingAI-owned upload URLs or already-validated message parts from our upload pipeline; do not fetch arbitrary remote hosts beyond those parts.
- **[Risk] Large images inflate OpenCode context** → Mitigation: rely on OpenCode `ImageAttachmentConfig` / model limits; no extra resize in MVP unless needed.

## Migration Plan

1. Deploy API change; no DB migration.
2. Smoke: OpenCode agent + paste SAP login screenshot → model references visible fields / calls connect tools.
3. Rollback: revert adapter to text-only `parts` (previous behavior).

## Open Questions

- Exact `url` forms OpenCode accepts for local files (`file://` vs relative workspace path) if public fetch fails — resolve during implementation against a live `prompt_async` trial.
- Whether to forward `application/pdf` in the same mapper in a fast follow-up.
