## Why

已规划 20 个企业管理 AI 自治应用（`docs/enterprise-ai-apps-registry.json` + 40 份 PRD/DB），产品形态与已实现的 `extensions/ehcs-ai` 一致：四页 UI、规则驱动全量检查、平台智能体 + 内置 MCP + ERP MCP、规则/异常落库。当前仅有文档，缺少可安装的扩展、平台智能体、以及每应用 **不少于 30 条** 的领域规则种子与演示异常数据。

## Why now

- EHCS-AI V1.1 已在 `extensions/ehcs-ai` 验证脚手架、Agent 绑定、规则目录 Seeder（35 条）、MCP 工具编排。
- 20 套 PRD/DB（`docs/PRD-*.md`、`docs/DB-*.md`）已对齐表前缀、健康分、MCP 工具名。
- 批量复制 + 参数化种子可避免 20 次手工搭扩展，并保证智能体与规则库开箱可用。

## What Changes

- 新增 **20 个应用扩展**（`inv-opt-ai` … `esg-report-ai`），自 `ehcs-ai` 模板生成：独立 schema、表前缀、`{prefix}-mcp` 六工具、Console API、Web 四页。
- 每个扩展 **创建/更新平台智能体**（设置页「创建/更新 {AgentName}」），角色提示词/开场白/建议问题/domain 规则与 PRD 一致。
- 每个扩展 **规则目录种子**：`{RULE_PREFIX}_001` … **≥30 条**，`enabled=false` 默认，内容贴合该应用业务域（非 EHCS 财务/供应链通用条复制）。
- 每个扩展 **演示数据种子**：空库时写入 ≥2 条示例异常（对齐 PRD §九）；可选 3–5 条 `enabled=true` 规则便于演示全量检查。
- 更新 `extensions/extensions.json`、`web-menu` 种子（或文档说明 `extension:sync` 步骤）；注册表 `seedRuleCount` 统一 **≥30**。
- 提供 **生成/维护脚本**（基于 `docs/enterprise-ai-apps-registry.json`）用于后续重命名或补规则。

## Non-goals

- 20 个扩展 **全部一次性上线生产**（可先 P0 试点 `inv-opt-ai`、`mdm-quality-ai`、`proc-audit-ai`）。
- 修改 `packages/client` 主站聊天或 EHCS 既有行为。
- 定时巡检、修复审批流、真实 ERP 写回生产策略（留 V1.1）。
- 为每个应用单独写 OpenSpec 归档 change（本 change 用批量 capability 描述）。

## Capabilities

### New Capabilities

- `enterprise-ai-apps-registry`: `extensions.json`、菜单项、registry 与 PRD/DB 路径一致性；`seedRuleCount ≥ 30`。
- `enterprise-ai-apps-extension-scaffold`: 从 `ehcs-ai` 参数化复制扩展（API/Web/实体/MCP/路由），20 个 `appId`。
- `enterprise-ai-apps-platform-agent`: 每应用 `{acronym}-platform-agent.config.ts` + `PlatformAgentSeeder` + 设置页绑定。
- `enterprise-ai-apps-rules-catalog`: 每应用 `*-check-rules-catalog.ts` + Seeder，**≥30 条** 领域规则，`pnpm --filter <app> seed:rules`。
- `enterprise-ai-apps-demo-seed`: 每应用演示异常 + 可选启用规则子集；`AiDataSeeder` 空库幂等。

### Modified Capabilities

<!-- 无既有 openspec/spec 需求变更；EHCS 保持独立 -->

## Impact

- **新增**：`extensions/{appId}/` × 20（体积大，建议 git 分批提交或生成脚本 + CI 校验）。
- **脚本**：`scripts/enterprise-ai-apps/`（scaffold、规则生成、校验 ≥30 条）。
- **文档**：同步 `docs/PRD-*.md` / `docs/DB-*.md` 中种子条数为 ≥30；各扩展 README。
- **数据库**：20 个 PostgreSQL schema（`inv_opt_ai` 等），与 `ehcs_ai` 隔离。
- **平台**：20 个 `ai_agents` 记录 + 20 组 MCP 工具元数据（更新智能体时同步）。
- **依赖**：`pnpm extension:sync`、至少一个 LLM 模型与一个 ERP MCP（与 EHCS 相同）。
