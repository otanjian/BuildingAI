## Context

- **参考实现**：[`extensions/ehcs-ai`](../../../extensions/ehcs-ai) — 实体 6 表、`EhcsPlatformAgentSeeder`、`EhcsCheckRulesCatalogSeeder`（35 条）、内置 Streamable HTTP MCP、`ehcs-platform-agent.config.ts`。
- **规格来源**：[`docs/enterprise-ai-apps-registry.json`](../../../docs/enterprise-ai-apps-registry.json) + `docs/PRD-{SLUG}.md` / `docs/DB-{SLUG}.md`（20 套）。
- **约束**：代码英文；表名 `{prefix}check_*`；MCP 工具 `{mcp_prefix}_start_full_check` 等；不修改 EHCS 扩展行为。

## Goals / Non-Goals

**Goals:**

- 参数化生成 20 个可 `pnpm --filter <appId> build` 的扩展。
- 每应用安装/启用后：设置页可 **创建/更新** 专属智能体；规则表 **≥30 条** 目录种子；空库有演示异常。
- 规则内容 **按领域编写**（库存 SS/ROP/EOQ、采购三单匹配、AR 账龄等），非纯字符串替换 EHCS 规则。
- 提供 `seed:rules` / `seed:agent` 脚本与 CI 校验「每 catalog ≥30 条」。

**Non-Goals:**

- 单 PR 内完成全部 20 个扩展的 UI 定制（先功能等价 EHCS，文案由 PRD 已覆盖）。
- 共享 npm 包抽取（V2 再考虑 `@buildingai/enterprise-ai-core`）。

## Decisions

### D1: 复制策略 — 模板脚本 + 注册表驱动

**选择**：`scripts/enterprise-ai-apps/scaffold-from-ehcs.mjs` 读取 registry，对 `ehcs-ai` 做标识符替换（目录名、schema、表前缀、MCP 名、路由、manifest），输出 `extensions/{appId}/`。

**理由**：EHCS 已与 PRD 对齐，手工 fork 20 次易漏替换。

**备选**：单一 monorepo 扩展内 20 个 schema — 拒绝（与现有扩展隔离、菜单/应用中心模型不符）。

### D2: 智能体 — 每应用独立 config + Seeder

**选择**：`src/api/db/seed-data/{mcp_prefix}-platform-agent.config.ts` 含 `AGENT_NAME`、`ROLE_PROMPT`（引用该应用 `{TRIGGER_PHRASE}`、`{TABLE_PREFIX}`、`{mcp_prefix}_*` 工具）、`OPENING`、`SUGGESTED_QUESTIONS`；`PlatformAgentSeeder` 复制 EHCS 逻辑，写 `{prefix}-app_settings.agent_id` 并 `enableSite` + `accessToken`。

**理由**：与 EHCS 设置页「更新智能体」一致；20 个智能体便于按域调 MCP/模型。

### D3: 规则种子 — TypeScript 常量数组 + 领域提纲

**选择**：每应用 `*-check-rules-catalog.ts` 导出 `CheckRuleCatalogEntry[]`，长度 **≥30**；`CheckRulesCatalogSeeder` 与 EHCS 相同（目录不齐或 hash 过期则 upsert）；默认 `enabled: false`。

**生成方式**：

1. **手工核心 10–15 条/应用**（产品经理/领域提纲，写入 registry 侧 `rulesOutline` 或独立 YAML）。
2. **脚本扩写至 30+**：按 `businessDomains` × 数据项模板生成变体（编码、必填、金额、审批、时效等），保证 `rule_id` 唯一、`rule_description` 自然语言不重复。

**校验**：`node scripts/enterprise-ai-apps/validate-catalogs.mjs` 失败则 CI 红。

**备选**：仅 8 条附录规则 — 拒绝（用户要求 ≥30）。

### D4: 演示异常 — 每应用 2+ 条 + 可选启用规则

**选择**：`AiDataSeeder` 在 `{prefix}-check_results` 为空时插入 PRD §九 风格 2 条；另在 catalog 中将 `*_001`、`*_003`、`*_007` 等 **3 条** 标 `enabled: true`（仅演示环境，生产 Seeder 仍默认 false 可由 env 控制）。

### D5: 分批交付

| 批次 | appIds | 说明 |
|------|--------|------|
| P0 | `inv-opt-ai`, `mdm-quality-ai`, `proc-audit-ai` | 验证脚本与 Agent/规则质量 |
| B1 | `otif-ai`, `channel-inv-ai` | 供应链 |
| B2 | `ar-risk-ai`, `ap-opt-ai`, `asset-life-ai`, `tax-compliance-ai`, `budget-control-ai`, `fx-risk-ai` | 财务 |
| B3 | `mfg-var-ai`, `forecast-ai`, `quality-rca-ai`, `energy-carbon-ai` | 制造/质量/能源 |
| B4 | 其余 5 个 | HR/项目/合同/SLA/ESG |

### D6: 扩展列（V1.1 占位）

仅 `inv-opt-ai`、`forecast-ai`、`quality-rca-ai` 在实体 `CheckResult` 增加 PRD/DB 已列扩展字段；本 change V1.0 可先不加列，仅 catalog + agent。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 20 扩展导致 repo 体积与 review 成本高 | 生成脚本 + 分批 PR；generated 文件头注释 |
| 规则 30 条质量参差（模板化重复） | 每域至少 10 条手写；校验 description 唯一性 |
| 20 个智能体 MCP 绑定遗漏 | Seeder 优先 `erpnext`/`erp` 命名 MCP；设置页文档 |
| 与 EHCS 工具名冲突 | MCP 前缀必须 per-app（`inv_opt_*`） |
| `extension:sync` 菜单爆炸 | 应用中心分组或默认 disabled，按批 enable |

## Migration Plan

1. 合并 scaffold 脚本与 registry（`seedRuleCount` 全部改为 30）。
2. P0 三应用：本地 `extension:sync` → 设置页创建智能体 → `seed:rules` → 验证 ≥30 条 → 演示 ingest。
3. 按批次追加扩展；每批 `openspec validate` + catalog 校验。
4. 回滚：禁用 `extensions.json` 条目；schema 隔离不影响 `ehcs_ai`。

## Open Questions

- 是否在应用中心默认 **全部 disabled**，由运维按许可启用？（建议：仅 P0 默认 enabled。）
- 规则 30 条是否需中英文双语 description？（建议：V1.0 中文描述，与 EHCS 一致。）
