## Why

Users with vision-capable models still see “当前模型不支持图片类型” when pasting or uploading images in agent chat. OpenCode (and similar) agents expose `uploadCapability.supportedUploadTypes` as `["file"]` by default, and the client treats that list as a hard override that ignores model `vision` features.

Why now: blocks real multimodal usage on agents whose chat model already supports images.

## What Changes

- Derive or expand agent upload types from the chat model’s features (vision → image).
- Stop letting an incomplete third-party upload list hide model vision support on the client.
- Keep explicit empty upload lists (file upload disabled) as “no uploads.”

## Non-goals

- Changing Dify/Coze sync protocols beyond OpenCode defaults.
- Backend image processing or storage changes.

## Capabilities

### New Capabilities

- `agent-image-upload`: Correct image upload allowance when the agent chat model supports vision.

### Modified Capabilities

- (none)

## Impact

- `packages/api` agent publish detail (`uploadCapability`)
- `packages/client` `useFileUpload` / agent chat shells
