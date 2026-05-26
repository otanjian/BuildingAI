## Why

ERP 数据健康自治系统（EHCS-AI）需要在 BuildingAI 上交付 V1.1：驾驶舱、规则维护、异常明细、一键 AI 检查与单条根因分析。产品规格见 `docs/PRD-ehcs-ai.md`，交互原型见 `docs/UI-EHCS-AI.html`。当前仓库无独立 EHCS 扩展，且实现不得复用 `extensions/erp-healthy` 的 postMessage / Coordinator 模式。

## Why now

PRD 与 UI 原型已就绪；平台已具备扩展机制、PostgreSQL 隔离 schema、以及带 MCP 的流式对话 API（`/api/ai-chat`）。可在不修改主应用聊天核心的前提下，以新扩展 `ehcs-ai` 打通前后端并对接真实 AI。

## What Changes

- 新建 **独立应用扩展** `extensions/ehcs-ai`（identifier: `ehcs-ai`），入口 **`/extension/ehcs-ai`**（不依赖 `/apps/ehcs-ai` 父壳侧栏）。
- 三页面：驾驶舱（70% 看板 + 30% 内置流式对话）、规则 CRUD、异常列表与筛选。
- PostgreSQL schema `ehcs_ai`：`check_rules`、`check_results`、`check_runs`、`check_run_items`、`app_settings`（及可选 `rca_sessions`）。
- **一键检查**：创建 `check_run`；每条已启用规则 **独立 platform conversation**；前端流式调用平台 AI（透传 `mcpServerIds`）；结束后 **ingest** 解析 PRD §5.1 JSON 落库。
- **根因分析**：异常行打开模态框，真实 AI 流式多轮对话；MCP 由平台智能体执行，扩展不集成 MCP SDK。
- 设置页：默认 `modelId`、`mcpServerIds`（扩展仅存配置，不直连 ERP）。
- 种子数据对齐 PRD §九 演示样例。

## Non-goals

- 修改 `packages/client` 或 `AppEmbeddedChatProvider`。
- 复用或扩展 `extensions/erp-healthy` 代码与数据模型。
- 定时巡检、修复审批流、多 ERP 适配器（V1.2+）。
- 扩展内实现 MCP 协议或 ERP 直连。
- 应用中心 `/apps/*` 入口（本变更以 `/extension/ehcs-ai` 为唯一入口）。

## Capabilities

### New Capabilities

- `ehcs-ai-extension-scaffold`: 扩展脚手架、路由、布局、注册与开发构建。
- `ehcs-ai-data-model`: 实体、迁移、种子与 PRD 字段映射。
- `ehcs-ai-rules-api`: 规则 CRUD、启用/禁用、校验。
- `ehcs-ai-anomalies-api`: 异常列表、筛选、状态与健康分聚合。
- `ehcs-ai-check-run`: 批量检查运行、按规则 ingest、JSON 解析与降级。
- `ehcs-ai-platform-chat`: 扩展内流式对话（检查 + 根因），透传 MCP 配置。
- `ehcs-ai-dashboard-ui`: 驾驶舱、规则页、异常页，对齐 UI 原型。
- `ehcs-ai-rca-modal`: 根因分析模态框与流式会话。
- `ehcs-ai-settings`: 模型与 MCP 服务器 ID 配置。

### Modified Capabilities

<!-- 无既有 openspec/spec；不修改其他 change 的 spec -->

## Impact

- **新增**：`extensions/ehcs-ai/`（API + web + migrations）。
- **平台只读依赖**：`POST /api/ai-chat`（SSE）、模型/MCP 列表类 Web API（用于设置页）。
- **数据库**：新 schema `ehcs_ai`。
- **文档**：`docs/PRD-ehcs-ai.md`、`docs/UI-EHCS-AI.html` 为需求与 UI 参考。
- **配置**：需在 `extensions.json` 启用 `ehcs-ai` 应用。
