## Context

OpenCode Agent 已通过 `data-artifact` 下发鉴权预览 URL，前端用 `WebPreview` iframe 直接加载。API `AuthGuard` 只从 `Authorization: Bearer` 取 token，iframe 无法附带该头，预览恒为 401。产物文件与消息元数据均已正确。

## Goals / Non-Goals

**Goals:**

- 用当前会话可用鉴权头 `fetch` HTML 产物，再以 blob URL 注入 iframe
- 失败时展示明确错误，而非空白框
- 卸载 / URL 变更时 `revokeObjectURL`
- 发布站（publish accessToken）与登录工作台均能预览（artifact GET 启用与 chat 同级的 AgentPublicAccess）
- 提供「打开报告」入口；同会话同 URL 首次就绪时尝试自动打开一次

**Non-Goals:**

- 签名 URL / query token
- 用户设置里的「关闭自动打开」开关
- 改写 HTML 内相对资源路径（CDN/内联脚本报告可预览；本地相对资源另议）

## Decisions

### 1. Auth fetch → blob URL（方案 A）

- **Choice:** `fetch(absoluteUrl, { headers: { Authorization, X-Anonymous-Identifier? } })` → `blob()` → `URL.createObjectURL` → iframe `src`
- **Alternatives:** query token（安全面更大）；cookie 会话（改动全局鉴权）
- **Rationale:** 最小改动、复用现有 Bearer 模型

### 2. Token 解析

- **Choice:** 发布站路径上优先用 publish `accessToken`；工作台用 `useAuthStore` JWT；匿名头读 `buildingai_anon_id`
- **Rationale:** `MessageArtifacts` 被工作台与 site-chat 共用。若优先 JWT，过期/无效会话 token 会盖住 URL 里的 publish token，发布站预览仍 401。工作台路径段（`chat`/`c`/`configuration` 等）不得被当成 accessToken
- **Also:** iframe 的 `WebPreview` `defaultUrl` 必须为空；`WebPreviewBody` 会回退到 context url，把鉴权 API 路径塞进 iframe 会直接渲染 40200 JSON

### 3. 发布站可访问 artifact API

- **Choice:** 给 artifact GET 加 `@AgentPublicAccess`，与消息列表等同，使 publish Bearer 可进 `AgentGuard`
- **Rationale:** 仅前端 fetch 仍无法用 accessToken 过 AuthGuard；属 A 落地所必需的最小后端配套

### 4. 打开报告 + 一次性自动打开（方案 C）

- **Choice:** 预览标题栏提供「打开报告」按钮，`window.open(blobUrl)`；blob 就绪后对每个 artifact API URL 用 `sessionStorage` 去重，自动尝试打开一次
- **Alternatives:** 只做按钮不做自动打开；用 API URL 新开（仍 401）
- **Rationale:** 对齐「自动打开或给出打开链接」；blob 与 iframe 同源可访问；去重避免历史回放反复弹窗

## Risks / Trade-offs

- **[Risk] 相对路径 CSS/JS 在 blob 源下失效** → Mitigation: MVP 接受 CDN/内联报告；后续可 rewrite 或同源代理
- **[Risk] 大 HTML 占内存** → Mitigation: 单报告量级可接受；卸载 revoke
- **[Risk] 并发多预览** → Mitigation: 每 URL 独立 blob，按 key 管理
- **[Risk] 浏览器拦截非手势 `window.open`** → Mitigation: 始终保留「打开报告」按钮

## Migration Plan

1. 部署 API（PublicAccess）+ client 同步
2. 回滚：去掉 PublicAccess / 还原 MessageArtifacts 即可
