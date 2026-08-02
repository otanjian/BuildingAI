## Context

Paste/upload validation uses `useFileUpload(features, supportedUploadTypesOverride)`.
Override previously replaced features entirely. Published OpenCode agents often expose
`uploadCapability.supportedUploadTypes` as `["file"]` (or omit capability), and many
OpenCode agents have no linked chat model, so features are empty and the client
defaulted to file-only — causing false “当前模型不支持图片类型” toasts.

## Goals / Non-Goals

**Goals:**
- Allow image upload when the chat model has the `vision` feature.
- For OpenCode with no explicit upload list, include image when vision is present (and default image-capable when features are unknown).
- On the client, treat empty/unknown features as multimodal (`file` + `image`) so paste is not falsely rejected.
- Preserve “file upload disabled” → empty allow-list.

**Non-Goals:**
- Changing Coze’s full allow-list or Dify’s extracted list semantics beyond union with features.

## Decisions

1. **Client resolve**: `resolveAvailableFileTypes(features, override)`:
   - `override == null` → features only (empty features → `file` + `image`)
   - `override.length === 0` → no uploads
   - otherwise → union(override, features-derived)

2. **API OpenCode default**: When `createMode === "opencode"` and extendedConfig has no `supportedUploadTypes`, build from chat model features (`vision`→`image`, etc.), always including `file`. If features are empty, default to `["file", "image"]`.

3. **Tests**: Unit-test the client resolver for override/feature union and empty override.

## Risks / Trade-offs

- Union may allow image on a third-party agent whose sync list omitted image but BuildingAI model features include vision. Acceptable: model capability is the source of truth for BuildingAI-routed models; Dify/Coze lists remain the floor and usually match.
- Empty-features defaulting to image may allow paste on text-only models that never declared features. Prefer linking a chat model with accurate feature flags when possible.
