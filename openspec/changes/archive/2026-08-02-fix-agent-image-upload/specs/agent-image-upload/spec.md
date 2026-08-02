## ADDED Requirements

### Requirement: Vision models allow image upload
When an agent chat model includes the `vision` feature, the chat UI MUST allow image file types for paste and upload, even if a third-party `supportedUploadTypes` list only contains `file`.

#### Scenario: Paste image with vision feature
- **WHEN** the selected agent chat model features include `vision` and the user pastes an image
- **THEN** the image is accepted and the “当前模型不支持图片类型” error is not shown

#### Scenario: File upload disabled
- **WHEN** file upload is disabled for the agent (`supportedUploadTypes` is an empty list)
- **THEN** image paste/upload remains blocked

### Requirement: OpenCode upload capability includes image for vision models
Published OpenCode agent details MUST expose `uploadCapability.supportedUploadTypes` that includes `image` when the chat model has `vision`, or when no explicit upload list is configured and features are unavailable.

#### Scenario: OpenCode agent without explicit upload list
- **WHEN** an OpenCode agent is published without `extendedConfig.supportedUploadTypes`
- **THEN** the API response includes `image` in `uploadCapability.supportedUploadTypes` if the chat model has `vision` or features are empty
