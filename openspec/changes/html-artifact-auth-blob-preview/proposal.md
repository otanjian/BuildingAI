## Why

OpenCode Agent 对话已产出 HTML 报告并下发 `data-artifact` 预览 URL，但 API 鉴权只认 `Authorization: Bearer`，iframe 无法带上该头，导致预览空白、用户感觉“报告打不开”。Why now：产物已落盘且元数据正确，缺口只在前端可访问性。

**Non-goals：** 不做签名 URL / query token；不改 artifact 服务端鉴权模型；不做用户级「关闭自动打开」设置面板（用 session 去重即可）。

## What Changes

- 前端对 HTML artifact URL 使用已登录态鉴权 `fetch`，再以 blob URL 注入 `WebPreview` iframe
- 加载失败时展示可读错误状态（而非空白 iframe）
- 组件卸载或 URL 变更时释放 blob URL，避免泄漏
- 预览区提供「打开报告」操作，用 blob URL 在新标签打开
- 同一会话内同一 artifact URL 首次就绪时尝试自动新开一次（被拦截时仍可点按钮）

## Capabilities

### New Capabilities

- `html-artifact-blob-preview`: Agent 对话中 HTML 产物经鉴权拉取并以 blob URL 预览的行为与失败态

### Modified Capabilities

- （无）`opencode-agent-chat` 仍要求鉴权 artifact 接口；本变更只补前端消费方式

## Impact

- **Client：** `packages/client` ask-assistant-ui `MessageArtifacts`（及必要的 auth fetch 工具）
- **API / DB：** 无契约变更
- **Security：** 仍走现有会话鉴权；blob 仅存于浏览器内存
