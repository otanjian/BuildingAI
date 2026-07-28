## 1. Client resolver

- [x] 1.1 Add `resolveAvailableFileTypes` that unions override with feature-derived types (empty override = no uploads)
- [x] 1.2 Wire it into `useFileUpload` and add unit tests

## 2. API OpenCode upload capability

- [x] 2.1 Derive OpenCode `supportedUploadTypes` from chat model features; default include `image` when features empty / vision present
- [x] 2.2 Keep explicit `extendedConfig.supportedUploadTypes` when provided

## 3. OpenCode config UI

- [x] 3.1 Show「文件上传」toggle for third-party (OpenCode/Coze/Dify) function config
- [x] 3.2 Default `enableFileUpload` to true for newly created OpenCode agents

## 4. Verify

- [x] 4.1 Confirm vision + `["file"]` override accepts images; disabled `[]` still blocks
- [x] 4.2 Confirm debug preview shows file attach when upload is enabled
